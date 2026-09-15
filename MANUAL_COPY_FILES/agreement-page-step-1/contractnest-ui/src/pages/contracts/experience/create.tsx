import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ContractWizard, { type ContractType } from '@/components/contracts/ContractWizard';

// A separate manual entry. Templates, VaNi and existing draft resume stay on their current paths.
export default function CreateContractExperiencePage() {
  const { currentTenant, isLive, perspective } = useAuth();
  const { currentTheme, isDarkMode } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const requested = params.get('relationship');
  const choices: ContractType[] = perspective === 'revenue' ? ['client', 'partner'] : perspective === 'expense' ? ['vendor'] : [];
  const valid = choices.includes(requested as ContractType);
  const [started, setStarted] = useState<ContractType | null>(valid ? requested as ContractType : null);
  const [initialScope, setInitialScope] = useState(() => JSON.stringify([currentTenant?.id, isLive, perspective]));
  const scopeChanged = !!started && initialScope !== JSON.stringify([currentTenant?.id, isLive, perspective]);
  const close = () => navigate('/contracts/experience');
  if (started && currentTenant?.id && !scopeChanged) return <ContractWizard
    presentation="experience" agreementOnly isOpen contractType={started} onClose={close} />;
  return <main style={{ maxWidth: 880, margin: 'auto', padding: 'clamp(20px, 5vw, 64px)', color: colors.utility.primaryText }}>
    <p style={{ color: colors.brand.primary, fontSize: 12, letterSpacing: '.08em', fontWeight: 700 }}>CREATE AN AGREEMENT</p>
    <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-.035em', lineHeight: 1.15 }}>Who is this commitment with?</h1>
    <p style={{ color: colors.utility.secondaryText, lineHeight: 1.7 }}>Start with the relationship. We’ll use your contacts and catalogue to shape the agreement, one decision at a time.</p>
    {scopeChanged || !currentTenant?.id || !choices.length ? <p role="alert">Workspace or perspective changed or is unavailable. Return to Contracts and start in the intended workspace. No contract is submitted from this screen.</p> : <>
      {requested && !valid && <p role="alert">That relationship is not available in this perspective. Choose explicitly below.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 30 }}>
        {choices.map(type => <button key={type} onClick={() => { setInitialScope(JSON.stringify([currentTenant?.id, isLive, perspective])); setParams({ relationship: type }, { replace: true }); setStarted(type); }}
          style={{ padding: 24, border: `1px solid ${colors.utility.primaryText}20`, borderRadius: 20, background: colors.utility.secondaryBackground, color: colors.utility.primaryText, textAlign: 'left', cursor: 'pointer' }}>
          <FileText size={24} color={colors.brand.primary} /><h2 style={{ fontSize: 19, marginTop: 18 }}>{type === 'client' ? 'Client contract' : type === 'partner' ? 'Partner contract' : 'Vendor contract'}</h2>
          <p style={{ fontSize: 13, color: colors.utility.secondaryText, lineHeight: 1.6 }}>Choose from your {type === 'client' ? 'clients' : type === 'partner' ? 'partners' : 'vendors'}. Agree the scope, price and delivery plan.</p><ArrowRight size={18} />
        </button>)}
      </div>
      <p style={{ marginTop: 24, fontSize: 13, color: colors.utility.secondaryText }}>Manual creation · VaNi assistance is not required.</p>
    </>}
    <button onClick={close} style={{ marginTop: 22, padding: '12px 0', color: colors.brand.primary, background: 'transparent', border: 0, cursor: 'pointer' }}>Back to Contracts</button>
  </main>;
}
