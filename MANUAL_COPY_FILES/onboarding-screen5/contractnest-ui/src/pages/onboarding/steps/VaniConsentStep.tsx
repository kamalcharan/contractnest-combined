// src/pages/onboarding/steps/VaniConsentStep.tsx
// Screen 6 — VaNi Consent (placeholder — replaced when Screen 6 is built)
import React from 'react';
import { useNavigate } from 'react-router-dom';

const VaniConsentStep: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ padding: 48, fontFamily: "'Outfit', sans-serif" }}>
      <h2 style={{ marginBottom: 16 }}>VaNi Consent (Screen 6 — coming soon)</h2>
      <button
        onClick={() => navigate('/onboarding/industry-selection')}
        style={{ marginRight: 12, padding: '10px 20px', borderRadius: 8, cursor: 'pointer' }}
      >
        ← Back
      </button>
    </div>
  );
};

export default VaniConsentStep;
