// src/pages/contracts/create/index.tsx
// Contract Type Pages - Client, Vendor, Partner Contracts
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, FileText, Search, Filter } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import ContractWizard from '@/components/contracts/ContractWizard';

// Contract type definition
export type ContractType = 'client' | 'vendor' | 'partner';

// Configuration for each contract type
const CONTRACT_TYPE_CONFIG: Record<ContractType, { title: string; subtitle: string; buttonText: string }> = {
  client: {
    title: 'Client Contracts',
    subtitle: 'Create and manage contracts with your clients',
    buttonText: 'Create Client Contract',
  },
  vendor: {
    title: 'Vendor Contracts',
    subtitle: 'Create and manage contracts with your vendors',
    buttonText: 'Create Vendor Contract',
  },
  partner: {
    title: 'Partner Contracts',
    subtitle: 'Create and manage contracts with your partners',
    buttonText: 'Create Partner Contract',
  },
};

const ContractCreatePage: React.FC = () => {
  const { contractType } = useParams<{ contractType: string }>();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [showWizard, setShowWizard] = useState(false);

  // Get config for current contract type (default to 'client' if invalid)
  const validContractType = (contractType && ['client', 'vendor', 'partner'].includes(contractType))
    ? contractType as ContractType
    : 'client';
  const config = CONTRACT_TYPE_CONFIG[validContractType];

  // Placeholder contracts data - will be replaced with API data
  const contracts: any[] = [];

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Header with Create Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: colors.utility.primaryText }}
          >
            {config.title}
          </h1>
          <p
            className="text-sm"
            style={{ color: colors.utility.secondaryText }}
          >
            {config.subtitle}
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium transition-all hover:opacity-90 hover:shadow-lg"
          style={{ backgroundColor: colors.brand.primary }}
        >
          <Plus className="h-5 w-5" />
          {config.buttonText}
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div
        className="flex items-center gap-4 mb-6 p-4 rounded-lg border"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.primaryText}10`
        }}
      >
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: colors.utility.secondaryText }}
          />
          <input
            type="text"
            placeholder="Search contracts..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm outline-none transition-all focus:ring-2"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: `${colors.utility.primaryText}20`,
              color: colors.utility.primaryText
            }}
          />
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all hover:opacity-80"
          style={{
            borderColor: `${colors.utility.primaryText}20`,
            color: colors.utility.primaryText
          }}
        >
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Contracts List or Empty State */}
      {contracts.length === 0 ? (
        <div
          className="rounded-lg border p-12 text-center"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}10`
          }}
        >
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ backgroundColor: `${colors.brand.primary}10` }}
          >
            <FileText
              className="h-8 w-8"
              style={{ color: colors.brand.primary }}
            />
          </div>
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: colors.utility.primaryText }}
          >
            No contracts yet
          </h3>
          <p
            className="text-sm mb-6 max-w-md mx-auto"
            style={{ color: colors.utility.secondaryText }}
          >
            Create your first contract to start managing service agreements with your customers.
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: colors.brand.primary }}
          >
            <Plus className="h-5 w-5" />
            {config.buttonText}
          </button>
        </div>
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}10`
          }}
        >
          {/* Table Header */}
          <div
            className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium uppercase tracking-wider border-b"
            style={{
              borderColor: `${colors.utility.primaryText}10`,
              color: colors.utility.secondaryText
            }}
          >
            <div className="col-span-4">Contract</div>
            <div className="col-span-2">Buyer</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Value</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          {/* Table Body - placeholder for contract rows */}
          <div className="divide-y" style={{ borderColor: `${colors.utility.primaryText}10` }}>
            {contracts.map((contract, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-opacity-50 transition-colors"
                style={{ backgroundColor: 'transparent' }}
              >
                {/* Contract row content will go here */}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contract Wizard */}
      <ContractWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        contractType={validContractType}
        onComplete={(contractData) => {
          console.log('Contract created:', contractData);
          // TODO: Send to API
          setShowWizard(false);
        }}
      />
    </div>
  );
};

export default ContractCreatePage;
