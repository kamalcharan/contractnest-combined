// src/components/integrations/IntegrationSetupGuide.tsx
// Provider-specific setup help inside IntegrationSetupModal, driven by the
// provider row's metadata (t_integration_providers.metadata) so no provider
// is hard-coded here:
//   setup_steps:   string[]  — "where to find these" steps, in order
//   webhook_path:  string    — edge function path, e.g. 'payment-webhook/razorpay';
//                              shown as a full URL with a Copy button
//   webhook_note:  string    — one line under the URL (why it matters)
// Renders nothing when the provider has none of these.

import React from 'react';
import { Copy } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { vaniToast } from '@/components/common/toast';

interface IntegrationSetupGuideProps {
  metadata?: Record<string, any> | null;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uwyqhzotluikawcboldr.supabase.co';

const IntegrationSetupGuide: React.FC<IntegrationSetupGuideProps> = ({ metadata }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const steps: string[] = Array.isArray(metadata?.setup_steps) ? metadata!.setup_steps : [];
  const webhookPath: string | undefined = typeof metadata?.webhook_path === 'string' ? metadata!.webhook_path : undefined;
  if (!steps.length && !webhookPath) return null;

  const webhookUrl = webhookPath ? `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/${webhookPath.replace(/^\/+/, '')}` : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      vaniToast.success('Webhook URL copied');
    } catch {
      vaniToast.warning('Could not copy', { message: 'Select the URL and copy it by hand.' });
    }
  };

  const box: React.CSSProperties = {
    background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    border: `1px solid ${colors.utility.primaryText}15`,
  };

  return (
    <div className="mb-6 space-y-3">
      {steps.length > 0 && (
        <div className="rounded-lg p-3 text-sm" style={box}>
          <div className="font-semibold mb-1" style={{ color: colors.utility.primaryText }}>How to set this up</div>
          <ol className="list-decimal pl-5 space-y-1" style={{ color: colors.utility.secondaryText }}>
            {steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      )}
      {webhookPath && (
        <div className="space-y-1">
          <div className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>Webhook URL</div>
          <div className="flex gap-2 items-center">
            <code className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap rounded-md px-3 py-2 text-xs" style={{ ...box, color: colors.utility.primaryText }}>
              {webhookUrl}
            </code>
            <button type="button" onClick={copy}
              className="flex items-center gap-1 px-3 py-2 rounded-md text-xs font-medium border transition-colors hover:opacity-80"
              style={{ borderColor: `${colors.utility.primaryText}25`, color: colors.utility.primaryText }}>
              <Copy size={14} /> Copy
            </button>
          </div>
          {metadata?.webhook_note && (
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>{metadata.webhook_note}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default IntegrationSetupGuide;
