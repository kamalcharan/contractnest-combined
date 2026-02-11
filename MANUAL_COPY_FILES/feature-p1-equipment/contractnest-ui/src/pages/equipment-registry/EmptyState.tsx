// src/pages/settings/Equipment/EmptyState.tsx
// Empty state with industry-specific suggestion chips

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';

// Industry suggestion chips (from migration 035 seed data)
const SUGGESTIONS = [
  { icon: '🔬', label: 'MRI Scanner' },
  { icon: '🔬', label: 'CT Scanner' },
  { icon: '💓', label: 'Defibrillator' },
  { icon: '💨', label: 'Ventilator' },
  { icon: '📡', label: 'X-Ray Machine' },
  { icon: '🧪', label: 'Autoclave' },
  { icon: '📊', label: 'Patient Monitor' },
  { icon: '🔭', label: 'Ultrasound' },
  { icon: '❄️', label: 'Split AC' },
  { icon: '🛗', label: 'Passenger Lift' },
  { icon: '⚡', label: 'DG Set' },
  { icon: '🔋', label: 'UPS System' },
];

interface EquipmentEmptyStateProps {
  onAddCustom: () => void;
  onAddSuggestions: (names: string[]) => void;
}

const EquipmentEmptyState: React.FC<EquipmentEmptyStateProps> = ({ onAddCustom, onAddSuggestions }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSuggestion = (label: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const handleContinue = () => {
    if (selected.size > 0) {
      onAddSuggestions(Array.from(selected));
    }
  };

  return (
    <div className="text-center py-16 px-6">
      {/* Illustration */}
      <div className="flex justify-center gap-3 text-5xl mb-6 opacity-80">
        <span>🔬</span><span>❄️</span><span>⚡</span><span>🛗</span><span>🧪</span>
      </div>

      <h2
        className="text-xl font-bold mb-2"
        style={{ color: colors.utility.primaryText }}
      >
        Tell us what you service
      </h2>
      <p
        className="text-sm max-w-lg mx-auto mb-7 leading-relaxed"
        style={{ color: colors.utility.secondaryText }}
      >
        Select the equipment types you commonly service, or add your own custom types.
        These will appear in your Equipment Registry for contract linking and tracking.
      </p>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap gap-2.5 justify-center max-w-2xl mx-auto mb-6">
        {SUGGESTIONS.map((s) => {
          const isSelected = selected.has(s.label);
          return (
            <button
              key={s.label}
              onClick={() => toggleSuggestion(s.label)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
              style={{
                border: `1.5px solid ${isSelected ? '#10b981' : colors.utility.primaryText + '20'}`,
                backgroundColor: isSelected ? '#ecfdf5' : colors.utility.secondaryBackground,
                color: isSelected ? '#10b981' : colors.utility.primaryText,
              }}
            >
              <span>{isSelected ? '✅' : s.icon}</span>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Custom Add Link */}
      <button
        onClick={onAddCustom}
        className="text-sm font-semibold inline-flex items-center gap-1 mb-8 transition-colors hover:underline"
        style={{ color: colors.brand.primary }}
      >
        <Plus className="h-4 w-4" />
        Add custom equipment type
      </button>

      {/* Continue Button */}
      {selected.size > 0 && (
        <div>
          <Button
            onClick={handleContinue}
            className="transition-colors hover:opacity-90"
            style={{
              background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
              color: '#FFFFFF',
            }}
          >
            Add {selected.size} selected equipment{selected.size > 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EquipmentEmptyState;
