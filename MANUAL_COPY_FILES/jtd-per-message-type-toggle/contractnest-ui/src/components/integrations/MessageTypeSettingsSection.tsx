// src/components/integrations/MessageTypeSettingsSection.tsx
// Per-message-type on/off + read-only template preview. Sits alongside the
// channel-level toggles on /settings/integrations. Global/identity message
// types (invites, signup, contract sign-off) are shown as "Always on" and
// can't be toggled — see jtd-tenant-settings edge function for why.
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Bell, Lock, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { vaniToast } from '@/components/common/toast';
import {
  useJtdTenantMessageSettings,
  useJtdTenantMessageToggle,
  JtdMessageTypeSetting,
} from '@/hooks/useJtdTenantMessageSettings';

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  sms: 'SMS',
  inapp: 'In-app',
};

const MessageTypeSettingsSection: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { messageTypes, loading, error, refresh } = useJtdTenantMessageSettings();
  const { toggle, saving } = useJtdTenantMessageToggle();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const handleToggle = async (item: JtdMessageTypeSetting) => {
    if (item.is_global) return;
    const next = !item.is_enabled;
    const ok = await toggle(item.source_type_code, next);
    if (ok) {
      vaniToast.success(`${item.name} ${next ? 'enabled' : 'disabled'}`);
      refresh();
    } else {
      vaniToast.error('Failed to update this setting — please try again');
    }
  };

  const toggleExpanded = (code: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
        boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)',
      }}
    >
      <div
        className="px-6 py-4 border-b flex items-center gap-3"
        style={{
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        }}
      >
        <div
          className="p-2 rounded-lg"
          style={{ background: `${colors.brand.primary}15` }}
        >
          <Bell className="h-5 w-5" style={{ color: colors.brand.primary }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
            Message Notifications
          </h2>
          <p className="text-sm mt-0.5" style={{ color: colors.utility.secondaryText }}>
            Turn individual notifications on or off for your workspace, and preview what they say.
            Account-access messages (invites, sign-up, contract sign-off links) always stay on.
          </p>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: colors.brand.primary }} />
          </div>
        ) : error ? (
          <p className="text-sm py-6 text-center" style={{ color: colors.semantic.error }}>
            {error}
          </p>
        ) : messageTypes.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: colors.utility.secondaryText }}>
            No message types configured yet.
          </p>
        ) : (
          <div className="divide-y" style={{ borderColor: `${colors.utility.primaryText}10` }}>
            {messageTypes.map((item) => {
              const isExpanded = expanded.has(item.source_type_code);
              const isSaving = saving === item.source_type_code;
              return (
                <div key={item.source_type_code} className="py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm" style={{ color: colors.utility.primaryText }}>
                          {item.name}
                        </span>
                        {item.is_global && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: `${colors.utility.secondaryText}15`, color: colors.utility.secondaryText }}
                          >
                            <Lock size={10} /> Always on
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>
                          {item.description}
                        </p>
                      )}
                      {item.templates.length > 0 && (
                        <button
                          onClick={() => toggleExpanded(item.source_type_code)}
                          className="text-xs mt-1 flex items-center gap-1 hover:underline"
                          style={{ color: colors.brand.primary }}
                        >
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          {isExpanded ? 'Hide' : 'Preview'} message content
                        </button>
                      )}
                    </div>

                    <div className="flex items-center flex-shrink-0">
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" style={{ color: colors.brand.primary }} />
                      ) : (
                        <label
                          className={`relative inline-flex items-center ${item.is_global ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                        >
                          <input
                            type="checkbox"
                            checked={item.is_enabled}
                            disabled={item.is_global}
                            onChange={() => handleToggle(item)}
                            className="sr-only peer"
                          />
                          <div
                            className="w-11 h-6 peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"
                            style={{
                              backgroundColor: item.is_enabled ? colors.brand.primary : colors.utility.secondaryText + '40',
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {isExpanded && item.templates.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {item.templates.map((tpl) => (
                        <div
                          key={tpl.channel_code}
                          className="rounded-lg p-3 text-sm"
                          style={{
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                          }}
                        >
                          <div
                            className="text-xs font-semibold uppercase tracking-wide mb-1"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            {CHANNEL_LABELS[tpl.channel_code] || tpl.channel_code}
                          </div>
                          {tpl.subject && (
                            <div className="font-medium mb-1" style={{ color: colors.utility.primaryText }}>
                              {tpl.subject}
                            </div>
                          )}
                          <div style={{ color: colors.utility.primaryText, whiteSpace: 'pre-wrap' }}>
                            {tpl.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageTypeSettingsSection;
