// src/pages/onboarding/steps/IndustrySelectionStep.tsx
// Screen 5 — Industry Selection. Placeholder until Screen 5 is built.
import React from 'react';
import { useNavigate } from 'react-router-dom';

const IndustrySelectionStep: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ padding: 48, textAlign: 'center', fontFamily: "'Outfit', sans-serif" }}>
      <p style={{ fontSize: 16, color: '#6a6460' }}>Industry Selection — coming next.</p>
      <button
        onClick={() => navigate('/onboarding/theme-selection')}
        style={{ marginTop: 24, padding: '10px 24px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer' }}
      >
        ← Back
      </button>
    </div>
  );
};

export default IndustrySelectionStep;
