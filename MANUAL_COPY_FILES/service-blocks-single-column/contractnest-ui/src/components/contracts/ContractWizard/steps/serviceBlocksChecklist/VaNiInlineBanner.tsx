// src/components/contracts/ContractWizard/steps/serviceBlocksChecklist/VaNiInlineBanner.tsx
// Mock 9 — VaNi inline banner. Suggests the tenant's own blocks for the
// contract's assets (same heuristic as the recommender drawer) with one
// "Add all N" action; dismissible with "I'll pick myself".

import React from 'react';
import { Block } from '@/types/catalogStudio';

interface VaNiInlineBannerProps {
  colors: any;
  suggestions: Block[];
  assetNames: string[];
  onAddAll: (blocks: Block[]) => void;
  onDismiss: () => void;
}

const VANI = '#7c3aed';

const VaNiInlineBanner: React.FC<VaNiInlineBannerProps> = ({
  colors,
  suggestions,
  assetNames,
  onAddAll,
  onDismiss,
}) => {
  if (suggestions.length === 0) return null;
  const names = suggestions.slice(0, 3).map((b) => b.name).join(', ');
  const more = suggestions.length > 3 ? ` +${suggestions.length - 3} more` : '';
  const ctx = assetNames.filter(Boolean).join(' + ');

  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-4 py-3 mt-4"
      style={{ backgroundColor: `${VANI}0d`, borderColor: `${VANI}30` }}
    >
      <div
        className="w-[34px] h-[34px] rounded-full flex items-center justify-center font-extrabold text-[13px] text-white flex-shrink-0"
        style={{ backgroundColor: VANI }}
      >
        V
      </div>
      <div className="flex-1 text-[13px]" style={{ color: colors.utility.primaryText }}>
        <b style={{ color: VANI }}>VaNi suggests {suggestions.length} block{suggestions.length === 1 ? '' : 's'}</b>
        {ctx ? ` for ${ctx}` : ''}: {names}{more}. Suggestions are a head start — your <b>entire catalog</b> stays
        browsable and searchable below.
      </div>
      <button
        type="button"
        onClick={() => onAddAll(suggestions)}
        className="rounded-lg px-3.5 py-2 text-[12.5px] font-bold text-white flex-shrink-0 transition hover:opacity-90"
        style={{ backgroundColor: VANI }}
      >
        Add all {suggestions.length}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="text-[12.5px] font-bold flex-shrink-0 px-2 py-2"
        style={{ color: colors.utility.secondaryText }}
      >
        I'll pick myself
      </button>
    </div>
  );
};

export default VaNiInlineBanner;
