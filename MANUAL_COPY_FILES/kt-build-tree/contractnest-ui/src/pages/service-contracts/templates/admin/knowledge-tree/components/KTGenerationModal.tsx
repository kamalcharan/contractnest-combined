// KTGenerationModal — animated overlay shown while LLM generates a Knowledge Tree
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { KTGenerationPhase } from '@/hooks/queries/useKnowledgeTree';

const GENERATING_MESSAGES = [
  'Classifying equipment type...',
  'Researching variants and specifications...',
  'Generating spare parts catalogue...',
  'Building maintenance checkpoints...',
  'Calculating service cycles and frequencies...',
  'Applying context overlays...',
  'Almost there — finalising output...',
];

interface KTGenerationModalProps {
  phase: KTGenerationPhase;
  equipmentName: string;
  errorMessage: string | null;
  onClose: () => void; // only callable when phase === 'error'
  serviceActivityLabel?: string; // e.g. "Breakdown / Repair" — shown for activity-adds
}

const KTGenerationModal: React.FC<KTGenerationModalProps> = ({
  phase,
  equipmentName,
  errorMessage,
  onClose,
  serviceActivityLabel,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [msgIndex, setMsgIndex] = useState(0);

  // Cycle through status messages while generating
  useEffect(() => {
    if (phase !== 'generating') {
      setMsgIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1) % GENERATING_MESSAGES.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [phase]);

  if (phase === 'idle' || phase === 'done') return null;

  const statusMessage =
    phase === 'saving'
      ? 'Saving Knowledge Tree to database...'
      : phase === 'error'
      ? errorMessage || 'Generation failed'
      : GENERATING_MESSAGES[msgIndex];

  const isError = phase === 'error';

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ animation: 'ktFadeIn 0.2s ease' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      />

      {/* Card */}
      <div
        className="relative flex flex-col items-center text-center px-10 py-10 rounded-2xl shadow-2xl"
        style={{
          background: colors.utility.primaryBackground,
          border: `1px solid ${colors.utility.secondaryText}20`,
          minWidth: 340,
          maxWidth: 420,
          animation: 'ktSlideUp 0.25s ease',
        }}
      >
        {/* VaNi avatar */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl mb-5 shadow-lg"
          style={{
            background: isError
              ? colors.semantic.error
              : 'linear-gradient(135deg, #ff6b2b, #ff8f5a)',
            boxShadow: isError
              ? `0 4px 20px ${colors.semantic.error}40`
              : '0 4px 20px rgba(255,107,43,0.35)',
          }}
        >
          {isError ? (
            <AlertCircle className="w-6 h-6" />
          ) : (
            'V'
          )}
        </div>

        {/* Title */}
        <h3
          className="text-[15px] font-semibold mb-1"
          style={{ color: colors.utility.primaryText }}
        >
          {isError ? 'Generation Failed' : 'VaNi is Generating...'}
        </h3>

        {/* Equipment name */}
        <p
          className="text-[12px] font-medium"
          style={{ color: '#ff6b2b' }}
        >
          {equipmentName}
        </p>
        {serviceActivityLabel && (
          <p className="text-[11px] mb-6 mt-0.5" style={{ color: '#ff8f5a' }}>
            {serviceActivityLabel}
          </p>
        )}
        {!serviceActivityLabel && <div className="mb-6" />}

        {/* Spinner + pulsing dots */}
        {!isError && (
          <div className="flex items-center gap-2 mb-5">
            <svg
              className="animate-spin h-5 w-5 flex-shrink-0"
              style={{ color: '#ff6b2b' }}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span
              className="text-[13px]"
              style={{
                color: colors.utility.secondaryText,
                animation: 'ktFadeMsg 0.4s ease',
                key: msgIndex,
              } as React.CSSProperties}
            >
              {statusMessage}
            </span>
          </div>
        )}

        {/* Progress bar strip */}
        {!isError && (
          <div
            className="w-full h-1 rounded-full overflow-hidden mb-2"
            style={{ background: colors.utility.secondaryBackground }}
          >
            <div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #ff6b2b, #ff8f5a)',
                width: phase === 'saving' ? '90%' : '60%',
                transition: 'width 1.2s ease',
                animation: 'ktProgress 3s ease-in-out infinite alternate',
              }}
            />
          </div>
        )}

        {/* Phase label */}
        {!isError && (
          <p
            className="text-[11px] mt-1"
            style={{ color: colors.utility.secondaryText + '80' }}
          >
            {phase === 'saving' ? 'Step 2 of 2 — saving to database' : 'Step 1 of 2 — AI generation'}
          </p>
        )}

        {/* Error state */}
        {isError && (
          <>
            <p
              className="text-[13px] mb-5 leading-relaxed"
              style={{ color: colors.utility.secondaryText }}
            >
              {errorMessage}
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #ff6b2b, #ff8f5a)' }}
            >
              Dismiss
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes ktFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ktSlideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes ktProgress { from { opacity: 0.7 } to { opacity: 1 } }
        @keyframes ktFadeMsg { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>,
    document.body
  );
};

export default KTGenerationModal;
