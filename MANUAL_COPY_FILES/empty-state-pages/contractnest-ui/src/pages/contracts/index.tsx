// src/pages/contracts/index.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  FileSignature,
  Shield,
  BarChart3,
  Clock,
  Bell,
  Search,
  Layers
} from 'lucide-react';
import ComingSoonWrapper from '@/components/common/ComingSoonWrapper';

// Coming soon features for Contracts
const contractsFeatures = [
  {
    icon: FileSignature,
    title: 'Digital Contract Creation',
    description: 'Create professional contracts with customizable templates, clause libraries, and smart field mapping.',
    highlight: true
  },
  {
    icon: Shield,
    title: 'Compliance & Audit Trail',
    description: 'Every action tracked. Full audit history for regulatory compliance and dispute resolution.',
    highlight: false
  },
  {
    icon: Clock,
    title: 'Lifecycle Management',
    description: 'Track contract stages from draft to signed. Automated reminders for renewals and expirations.',
    highlight: false
  },
  {
    icon: BarChart3,
    title: 'Contract Analytics',
    description: 'Insights on contract value, turnaround time, and performance metrics across your portfolio.',
    highlight: false
  }
];

// Floating icons specific to contracts
const contractsFloatingIcons = [
  { Icon: FileText, top: '8%', left: '4%', delay: '0s', duration: '22s' },
  { Icon: FileSignature, top: '18%', right: '6%', delay: '1.5s', duration: '19s' },
  { Icon: Shield, top: '60%', left: '5%', delay: '3s', duration: '21s' },
  { Icon: Layers, top: '70%', right: '4%', delay: '0.5s', duration: '18s' },
  { Icon: Bell, top: '35%', left: '6%', delay: '2.5s', duration: '20s' },
  { Icon: Search, top: '45%', right: '8%', delay: '4s', duration: '23s' },
];

// Actual contracts content (shown after unlock)
const ContractsContent: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-8 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contracts</h1>
            <p className="text-muted-foreground">Manage all your contracts and agreements</p>
          </div>
          <button
            onClick={() => navigate('/contracts/create')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            New Contract
          </button>
        </div>

        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2 text-foreground">No Contracts Yet</h2>
          <p className="text-muted-foreground mb-4">
            Create your first contract to get started with contract management.
          </p>
          <button
            onClick={() => navigate('/contracts/create')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            Create First Contract
          </button>
        </div>
      </div>
    </div>
  );
};

const ContractsListPage: React.FC = () => {
  return (
    <ComingSoonWrapper
      pageKey="contracts"
      title="Contract Management"
      subtitle="End-to-end contract lifecycle management. From creation to signature, renewal tracking to compliance - all in one powerful platform."
      heroIcon={FileText}
      features={contractsFeatures}
      floatingIcons={contractsFloatingIcons}
    >
      <ContractsContent />
    </ComingSoonWrapper>
  );
};

export default ContractsListPage;
