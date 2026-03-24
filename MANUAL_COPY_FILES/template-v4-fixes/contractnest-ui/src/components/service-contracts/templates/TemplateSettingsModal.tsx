// src/components/service-contracts/templates/TemplateSettingsModal.tsx
// Settings modal for template: activate/deactivate + version history placeholder

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Power, History, Loader2 } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Template } from '../../../types/service-contracts/template';

interface TemplateSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
  onToggleActive: (templateId: string, isActive: boolean) => Promise<void>;
  isUpdating?: boolean;
}

const TemplateSettingsModal: React.FC<TemplateSettingsModalProps> = ({
  open,
  onOpenChange,
  template,
  onToggleActive,
  isUpdating = false,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  if (!template) return null;

  const isActive = template.isActive !== false;

  const handleToggle = async () => {
    await onToggleActive(template.id, !isActive);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.secondaryText + '20',
          color: colors.utility.primaryText,
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: colors.utility.primaryText }}>
            Template Settings
          </DialogTitle>
          <DialogDescription style={{ color: colors.utility.secondaryText }}>
            {template.name} — v{template.version || '1'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Activate / Deactivate */}
          <div
            className="flex items-center justify-between p-4 rounded-xl border"
            style={{ borderColor: colors.utility.secondaryText + '20' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: isActive ? '#10B98120' : '#EF444420',
                  color: isActive ? '#10B981' : '#EF4444',
                }}
              >
                <Power className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                  Status
                </p>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  {isActive ? 'Template is active and visible' : 'Template is inactive and hidden'}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggle}
              disabled={isUpdating}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              style={{
                backgroundColor: isActive ? '#EF444420' : '#10B98120',
                color: isActive ? '#EF4444' : '#10B981',
              }}
            >
              {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
              {isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>

          {/* Version History placeholder */}
          <div
            className="flex items-center justify-between p-4 rounded-xl border"
            style={{ borderColor: colors.utility.secondaryText + '20' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: '#6366F120',
                  color: '#6366F1',
                }}
              >
                <History className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                  Version History
                </p>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  {template.version ? `${template.version} version(s) recorded` : '1 version recorded'}
                </p>
              </div>
            </div>
            <button
              disabled
              className="px-4 py-2 text-sm font-medium rounded-lg opacity-50 cursor-not-allowed"
              style={{
                backgroundColor: '#6366F120',
                color: '#6366F1',
              }}
            >
              View History
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateSettingsModal;
