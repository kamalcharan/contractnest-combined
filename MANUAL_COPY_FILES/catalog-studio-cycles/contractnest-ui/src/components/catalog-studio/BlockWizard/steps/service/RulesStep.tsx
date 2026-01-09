// src/components/catalog-studio/BlockWizard/steps/service/RulesStep.tsx
// HIDDEN: This step is hidden per requirement
// Original content preserved as comments below

import React from 'react';
import { useTheme } from '../../../../../contexts/ThemeContext';

interface RulesStepProps {
  formData: {
    autoApprove?: boolean;
    requiresOTP?: boolean;
    maxReschedules?: number;
    cancellationPolicy?: 'flexible' | 'moderate' | 'strict';
    refundPercentage?: number;
    reminderHours?: number;
  };
  onChange: (field: string, value: unknown) => void;
}

const RulesStep: React.FC<RulesStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // STEP IS HIDDEN - Returning empty placeholder
  // See BusinessRulesStep for the active business rules configuration
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      {/* This step is hidden. Business rules have been moved to the Business Rules step. */}
    </div>
  );

  /* HIDDEN: Original RulesStep content
  import { Shield, RefreshCw, Ban, AlertCircle, Clock, Bell } from 'lucide-react';
  import { CANCELLATION_POLICIES } from '../../../../../utils/catalog-studio';

  const [cancellationPolicy, setCancellationPolicy] = useState(formData.cancellationPolicy || 'moderate');

  const handlePolicyChange = (policy: 'flexible' | 'moderate' | 'strict') => {
    setCancellationPolicy(policy);
    onChange('cancellationPolicy', policy);
    const policyData = CANCELLATION_POLICIES.find((p) => p.id === policy);
    if (policyData) onChange('refundPercentage', policyData.refundPercent);
  };

  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const labelStyle = { color: colors.utility.primaryText };

  const getPolicyIcon = (id: string) => {
    switch (id) {
      case 'flexible': return <RefreshCw className="w-5 h-5" style={{ color: colors.semantic.success }} />;
      case 'moderate': return <AlertCircle className="w-5 h-5" style={{ color: colors.semantic.warning }} />;
      case 'strict': return <Ban className="w-5 h-5" style={{ color: colors.semantic.error }} />;
      default: return null;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Business Rules
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Configure cancellation, rescheduling, and automation rules.
      </p>
      <div className="space-y-6">
        ... Cancellation Policy section ...
        ... Rescheduling Rules section ...
        ... Verification & Security section ...
        ... Automation & Notifications section ...
        ... SLA section ...
      </div>
    </div>
  );
  */
};

export default RulesStep;
