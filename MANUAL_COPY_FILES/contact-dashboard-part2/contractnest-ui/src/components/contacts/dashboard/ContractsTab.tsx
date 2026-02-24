// src/components/contacts/dashboard/ContractsTab.tsx
// Full contracts list with PipelineBar + role filter pills + ContractCard
// Reuses existing components from contracts hub

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  ShoppingCart,
  Package,
  Handshake,
  Loader2,
} from 'lucide-react';
import PipelineBar from '@/components/contracts/PipelineBar';
import ContractCard from '@/components/contracts/ContractCard';
import type { ContractSummaryItem } from '@/types/contactCockpit';

interface ContractsTabProps {
  contactId: string;
  contracts: ContractSummaryItem[];
  contractsByStatus: Record<string, number>;
  contractsByRole: Record<string, number>;
  colors: any;
  isLoading: boolean;
}

const ROLE_FILTER_CONFIG = [
  { key: 'as_client', label: 'Client', icon: ShoppingCart, color: '#10B981' },
  { key: 'as_vendor', label: 'Vendor', icon: Package, color: '#3B82F6' },
  { key: 'as_partner', label: 'Partner', icon: Handshake, color: '#8B5CF6' },
];

const ContractsTab: React.FC<ContractsTabProps> = ({
  contactId,
  contracts,
  contractsByStatus,
  contractsByRole,
  colors,
  isLoading,
}) => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  // Filter contracts based on selected status AND role
  const filteredContracts = contracts.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (roleFilter && c.contact_role !== roleFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 rounded-xl animate-pulse" style={{ backgroundColor: colors.utility.secondaryText + '15' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Toolbar: Role Filters + New Contract Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* All pill */}
          <button
            onClick={() => setRoleFilter(null)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              border: `1px solid ${roleFilter === null ? colors.brand.primary : colors.utility.primaryText + '20'}`,
              backgroundColor: roleFilter === null ? colors.brand.primary + '15' : 'transparent',
              color: roleFilter === null ? colors.brand.primary : colors.utility.secondaryText,
            }}
          >
            All {contracts.length}
          </button>
          {/* Role pills */}
          {ROLE_FILTER_CONFIG.map(rf => {
            const count = contractsByRole[rf.key] || 0;
            if (count === 0) return null;
            const isActive = roleFilter === rf.key;
            const Icon = rf.icon;
            return (
              <button
                key={rf.key}
                onClick={() => setRoleFilter(isActive ? null : rf.key)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5"
                style={{
                  border: `1px solid ${isActive ? rf.color : colors.utility.primaryText + '20'}`,
                  backgroundColor: isActive ? rf.color + '15' : 'transparent',
                  color: isActive ? rf.color : colors.utility.secondaryText,
                }}
              >
                <Icon className="h-3 w-3" />
                {rf.label} {count}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => navigate(`/contracts/create?contactId=${contactId}`)}
          className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
          style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
        >
          <Plus className="h-4 w-4" /> New Contract
        </button>
      </div>

      {/* Pipeline Status Bar */}
      <div className="mb-5">
        <PipelineBar
          statusCounts={contractsByStatus}
          activeStatus={statusFilter}
          onStatusClick={setStatusFilter}
          colors={colors}
          compact={false}
        />
      </div>

      {/* Active filter indicator */}
      {(statusFilter || roleFilter) && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
            Showing {filteredContracts.length} of {contracts.length}
          </span>
          <button
            onClick={() => { setStatusFilter(null); setRoleFilter(null); }}
            className="text-xs font-semibold px-2 py-0.5 rounded"
            style={{ color: colors.brand.primary, backgroundColor: colors.brand.primary + '10' }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Contract Cards */}
      {filteredContracts.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" style={{ color: colors.utility.secondaryText }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
            {statusFilter || roleFilter ? 'No matching contracts' : 'No contracts yet'}
          </h3>
          <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
            {statusFilter || roleFilter
              ? 'Try adjusting your filters'
              : 'Create your first contract for this contact'}
          </p>
          {!statusFilter && !roleFilter && (
            <button
              onClick={() => navigate(`/contracts/create?contactId=${contactId}`)}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
            >
              Create Contract
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredContracts.map(c => (
            <ContractCard
              key={c.id}
              contract={{
                id: c.id,
                name: c.name,
                contract_number: c.contract_number,
                status: c.status,
                contract_type: c.contract_type,
                grand_total: c.grand_total,
                currency: c.currency,
                duration_value: c.duration_value,
                duration_unit: c.duration_unit,
                contact_role: c.contact_role,
                global_access_id: c.global_access_id,
                cnak_status: c.cnak_status,
              }}
              colors={colors}
              variant="compact"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ContractsTab;
