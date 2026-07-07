// src/components/ops/FinanceActionChips.tsx
// Stage 2 — finance action items on the Ops Cockpit (revenue perspective).
// Surfaces "drafts awaiting approval" and "overdue receivables" as action
// chips that deep-link into Operations → Finance. Renders nothing when
// there is nothing to act on.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileClock, AlertTriangle, ArrowRight } from 'lucide-react';
import { useReceivables } from '@/hooks/queries/useFinanceQueries';

interface FinanceActionChipsProps {
  colors: any;
}

const formatINR = (value: number): string => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  } catch {
    return `₹${Number(value || 0).toLocaleString('en-IN')}`;
  }
};

const FinanceActionChips: React.FC<FinanceActionChipsProps> = ({ colors }) => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useReceivables();

  if (isLoading || isError || !data?.summary) return null;

  const { draft_count, draft_total, overdue_count, overdue_total } = data.summary;
  if (!draft_count && !overdue_count) return null;

  return (
    <div
      className="rounded-xl border shadow-sm p-3 flex flex-wrap items-center gap-2"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: colors.utility.primaryText + '15',
      }}
    >
      <span
        className="text-[10px] font-bold uppercase tracking-wider mr-1"
        style={{ color: colors.utility.secondaryText }}
      >
        Finance
      </span>

      {draft_count > 0 && (
        <button
          onClick={() => navigate('/ops/finance')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all hover:shadow-sm"
          style={{
            borderColor: colors.semantic.warning + '50',
            backgroundColor: colors.semantic.warning + '10',
            color: colors.semantic.warning,
          }}
        >
          <FileClock className="w-3.5 h-3.5" />
          {draft_count} draft invoice{draft_count === 1 ? '' : 's'} awaiting approval · {formatINR(draft_total)}
        </button>
      )}

      {overdue_count > 0 && (
        <button
          onClick={() => navigate('/ops/finance')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all hover:shadow-sm"
          style={{
            borderColor: colors.semantic.error + '50',
            backgroundColor: colors.semantic.error + '10',
            color: colors.semantic.error,
          }}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          {formatINR(overdue_total)} overdue across {overdue_count} invoice{overdue_count === 1 ? '' : 's'}
        </button>
      )}

      <button
        onClick={() => navigate('/ops/finance')}
        className="ml-auto inline-flex items-center gap-1 text-xs font-semibold"
        style={{ color: colors.brand.primary }}
      >
        Open Finance <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default FinanceActionChips;
