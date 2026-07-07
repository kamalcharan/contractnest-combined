// src/pages/onboarding/steps/IndustrySelectionStep.tsx
// Screen 6 — Industry Selection.
// Inside OnboardingLayout (progress header visible). Own floating action island.
// Shows industry catalog with parent→child drill-in. Multi-select.
// Pre-populates from already-saved served industries.
// On Continue: saves via addIndustries() + navigates to /onboarding/vani-consent.

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { useIndustries } from '@/hooks/queries/useProductMasterdata';
import { useServedIndustries, useServedIndustriesManager } from '@/hooks/queries/useServedIndustries';
import { vaniToast } from '@/components/common/toast';
import * as LucideIcons from 'lucide-react';
import { Loader2, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';

const IndustrySelectionStep: React.FC = () => {
  const navigate = useNavigate();
  const { setTheme, currentTheme } = useTheme();
  const { user, currentTenant } = useAuth();
  const { formData, fetchProfile } = useTenantProfile({ isOnboarding: true });
  const colors = currentTheme.colors;

  // Industry catalog
  const { data: industriesResponse, isLoading: catalogLoading } = useIndustries();
  const allIndustries = industriesResponse?.data || [];

  // Use useServedIndustries directly to access isSuccess — the manager only exposes isLoading
  // which is false when the query is disabled (tenant not loaded yet), causing premature hydration.
  // isSuccess is only true after a real successful server response.
  // TanStack Query deduplicates: the manager's internal useServedIndustries call shares this cache.
  const { data: servedData, isSuccess: servedSuccess, isLoading: servedLoading } = useServedIndustries();
  const servedIndustries = servedData?.data || [];

  // Manager provides guarded addIndustries with race-condition protection
  const { isAdding, addIndustries } = useServedIndustriesManager();

  // Local UI state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drillParentId, setDrillParentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [vaniVisible, setVaniVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTheme('vani');
    fetchProfile();
  }, []);

  // Pre-populate from already-saved served industries.
  // Guard on currentTenant?.id: useServedIndustries is enabled only when tenant is loaded.
  // Guard on servedSuccess: isSuccess is only true after a real server response.
  // Using !servedLoading alone is insufficient — isLoading is false when the query is
  // disabled (tenant null at mount), so hydration would fire with empty data too early.
  useEffect(() => {
    if (!currentTenant?.id) return;  // query not enabled yet — wait
    if (!servedSuccess) return;       // no real response yet — wait
    if (hydrated) return;             // already initialized

    setHydrated(true);
    if (servedIndustries.length > 0) {
      setSelectedIds(new Set(servedIndustries.map(si => si.industry_id)));
      setVaniVisible(true);
    }
  }, [currentTenant?.id, servedSuccess, servedIndustries, hydrated]);

  // Hierarchy helpers
  const hasHierarchy = useMemo(
    () => allIndustries.some(i => i.level !== undefined && i.level !== null),
    [allIndustries]
  );

  const parentIndustries = useMemo(
    () => hasHierarchy ? allIndustries.filter(i => i.level === 0) : allIndustries,
    [allIndustries, hasHierarchy]
  );

  const getChildren = (parentId: string) =>
    allIndustries.filter(i => i.parent_id === parentId);

  const drillParent = parentIndustries.find(p => p.id === drillParentId);
  const showingChildren = hasHierarchy && drillParentId !== null;
  const childrenOfDrill = drillParentId ? getChildren(drillParentId) : [];

  // Current visible list (before search)
  const currentList = showingChildren ? childrenOfDrill : parentIndustries;

  // Filtered list (after search)
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return currentList;
    const lower = searchTerm.toLowerCase();
    return currentList.filter(
      i =>
        i.name.toLowerCase().includes(lower) ||
        (i.description && i.description.toLowerCase().includes(lower))
    );
  }, [currentList, searchTerm]);

  const handleCardClick = (industryId: string) => {
    const children = getChildren(industryId);
    if (!showingChildren && hasHierarchy && children.length > 0) {
      // Drill into children
      setDrillParentId(industryId);
      setSearchTerm('');
    } else {
      // Toggle selection
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(industryId)) {
          next.delete(industryId);
        } else {
          next.add(industryId);
          if (!vaniVisible) setTimeout(() => setVaniVisible(true), 120);
        }
        return next;
      });
    }
  };

  const handleBack = () => {
    setDrillParentId(null);
    setSearchTerm('');
  };

  const handleContinue = async () => {
    if (selectedIds.size === 0 || isSaving) return;
    setIsSaving(true);
    try {
      await addIndustries(Array.from(selectedIds));
      navigate('/onboarding/resource-pick');
    } catch (err: any) {
      vaniToast.error(err?.message || 'Failed to save industries — please try again');
    } finally {
      setIsSaving(false);
    }
  };

  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return LucideIcons.Briefcase;
    return (LucideIcons as any)[iconName] || LucideIcons.Briefcase;
  };

  const firstName = user?.first_name && user.first_name.trim() ? user.first_name.trim() : null;
  const businessName = formData.business_name?.trim() || currentTenant?.name || null;

  // Show spinner until: catalog loaded, served industries fetched (or confirmed empty), hydrated
  const isLoading = catalogLoading || servedLoading || (!hydrated && !!currentTenant?.id);
  const selectedCount = selectedIds.size;

  // Count how many sub-items are selected under a parent
  const selectedChildCount = (parentId: string) => {
    const children = getChildren(parentId);
    return children.filter(c => selectedIds.has(c.id)).length;
  };

  // ── sub-components ──

  const VaniBubble = ({ msg }: { msg: string }) => (
    <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
      <div
        style={{
          width: 36, height: 36, flexShrink: 0,
          background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.alternate})`,
          borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 14, color: '#fff',
          boxShadow: `0 3px 8px ${colors.brand.primary}40`,
          marginTop: 2,
        }}
      >
        V
      </div>
      <div
        style={{
          background: colors.utility.secondaryBackground,
          border: `1px solid ${colors.utility.primaryText}14`,
          borderRadius: '3px 14px 14px 14px',
          padding: '14px 18px',
          boxShadow: `0 2px 12px ${colors.utility.primaryText}08`,
          fontSize: 14,
          color: colors.utility.secondaryText,
          lineHeight: 1.6,
          maxWidth: 540,
        }}
        dangerouslySetInnerHTML={{ __html: msg }}
      />
    </div>
  );

  const IndustryCard = ({ industry }: { industry: typeof allIndustries[0] }) => {
    const isSelected = selectedIds.has(industry.id);
    const children = getChildren(industry.id);
    const isDrillable = !showingChildren && hasHierarchy && children.length > 0;
    const childSelectedCount = isDrillable ? selectedChildCount(industry.id) : 0;
    const IconComp = getIconComponent(industry.icon);

    return (
      <div
        onClick={() => handleCardClick(industry.id)}
        style={{
          background: colors.utility.secondaryBackground,
          border: `2px solid ${isSelected
            ? colors.brand.primary
            : childSelectedCount > 0
              ? `${colors.brand.primary}50`
              : `${colors.utility.primaryText}18`}`,
          borderRadius: 14,
          padding: '16px 14px',
          cursor: 'pointer',
          transition: 'all .2s cubic-bezier(.22,1,.36,1)',
          position: 'relative',
          boxShadow: isSelected
            ? `0 0 0 3px ${colors.brand.primary}14, 0 4px 20px ${colors.utility.primaryText}08`
            : childSelectedCount > 0
              ? `0 0 0 2px ${colors.brand.primary}10`
              : 'none',
          backgroundColor: isSelected
            ? `${colors.brand.primary}06`
            : childSelectedCount > 0
              ? `${colors.brand.primary}03`
              : colors.utility.secondaryBackground,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minHeight: 110,
        }}
        onMouseEnter={e => {
          if (!isSelected) {
            (e.currentTarget as HTMLDivElement).style.borderColor = `${colors.brand.primary}50`;
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 16px ${colors.utility.primaryText}0a`;
          }
        }}
        onMouseLeave={e => {
          if (!isSelected) {
            (e.currentTarget as HTMLDivElement).style.borderColor = childSelectedCount > 0
              ? `${colors.brand.primary}50`
              : `${colors.utility.primaryText}18`;
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = childSelectedCount > 0
              ? `0 0 0 2px ${colors.brand.primary}10`
              : 'none';
          }
        }}
      >
        {/* Check mark (only on leaf/selectable cards) */}
        {!isDrillable && (
          <div
            style={{
              position: 'absolute', top: 10, right: 10,
              width: 20, height: 20, borderRadius: '50%',
              background: colors.brand.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: '#fff',
              opacity: isSelected ? 1 : 0,
              transform: isSelected ? 'scale(1)' : 'scale(.5)',
              transition: 'all .25s cubic-bezier(.34,1.56,.64,1)',
            }}
          >
            ✓
          </div>
        )}

        {/* Sub-selection badge on drillable cards */}
        {isDrillable && childSelectedCount > 0 && (
          <div
            style={{
              position: 'absolute', top: 10, right: 10,
              background: colors.brand.primary,
              color: '#fff',
              borderRadius: 100,
              padding: '2px 8px',
              fontSize: 10, fontWeight: 800,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {childSelectedCount}
          </div>
        )}

        {/* Icon */}
        <div
          style={{
            width: 36, height: 36, borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isSelected ? `${colors.brand.primary}12` : `${colors.utility.primaryText}08`,
            border: `1px solid ${isSelected ? `${colors.brand.primary}25` : `${colors.utility.primaryText}10`}`,
            transition: 'all .2s',
            flexShrink: 0,
          }}
        >
          <IconComp
            size={18}
            style={{ color: isSelected ? colors.brand.primary : colors.utility.secondaryText }}
          />
        </div>

        {/* Name + drill hint */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 12, fontWeight: 700, letterSpacing: '-0.1px',
              color: isSelected ? colors.brand.primary : colors.utility.primaryText,
              lineHeight: 1.35,
              marginBottom: isDrillable ? 4 : 0,
              transition: 'color .2s',
              paddingRight: isDrillable ? 0 : 20,
            }}
          >
            {industry.name}
          </div>
          {isDrillable && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 10, fontWeight: 600,
                color: `${colors.utility.secondaryText}90`,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              <span>{children.length} specializations</span>
              <ChevronRight size={10} />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Page */}
      <div
        style={{
          flex: 1,
          backgroundColor: colors.utility.primaryBackground,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '48px 24px 140px',
          fontFamily: "'Outfit', sans-serif",
          minHeight: '100%',
        }}
      >
        <div style={{ width: '100%', maxWidth: 780 }}>

          {/* Eyebrow */}
          <div
            style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: 1, color: colors.brand.primary,
              fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10,
            }}
          >
            Step 6 of 9
          </div>

          <h2
            style={{
              fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px',
              color: colors.utility.primaryText, marginBottom: 6,
            }}
          >
            Which industries do you serve? <span style={{ color: colors.semantic.error }}>*</span>
          </h2>
          <p
            style={{
              fontSize: 14, color: colors.utility.secondaryText,
              marginBottom: 32, lineHeight: 1.55,
            }}
          >
            VaNi will unlock matching contract templates, SLA clauses, and compliance defaults for your chosen industries.
          </p>

          {/* VaNi intro bubble */}
          <VaniBubble
            msg={
              firstName && businessName
                ? `Hi <strong>${firstName}</strong>! Let's set up the industry profile for <strong>${businessName}</strong>. Pick the sectors that match your work — VaNi will unlock contract templates and SLA defaults for each one.`
                : businessName
                  ? `Let's set up the industry profile for <strong>${businessName}</strong>. Pick the sectors that match your work — VaNi will unlock contract templates and SLA defaults for each one.`
                  : `Pick the industries that match your work — you can always add more later. If an industry has specializations, tap it to explore them.`
            }
          />

          {isLoading ? (
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '60px 0', color: colors.utility.secondaryText, gap: 10,
              }}
            >
              <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 14 }}>Loading industries…</span>
            </div>
          ) : (
            <>
              {/* Breadcrumb / drill header */}
              {showingChildren && drillParent && (
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    marginBottom: 18,
                  }}
                >
                  <button
                    type="button"
                    onClick={handleBack}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 100,
                      border: `1px solid ${colors.utility.primaryText}20`,
                      background: colors.utility.secondaryBackground,
                      color: colors.utility.secondaryText,
                      fontSize: 12, fontWeight: 700,
                      fontFamily: "'Outfit', sans-serif",
                      cursor: 'pointer', transition: 'all .15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = `${colors.brand.primary}50`;
                      (e.currentTarget as HTMLButtonElement).style.color = colors.brand.primary;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = `${colors.utility.primaryText}20`;
                      (e.currentTarget as HTMLButtonElement).style.color = colors.utility.secondaryText;
                    }}
                  >
                    <ChevronLeft size={13} /> All industries
                  </button>
                  <span
                    style={{
                      fontSize: 13, fontWeight: 700,
                      color: colors.utility.primaryText,
                    }}
                  >
                    {drillParent.name}
                  </span>
                </div>
              )}

              {/* Search bar */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: colors.utility.secondaryBackground,
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  marginBottom: 20,
                }}
              >
                <Search size={15} style={{ color: `${colors.utility.primaryText}50`, flexShrink: 0 }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={showingChildren
                    ? `Search ${drillParent?.name || ''} specializations…`
                    : 'Search industries…'
                  }
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    fontSize: 13, color: colors.utility.primaryText,
                    fontFamily: "'Outfit', sans-serif",
                  }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: `${colors.utility.primaryText}50`, display: 'flex',
                      padding: 0,
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Industry grid */}
              {filteredList.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center', padding: '40px 0',
                    color: colors.utility.secondaryText, fontSize: 13,
                  }}
                >
                  No industries match "{searchTerm}"
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  {filteredList.map(industry => (
                    <IndustryCard key={industry.id} industry={industry} />
                  ))}
                </div>
              )}

              {/* VaNi reaction bubble — slides up after first selection */}
              {selectedCount > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    opacity: vaniVisible ? 1 : 0,
                    transform: vaniVisible ? 'translateY(0)' : 'translateY(8px)',
                    transition: 'all .4s cubic-bezier(.22,1,.36,1)',
                  }}
                >
                  <VaniBubble
                    msg={selectedCount === 1
                      ? `<strong>1 industry selected.</strong> VaNi will unlock matching templates and SLA defaults. Add more if you serve multiple sectors.`
                      : `<strong>${selectedCount} industries selected.</strong> Excellent coverage — VaNi will configure templates and defaults for all of them.`
                    }
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Floating action island */}
      <div
        style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          background: `${colors.accent.accent1}f0`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '10px 10px 10px 24px',
          borderRadius: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 20px 50px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.06)',
          zIndex: 200,
          whiteSpace: 'nowrap',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.65)' }}>
          {selectedCount > 0
            ? `${selectedCount} ${selectedCount === 1 ? 'industry' : 'industries'} selected`
            : 'Select industries you serve'
          }
        </span>

        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />

        {/* Back */}
        <button
          type="button"
          onClick={() => navigate('/onboarding/theme-selection')}
          style={{
            padding: '10px 20px', borderRadius: 100, border: 'none',
            background: 'rgba(255,255,255,.08)',
            color: 'rgba(255,255,255,.6)',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: 'pointer', transition: 'all .2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.14)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.85)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.08)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.6)';
          }}
        >
          ← Back
        </button>

        {/* Continue */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={selectedCount === 0 || isSaving || isAdding}
          style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
            background: selectedCount === 0
              ? 'rgba(255,255,255,.15)'
              : colors.utility.secondaryBackground,
            color: selectedCount === 0
              ? 'rgba(255,255,255,.3)'
              : colors.utility.primaryText,
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: selectedCount === 0 || isSaving || isAdding ? 'not-allowed' : 'pointer',
            transition: 'all .2s',
            opacity: isSaving || isAdding ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          onMouseEnter={e => {
            if (selectedCount > 0 && !isSaving && !isAdding) {
              (e.currentTarget as HTMLButtonElement).style.background = '#f0ece6';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = selectedCount > 0
              ? colors.utility.secondaryBackground : 'rgba(255,255,255,.15)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          {(isSaving || isAdding) && (
            <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
          )}
          Continue →
        </button>
      </div>
    </>
  );
};

export default IndustrySelectionStep;
