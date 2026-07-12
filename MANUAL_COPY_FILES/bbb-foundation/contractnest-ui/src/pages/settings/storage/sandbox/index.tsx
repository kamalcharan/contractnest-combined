// src/pages/settings/storage/sandbox/index.tsx
// Sandbox settings page — hosts the transactional-data reset card.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import SandboxResetCard from '@/components/settings/SandboxResetCard';

const SandboxPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  return (
    <div
      className="container mx-auto p-6 max-w-4xl min-h-screen transition-colors duration-200"
      style={{
        background: `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`,
      }}
    >
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Trash2 className="w-6 h-6" style={{ color: colors.semantic.error }} />
        <div>
          <h1 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>Sandbox</h1>
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
            Clear this tenant's test / transactional data
          </p>
        </div>
      </div>

      <SandboxResetCard />
    </div>
  );
};

export default SandboxPage;
