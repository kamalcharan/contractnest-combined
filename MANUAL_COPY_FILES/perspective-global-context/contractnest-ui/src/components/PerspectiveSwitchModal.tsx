// src/components/PerspectiveSwitchModal.tsx

import React from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ConfirmationDialog from './ui/ConfirmationDialog';

const PerspectiveSwitchModal: React.FC = () => {
  const {
    showPerspectiveSwitchModal,
    pendingPerspective,
    perspective,
    confirmPerspectiveSwitch,
    cancelPerspectiveSwitch,
  } = useAuth();

  if (!showPerspectiveSwitchModal || !pendingPerspective) {
    return null;
  }

  const sourceLabel = perspective === 'revenue' ? 'Revenue' : 'Expense';
  const sourceSubLabel = perspective === 'revenue' ? 'Clients' : 'Vendors';
  const targetLabel = pendingPerspective === 'revenue' ? 'Revenue' : 'Expense';
  const targetSubLabel = pendingPerspective === 'revenue' ? 'Clients' : 'Vendors';

  const SourceBadge = () => (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: perspective === 'revenue' ? '#dbeafe' : '#fce7f3',
        color: perspective === 'revenue' ? '#2563eb' : '#db2777',
      }}
    >
      {sourceLabel} · {sourceSubLabel}
    </span>
  );

  const TargetBadge = () => (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: pendingPerspective === 'revenue' ? '#dbeafe' : '#fce7f3',
        color: pendingPerspective === 'revenue' ? '#2563eb' : '#db2777',
      }}
    >
      {targetLabel} · {targetSubLabel}
    </span>
  );

  const description = (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-3">
        <SourceBadge />
        <span className="text-muted-foreground">&rarr;</span>
        <TargetBadge />
      </div>
      <p className="text-sm text-muted-foreground">
        You are switching from <strong>{sourceLabel}</strong> to <strong>{targetLabel}</strong> mode.
      </p>
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md p-3">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {pendingPerspective === 'revenue'
            ? 'Revenue mode shows client contracts, client equipment, and accounts receivable.'
            : 'Expense mode shows vendor contracts, your own equipment, and accounts payable.'}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        All data will be refreshed to show {targetLabel.toLowerCase()} context across all pages.
      </p>
    </div>
  );

  return (
    <ConfirmationDialog
      isOpen={showPerspectiveSwitchModal}
      onClose={cancelPerspectiveSwitch}
      onConfirm={confirmPerspectiveSwitch}
      title="Switch Perspective"
      description={description as any}
      confirmText={`Switch to ${targetLabel}`}
      cancelText="Cancel"
      type="info"
      icon={<ArrowRightLeft className="h-6 w-6" />}
    />
  );
};

export default PerspectiveSwitchModal;
