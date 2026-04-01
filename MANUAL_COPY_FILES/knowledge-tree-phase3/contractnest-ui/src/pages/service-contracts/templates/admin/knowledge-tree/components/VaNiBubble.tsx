// VaNi guidance bubble — AI assistant message at top of each tab
// VaNi brand colors (orange gradient) are intentional — not theme-dependent
import React from 'react';

const VaNiBubble: React.FC<{ children: React.ReactNode; colors: any }> = ({ children, colors }) => (
  <div className="flex gap-3 mb-5" style={{ animation: 'fadeInUp .4s ease' }}>
    <div
      className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center flex-shrink-0 text-white font-black text-[13px]"
      style={{ background: 'linear-gradient(135deg, #ff6b2b, #ff8f5a)', boxShadow: '0 2px 6px rgba(255,107,43,.2)' }}
    >
      V
    </div>
    <div
      className="text-[13px] leading-relaxed max-w-[680px] px-[18px] py-[14px]"
      style={{
        background: colors.utility.secondaryBackground,
        border: `1px solid ${colors.utility.secondaryText}20`,
        borderRadius: '3px 12px 12px 12px',
        boxShadow: '0 2px 12px rgba(0,0,0,.04), 0 1px 3px rgba(0,0,0,.03)',
        color: colors.utility.secondaryText,
      }}
    >
      {children}
    </div>
    <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>
  </div>
);

export default VaNiBubble;
