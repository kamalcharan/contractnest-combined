// src/components/catalog-studio/BlockWizard/steps/checklist/ItemsStep.tsx
import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, CheckSquare, Camera, Lightbulb } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';

interface ChecklistItem {
  id: string;
  text: string;
  required: boolean;
  requirePhoto: boolean;
}

interface ItemsStepProps {
  formData: {
    items?: ChecklistItem[];
  };
  onChange: (field: string, value: unknown) => void;
}

const ItemsStep: React.FC<ItemsStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [items, setItems] = useState<ChecklistItem[]>(formData.items || [
    { id: '1', text: 'Item checked and verified', required: true, requirePhoto: false },
    { id: '2', text: 'Condition documented', required: true, requirePhoto: true },
    { id: '3', text: 'Customer confirmation obtained', required: false, requirePhoto: false },
  ]);

  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const addItem = () => {
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      text: '',
      required: false,
      requirePhoto: false
    };
    const updated = [...items, newItem];
    setItems(updated);
    onChange('items', updated);
  };

  const removeItem = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    onChange('items', updated);
  };

  const updateItem = (id: string, field: keyof ChecklistItem, value: string | boolean) => {
    const updated = items.map((item) => item.id === id ? { ...item, [field]: value } : item);
    setItems(updated);
    onChange('items', updated);
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Checklist Items
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Define the items that need to be checked or verified.
      </p>

      <div className="space-y-6">
        {/* Items List */}
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-4 rounded-lg border"
              style={{
                backgroundColor: (isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF'),
                borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
              }}
            >
              <div className="flex items-center gap-2 pt-2">
                <GripVertical className="w-4 h-4 cursor-move" style={{ color: colors.utility.secondaryText }} />
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: `${colors.brand.primary}20`, color: colors.brand.primary }}
                >
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 space-y-3">
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => updateItem(item.id, 'text', e.target.value)}
                  placeholder="Enter checklist item..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                />
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.required}
                      onChange={(e) => updateItem(item.id, 'required', e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: colors.brand.primary }}
                    />
                    <span className="text-xs" style={{ color: colors.utility.secondaryText }}>Required</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.requirePhoto}
                      onChange={(e) => updateItem(item.id, 'requirePhoto', e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: colors.brand.primary }}
                    />
                    <Camera className="w-3 h-3" style={{ color: colors.utility.secondaryText }} />
                    <span className="text-xs" style={{ color: colors.utility.secondaryText }}>Require photo</span>
                  </label>
                </div>
              </div>
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(item.id)}
                  className="pt-2"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Item Button */}
        <button
          onClick={addItem}
          className="w-full p-3 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 transition-colors"
          style={{
            borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
            color: colors.utility.secondaryText
          }}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Add Checklist Item</span>
        </button>

        {/* Quick Add */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <CheckSquare className="w-4 h-4" /> Quick Add Templates
          </h4>
          <div className="flex flex-wrap gap-2">
            {[
              'Pre-service inspection',
              'Safety check completed',
              'Parts inventory verified',
              'Customer signature obtained',
              'Before photo taken',
              'After photo taken',
              'Work area cleaned',
              'Documentation provided'
            ].map((template) => (
              <button
                key={template}
                onClick={() => {
                  const newItem: ChecklistItem = {
                    id: Date.now().toString(),
                    text: template,
                    required: false,
                    requirePhoto: template.includes('photo')
                  };
                  const updated = [...items, newItem];
                  setItems(updated);
                  onChange('items', updated);
                }}
                className="px-3 py-1 text-xs rounded-full border transition-colors"
                style={{
                  borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
                  color: colors.utility.primaryText
                }}
              >
                + {template}
              </button>
            ))}
          </div>
        </div>

        {/* Tip */}
        <div className="p-4 rounded-lg flex gap-3" style={{ backgroundColor: `${colors.semantic.info}15` }}>
          <Lightbulb className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.info }} />
          <div className="text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#1E40AF' }}>
            <strong>Tip:</strong> Mark items as "required" if they must be completed before the service can be marked as done. Photo requirements help with verification.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemsStep;
