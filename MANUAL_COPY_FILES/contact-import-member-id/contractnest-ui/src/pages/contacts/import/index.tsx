// src/pages/contacts/import/index.tsx
// Import wizard — contacts adapter. Upload (.xlsx/.csv) → map columns →
// preview + validate (incl. category→industry mapping) → batched import via
// POST /api/contacts/import → per-row results report.
// The wizard flow is entity-agnostic; contact-specific logic lives in
// contactsAdapter.ts so future imports can plug in their own adapter.
import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  Loader2,
  Copy,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { vaniToast } from '@/components/common/toast';
import { captureException } from '@/utils/sentry';
import { useMasterDataOptions } from '@/hooks/useMasterData';
import { useIndustries } from '@/hooks/queries/useProductMasterdata';
import { CONTACT_CLASSIFICATION_CONFIG } from '@/utils/constants/contacts';
import {
  parseSpreadsheet,
  suggestMapping,
  extractRows,
  suggestIndustry,
  buildContactPayload,
  chunk,
  TARGET_FIELDS,
  type ParsedSheet,
  type TargetFieldKey,
  type ImportRow,
} from './contactsAdapter';

type WizardStep = 'upload' | 'map' | 'preview' | 'importing' | 'done';

interface RowResult {
  index: number;
  status: 'created' | 'duplicate' | 'failed';
  error?: string;
}

const IMPORT_CHUNK_SIZE = 25; // matches the API batch cap

const ContactsImportPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const { currentTenant, isLive } = useAuth();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importAbortRef = useRef(false);

  const [step, setStep] = useState<WizardStep>('upload');
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<TargetFieldKey[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);

  // Batch settings
  const [classifications, setClassifications] = useState<string[]>(['partner']);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Preview state
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, string | null>>({});

  // Import state
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<RowResult[]>([]);

  const { options: tagOptions } = useMasterDataOptions('Tags', {
    valueField: 'SubCatName',
    labelField: 'DisplayName',
    includeInactive: false,
    sortBy: 'Sequence_no',
    sortOrder: 'asc',
  });

  const { data: industriesResponse } = useIndustries();
  const allIndustries = industriesResponse?.data || [];

  // Sub-industries (plus childless parents like "Other Industries") for the
  // category-mapping dropdowns, labelled "Parent > Sub"
  const industryOptions = useMemo(() => {
    const parentIds = new Set(allIndustries.filter((i) => i.parent_id).map((i) => i.parent_id));
    return allIndustries
      .filter((i) => i.level === 1 || (i.level === 0 && !parentIds.has(i.id)))
      .map((i) => {
        const parent = i.parent_id ? allIndustries.find((p) => p.id === i.parent_id) : null;
        return { id: i.id, label: parent ? `${parent.name} > ${i.name}` : i.name };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allIndustries]);

  // ── Upload ─────────────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    setParsing(true);
    setParseError(null);
    try {
      const parsed = await parseSpreadsheet(file);
      if (parsed.rows.length === 0) {
        setParseError('No data rows found in the file.');
        return;
      }
      setFileName(file.name);
      setSheet(parsed);
      setMapping(suggestMapping(parsed.headers));
      setStep('map');
    } catch (err: any) {
      captureException(err, { tags: { component: 'ContactsImportPage', action: 'parse' } });
      setParseError(err?.message || 'Could not read the file. Use .xlsx or .csv.');
    } finally {
      setParsing(false);
    }
  };

  // ── Map → Preview ──────────────────────────────────────────────────────

  const handleToPreview = () => {
    if (!sheet) return;
    if (!mapping.includes('name')) {
      setMapError('Map at least one column to "Name".');
      return;
    }
    if (classifications.length === 0) {
      setMapError('Select at least one classification for the imported contacts.');
      return;
    }
    setMapError(null);

    const extracted = extractRows(sheet, mapping);
    setRows(extracted);

    // Suggest an industry per unique category value — unmatched categories
    // default to the "Other" industry (still adjustable in the mapping UI
    // below) rather than being left unmapped.
    const otherIndustryId = allIndustries.find((i) => i.name.trim().toLowerCase() === 'other')?.id || null;
    const uniqueCategories = Array.from(
      new Set(extracted.map((r) => r.category).filter(Boolean))
    );
    const suggested: Record<string, string | null> = {};
    for (const cat of uniqueCategories) {
      suggested[cat] = suggestIndustry(cat, allIndustries) || otherIndustryId;
    }
    setCategoryMap(suggested);
    setStep('preview');
  };

  const toggleRow = (index: number) => {
    setRows((prev) =>
      prev.map((r) => (r.index === index ? { ...r, include: !r.include } : r))
    );
  };

  // ── Import ─────────────────────────────────────────────────────────────

  const includedRows = rows.filter((r) => r.include && r.errors.length === 0);

  const handleImport = async () => {
    if (!currentTenant?.id || includedRows.length === 0) return;
    importAbortRef.current = false;
    setStep('importing');
    setResults([]);

    const batchSettings = {
      classifications,
      tags: selectedTags.map((tagValue) => {
        const option = tagOptions.find((opt) => opt.value === tagValue);
        return {
          tag_value: tagValue,
          tag_label: option?.label || tagValue,
          tag_color: option?.color || undefined,
        };
      }),
      skipDuplicates,
    };

    const tagCatalog = tagOptions.map((opt) => ({
      value: opt.value,
      label: opt.label,
      color: opt.color || undefined,
    }));
    const payloads = includedRows.map((row) => ({
      row,
      payload: buildContactPayload(row, batchSettings, categoryMap, tagCatalog),
    }));
    const chunks = chunk(payloads, IMPORT_CHUNK_SIZE);
    setProgress({ done: 0, total: payloads.length });

    const collected: RowResult[] = [];
    try {
      for (const batch of chunks) {
        if (importAbortRef.current) break;
        const response = await api.post(
          '/api/contacts/import',
          {
            contacts: batch.map((b) => b.payload),
            skip_duplicates: skipDuplicates,
          },
          {
            headers: {
              'x-tenant-id': currentTenant.id,
              'x-environment': isLive ? 'live' : 'test',
            },
          }
        );
        const batchResults: any[] = response.data?.data?.results || [];
        batchResults.forEach((r) => {
          collected.push({
            index: batch[r.index]?.row.index ?? r.index,
            status: r.status,
            error: r.error,
          });
        });
        setProgress((p) => ({ ...p, done: p.done + batch.length }));
        setResults([...collected]);
      }

      const created = collected.filter((r) => r.status === 'created').length;
      if (created > 0) {
        vaniToast.success('Import Complete', {
          message: `${created} contact${created !== 1 ? 's' : ''} created`,
          duration: 4000,
        });
      } else {
        vaniToast.warning('Import Finished', {
          message: 'No new contacts were created — check the report below.',
          duration: 5000,
        });
      }
    } catch (err: any) {
      captureException(err, { tags: { component: 'ContactsImportPage', action: 'import' } });
      vaniToast.error('Import Interrupted', {
        message:
          err?.response?.data?.error ||
          'The import stopped partway — the report below shows what was processed.',
        duration: 6000,
      });
    } finally {
      setResults([...collected]);
      setStep('done');
    }
  };

  // ── Shared styles ──────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.utility.secondaryBackground,
    borderColor: colors.utility.primaryText + '20',
  };
  const inputStyle: React.CSSProperties = {
    backgroundColor: colors.utility.primaryBackground,
    borderColor: colors.utility.primaryText + '20',
    color: colors.utility.primaryText,
  };

  const rowByIndex = (index: number) => rows.find((r) => r.index === index);

  const stepBadge = (label: string, active: boolean, done: boolean) => (
    <div className="flex items-center gap-2">
      <span
        className="text-xs font-bold px-3 py-1.5 rounded-full"
        style={{
          backgroundColor: active
            ? colors.brand.primary
            : done
            ? colors.brand.primary + '20'
            : colors.utility.secondaryText + '15',
          color: active ? '#fff' : done ? colors.brand.primary : colors.utility.secondaryText,
        }}
      >
        {label}
      </span>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/contacts')}
            className="p-2 rounded-lg border transition-colors hover:opacity-80"
            style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.secondaryText }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>
              Import Contacts
            </h1>
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              Bring in contacts from an Excel or CSV file
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stepBadge('1 · Upload', step === 'upload', step !== 'upload')}
          <ChevronRight className="h-3 w-3" style={{ color: colors.utility.secondaryText }} />
          {stepBadge('2 · Map', step === 'map', ['preview', 'importing', 'done'].includes(step))}
          <ChevronRight className="h-3 w-3" style={{ color: colors.utility.secondaryText }} />
          {stepBadge('3 · Review', step === 'preview', ['importing', 'done'].includes(step))}
          <ChevronRight className="h-3 w-3" style={{ color: colors.utility.secondaryText }} />
          {stepBadge('4 · Import', step === 'importing' || step === 'done', false)}
        </div>
      </div>

      {/* ═══ STEP 1: UPLOAD ═══ */}
      {step === 'upload' && (
        <div
          className="rounded-lg border-2 border-dashed p-14 text-center cursor-pointer transition-colors hover:opacity-90"
          style={{ borderColor: colors.brand.primary + '50', backgroundColor: colors.utility.secondaryBackground }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
          {parsing ? (
            <div className="flex flex-col items-center gap-3" style={{ color: colors.utility.secondaryText }}>
              <Loader2 className="h-10 w-10 animate-spin" style={{ color: colors.brand.primary }} />
              Reading file…
            </div>
          ) : (
            <>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: colors.brand.primary + '15', color: colors.brand.primary }}
              >
                <Upload size={30} />
              </div>
              <h3 className="text-lg font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
                Drop your file here, or click to browse
              </h3>
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                Excel (.xlsx) or CSV — first sheet is used, header row is detected automatically
              </p>
              {parseError && (
                <p className="text-sm mt-4 font-medium" style={{ color: colors.semantic.error }}>
                  {parseError}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ STEP 2: MAP COLUMNS + BATCH SETTINGS ═══ */}
      {step === 'map' && sheet && (
        <div className="space-y-6">
          <div className="rounded-lg shadow-sm border p-6" style={cardStyle}>
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet className="h-4 w-4" style={{ color: colors.brand.primary }} />
              <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
                Map Columns
              </h2>
            </div>
            <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
              {fileName} — {sheet.rows.length} rows found. Tell us what each column contains.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: colors.utility.secondaryText }}>
                    <th className="text-left py-2 pr-4 font-semibold">Column</th>
                    <th className="text-left py-2 pr-4 font-semibold">Sample Data</th>
                    <th className="text-left py-2 font-semibold">Import As</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.headers.map((header, ci) => {
                    if (!header && sheet.rows.every((r) => !r[ci])) return null;
                    const samples = sheet.rows
                      .slice(0, 3)
                      .map((r) => r[ci])
                      .filter(Boolean)
                      .join(' · ');
                    return (
                      <tr key={ci} className="border-t" style={{ borderColor: colors.utility.primaryText + '10' }}>
                        <td className="py-2.5 pr-4 font-medium" style={{ color: colors.utility.primaryText }}>
                          {header || <em style={{ color: colors.utility.secondaryText }}>Column {ci + 1}</em>}
                        </td>
                        <td className="py-2.5 pr-4 max-w-xs truncate" style={{ color: colors.utility.secondaryText }}>
                          {samples || '—'}
                        </td>
                        <td className="py-2.5">
                          <select
                            value={mapping[ci]}
                            onChange={(e) => {
                              const next = [...mapping];
                              next[ci] = e.target.value as TargetFieldKey;
                              setMapping(next);
                            }}
                            className="p-2 rounded-md border text-sm focus:outline-none"
                            style={inputStyle}
                          >
                            {TARGET_FIELDS.map((f) => (
                              <option key={f.key} value={f.key}>
                                {f.label}{f.required ? ' *' : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Batch settings */}
          <div className="rounded-lg shadow-sm border p-6 space-y-5" style={cardStyle}>
            <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
              Applied to Every Imported Contact
            </h2>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
                Classification *
              </label>
              <div className="flex flex-wrap gap-2">
                {CONTACT_CLASSIFICATION_CONFIG.map((cls) => {
                  const selected = classifications.includes(cls.id);
                  return (
                    <button
                      key={cls.id}
                      onClick={() =>
                        setClassifications((prev) =>
                          selected ? prev.filter((c) => c !== cls.id) : [...prev, cls.id]
                        )
                      }
                      className="px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all"
                      style={{
                        backgroundColor: selected ? colors.brand.primary + '15' : 'transparent',
                        borderColor: selected ? colors.brand.primary : colors.utility.primaryText + '20',
                        color: selected ? colors.brand.primary : colors.utility.secondaryText,
                      }}
                    >
                      {cls.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
                Tags
                <span className="ml-2 text-xs font-normal" style={{ color: colors.utility.secondaryText }}>
                  (added to every contact — merged with any column mapped to "Tags")
                </span>
              </label>
              {tagOptions.length === 0 ? (
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  No tags configured — manage them in Settings → Configure → List of Values.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tagOptions.map((option) => {
                    const selected = selectedTags.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() =>
                          setSelectedTags((prev) =>
                            selected ? prev.filter((t) => t !== option.value) : [...prev, option.value]
                          )
                        }
                        className="px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-all flex items-center gap-2"
                        style={{
                          backgroundColor: selected
                            ? (option.color ? `${option.color}20` : colors.brand.primary + '15')
                            : 'transparent',
                          borderColor: selected ? (option.color || colors.brand.primary) : colors.utility.primaryText + '20',
                          color: selected ? colors.utility.primaryText : colors.utility.secondaryText,
                        }}
                      >
                        {option.color && (
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: option.color }} />
                        )}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: colors.utility.primaryText }}>
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="h-4 w-4"
              />
              Skip contacts that already exist (matched by phone/email/name)
            </label>
          </div>

          {mapError && (
            <p className="text-sm font-medium" style={{ color: colors.semantic.error }}>{mapError}</p>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => { setStep('upload'); setSheet(null); }}
              className="px-5 py-2.5 rounded-md border text-sm font-medium hover:opacity-80"
              style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.secondaryText }}
            >
              Back
            </button>
            <button
              onClick={handleToPreview}
              className="px-6 py-2.5 rounded-md text-sm font-bold text-white hover:opacity-90"
              style={{ backgroundColor: colors.brand.primary }}
            >
              Review {sheet.rows.length} Rows →
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: PREVIEW ═══ */}
      {step === 'preview' && (
        <div className="space-y-6">
          {/* Category → Industry mapping */}
          {Object.keys(categoryMap).length > 0 && (
            <div className="rounded-lg shadow-sm border p-6" style={cardStyle}>
              <h2 className="text-lg font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
                Category → Industry
              </h2>
              <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
                Each unique category from your file, mapped to a sub-industry. Adjust any suggestion; unmapped categories are kept in the contact's notes.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(categoryMap).map(([category, industryId]) => (
                  <div key={category} className="flex items-center gap-3">
                    <span
                      className="text-sm font-medium truncate flex-1"
                      style={{ color: colors.utility.primaryText }}
                      title={category}
                    >
                      {category}
                    </span>
                    <select
                      value={industryId || ''}
                      onChange={(e) =>
                        setCategoryMap((prev) => ({ ...prev, [category]: e.target.value || null }))
                      }
                      className="p-2 rounded-md border text-sm focus:outline-none flex-1"
                      style={inputStyle}
                    >
                      <option value="">— not mapped —</option>
                      {industryOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rows table */}
          <div className="rounded-lg shadow-sm border" style={cardStyle}>
            <div className="p-6 pb-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
                  Review Rows
                </h2>
                <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  {includedRows.length} of {rows.length} rows will be imported
                  {rows.some((r) => r.errors.length > 0) &&
                    ` — ${rows.filter((r) => r.errors.length > 0).length} rows have problems and are excluded`}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0" style={{ backgroundColor: colors.utility.secondaryBackground }}>
                  <tr style={{ color: colors.utility.secondaryText }}>
                    <th className="text-left py-2 px-4 font-semibold w-8"></th>
                    <th className="text-left py-2 pr-4 font-semibold">Name</th>
                    <th className="text-left py-2 pr-4 font-semibold">Mobile</th>
                    <th className="text-left py-2 pr-4 font-semibold">Email</th>
                    <th className="text-left py-2 pr-4 font-semibold">Business</th>
                    <th className="text-left py-2 pr-4 font-semibold">Designation</th>
                    <th className="text-left py-2 pr-4 font-semibold">Tags</th>
                    <th className="text-left py-2 pr-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.index}
                      className="border-t"
                      style={{
                        borderColor: colors.utility.primaryText + '10',
                        opacity: row.errors.length > 0 || !row.include ? 0.55 : 1,
                      }}
                    >
                      <td className="py-2 px-4">
                        <input
                          type="checkbox"
                          checked={row.include && row.errors.length === 0}
                          disabled={row.errors.length > 0}
                          onChange={() => toggleRow(row.index)}
                        />
                      </td>
                      <td className="py-2 pr-4 font-medium" style={{ color: colors.utility.primaryText }}>{row.name || '—'}</td>
                      <td className="py-2 pr-4" style={{ color: colors.utility.secondaryText }}>{row.mobiles.join(', ') || '—'}</td>
                      <td className="py-2 pr-4 max-w-[180px] truncate" style={{ color: colors.utility.secondaryText }}>{row.email || '—'}</td>
                      <td className="py-2 pr-4 max-w-[180px] truncate" style={{ color: colors.utility.secondaryText }}>{row.companyName || '—'}</td>
                      <td className="py-2 pr-4" style={{ color: colors.utility.secondaryText }}>{row.designation || '—'}</td>
                      <td className="py-2 pr-4 max-w-[160px] truncate" style={{ color: colors.utility.secondaryText }} title={row.tags.join(', ')}>
                        {row.tags.length > 0 ? row.tags.join(', ') : '—'}
                      </td>
                      <td className="py-2 pr-4">
                        {row.errors.length > 0 ? (
                          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: colors.semantic.error }} title={row.errors.join('; ')}>
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {row.errors[0]}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: colors.semantic.success }}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep('map')}
              className="px-5 py-2.5 rounded-md border text-sm font-medium hover:opacity-80"
              style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.secondaryText }}
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={includedRows.length === 0}
              className="px-6 py-2.5 rounded-md text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ backgroundColor: colors.brand.primary }}
            >
              <Users className="h-4 w-4" />
              Import {includedRows.length} Contact{includedRows.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 4: IMPORTING ═══ */}
      {step === 'importing' && (
        <div className="rounded-lg shadow-sm border p-10 text-center" style={cardStyle}>
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4" style={{ color: colors.brand.primary }} />
          <h2 className="text-lg font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
            Importing contacts…
          </h2>
          <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
            {progress.done} of {progress.total} processed — keep this page open
          </p>
          <div className="max-w-md mx-auto h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.utility.primaryText + '10' }}>
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%`,
                backgroundColor: colors.brand.primary,
              }}
            />
          </div>
        </div>
      )}

      {/* ═══ STEP 5: RESULTS ═══ */}
      {step === 'done' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {([
              { label: 'Created', count: results.filter((r) => r.status === 'created').length, color: colors.semantic.success, Icon: CheckCircle2 },
              { label: 'Duplicates Skipped', count: results.filter((r) => r.status === 'duplicate').length, color: colors.semantic.warning, Icon: Copy },
              { label: 'Failed', count: results.filter((r) => r.status === 'failed').length, color: colors.semantic.error, Icon: XCircle },
            ] as const).map(({ label, count, color, Icon }) => (
              <div key={label} className="rounded-lg shadow-sm border p-5 flex items-center gap-4" style={cardStyle}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: color + '15' }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>{count}</div>
                  <div className="text-xs" style={{ color: colors.utility.secondaryText }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {results.some((r) => r.status !== 'created') && (
            <div className="rounded-lg shadow-sm border p-6" style={cardStyle}>
              <h2 className="text-lg font-semibold mb-3" style={{ color: colors.utility.primaryText }}>
                Rows Needing Attention
              </h2>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {results
                  .filter((r) => r.status !== 'created')
                  .map((r) => {
                    const row = rowByIndex(r.index);
                    return (
                      <div
                        key={r.index}
                        className="flex items-center justify-between text-sm p-2.5 rounded-md"
                        style={{ backgroundColor: colors.utility.primaryBackground }}
                      >
                        <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                          {row?.name || `Row ${r.index + 1}`}
                        </span>
                        <span style={{ color: r.status === 'duplicate' ? colors.semantic.warning : colors.semantic.error }}>
                          {r.status === 'duplicate' ? 'Already exists — skipped' : r.error || 'Failed'}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setStep('upload');
                setSheet(null);
                setRows([]);
                setResults([]);
              }}
              className="px-5 py-2.5 rounded-md border text-sm font-medium hover:opacity-80"
              style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.secondaryText }}
            >
              Import Another File
            </button>
            <button
              onClick={() => navigate('/contacts')}
              className="px-6 py-2.5 rounded-md text-sm font-bold text-white hover:opacity-90"
              style={{ backgroundColor: colors.brand.primary }}
            >
              Go to Contacts
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsImportPage;
