// ============================================================================
// ChairCheckinPage — chair-side Group Session check-in admin (Batch 3)
// ============================================================================
// Two jobs: (1) mint / show the static check-in link (QR) for a session
// contract; (2) confirm the BAU payments members declared at check-in, which
// flips the member's billing event to Paid.

import React, { useEffect, useState } from 'react';
import { CalendarCheck, Copy, Check, Link2, Wallet, X } from 'lucide-react';
import { useChairCheckin } from './useChairCheckin';

const money = (n?: number | null, c = 'INR') =>
  `${c === 'INR' ? '₹' : (c || '') + ' '}${Number(n || 0).toLocaleString()}`;
const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const ChairCheckinPage: React.FC = () => {
  const { declarations, loading, busyId, error, fetchDeclarations, ensureToken, confirm } = useChairCheckin();
  const [contractId, setContractId] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetchDeclarations(); }, [fetchDeclarations]);

  const generate = async () => {
    if (!contractId.trim()) return;
    setMinting(true);
    const token = await ensureToken(contractId.trim());
    setMinting(false);
    if (token) setLink(`${window.location.origin}/checkin/${token}`);
  };

  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <CalendarCheck className="w-6 h-6 text-orange-600" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Session Check-in</h1>
      </div>

      {/* Check-in link generator */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Check-in link (QR)</h2>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Paste the Group Session contract ID to get its permanent check-in link. Turn it into a QR poster —
          members scan the same code every session.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={contractId} onChange={(e) => setContractId(e.target.value)}
            placeholder="Session contract ID"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
          />
          <button onClick={generate} disabled={minting || !contractId.trim()}
            className="px-4 py-2 rounded-lg bg-orange-600 text-white font-semibold text-sm disabled:opacity-50">
            {minting ? 'Generating…' : 'Get link'}
          </button>
        </div>
        {link && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <code className="flex-1 text-xs break-all text-gray-700 dark:text-gray-300">{link}</code>
            <button onClick={copy} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" title="Copy link">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
            </button>
          </div>
        )}
      </div>

      {/* Pending payment declarations */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Payments to confirm</h2>
          <span className="ml-auto text-xs text-gray-500">{declarations.length} pending</span>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Members declared these UPI payments at check-in. Confirm once you've verified the money in the chapter account —
          this marks their due as Paid.
        </p>

        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {!loading && declarations.length === 0 && (
          <p className="text-sm text-gray-500">Nothing pending. 🎉</p>
        )}

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {declarations.map((d) => (
            <div key={d.id} className="py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{d.member_name || 'Member'}</div>
                <div className="text-xs text-gray-500">
                  {d.label || 'Due'} · {fmtDate(d.due_date)}
                  {d.upi_reference ? <> · UPI <span className="font-mono">{d.upi_reference}</span></> : ' · no reference'}
                </div>
              </div>
              <div className="font-bold text-gray-900 dark:text-gray-100">{money(d.amount, d.currency || 'INR')}</div>
              <button onClick={() => confirm(d.id, true)} disabled={busyId === d.id}
                className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Confirm
              </button>
              <button onClick={() => confirm(d.id, false)} disabled={busyId === d.id}
                className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 text-xs disabled:opacity-50"
                title="Reject">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChairCheckinPage;
