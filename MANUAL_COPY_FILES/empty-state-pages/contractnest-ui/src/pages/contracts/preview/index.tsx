// src/pages/contracts/preview/index.tsx
// Contract Preview Page - Buyer/Seller View
import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ComingSoonWrapper from '@/components/common/ComingSoonWrapper';
import {
  ArrowLeft,
  Eye,
  FileText,
  Download,
  Share2,
  Printer,
  User,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  FileSignature,
  Shield,
  BarChart3,
  Layers
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const contractsFeatures = [
  { icon: FileSignature, title: 'Digital Contract Creation', description: 'Create professional contracts with customizable templates.', highlight: true },
  { icon: Shield, title: 'Compliance & Audit Trail', description: 'Full audit history for regulatory compliance.', highlight: false },
  { icon: Clock, title: 'Lifecycle Management', description: 'Track contract stages from draft to signed.', highlight: false },
  { icon: BarChart3, title: 'Contract Analytics', description: 'Insights on contract value and performance.', highlight: false }
];
const contractsFloatingIcons = [
  { Icon: FileText, top: '8%', left: '4%', delay: '0s', duration: '22s' },
  { Icon: FileSignature, top: '18%', right: '6%', delay: '1.5s', duration: '19s' },
  { Icon: Shield, top: '60%', left: '5%', delay: '3s', duration: '21s' },
  { Icon: Layers, top: '70%', right: '4%', delay: '0.5s', duration: '18s' },
];
import ContractStatsGrid from '@/components/contracts/ContractStatsGrid';
import RecentContractsCard from '@/components/contracts/RecentContractsCard';
import ActivityFeed from '@/components/dashboard/ActivityFeed';

type ViewMode = 'buyer' | 'seller';

interface ContractPreviewPageProps {
  contractId?: string;
}

const ContractPreviewPage: React.FC<ContractPreviewPageProps> = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // View mode from query params or default to buyer
  const initialView = (searchParams.get('view') as ViewMode) || 'buyer';
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);

  // Mock contract data - would come from API
  const contract = {
    id: id || 'CNT-2024-001',
    title: 'Annual Maintenance Service Agreement',
    status: 'in_force',
    type: 'Service Contract',
    value: 150000,
    currency: 'INR',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    buyer: {
      name: 'Acme Corporation',
      contact: 'John Smith',
      email: 'john@acme.com',
      phone: '+91 98765 43210'
    },
    seller: {
      name: 'TechServices Ltd',
      contact: 'Sarah Johnson',
      email: 'sarah@techservices.com',
      phone: '+91 98765 43211'
    },
    terms: [
      'Monthly preventive maintenance visits',
      '24/7 emergency support hotline',
      'Annual equipment inspection',
      'Parts replacement at discounted rates'
    ],
    milestones: [
      { name: 'Q1 Review', date: '2024-03-31', status: 'completed' },
      { name: 'Q2 Review', date: '2024-06-30', status: 'completed' },
      { name: 'Q3 Review', date: '2024-09-30', status: 'pending' },
      { name: 'Q4 Review', date: '2024-12-31', status: 'pending' }
    ]
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
      draft: { bg: `${colors.utility.secondaryText}20`, text: colors.utility.secondaryText, icon: FileText },
      sent: { bg: `${colors.brand.primary}20`, text: colors.brand.primary, icon: Clock },
      negotiation: { bg: `${colors.semantic.warning}20`, text: colors.semantic.warning, icon: AlertCircle },
      in_force: { bg: `${colors.semantic.success}20`, text: colors.semantic.success, icon: CheckCircle },
      completed: { bg: `${colors.brand.tertiary}20`, text: colors.brand.tertiary, icon: CheckCircle }
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <span
        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
        style={{ backgroundColor: config.bg, color: config.text }}
      >
        <Icon size={16} className="mr-1.5" />
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    );
  };

  // Get the relevant party based on view mode
  const primaryParty = viewMode === 'buyer' ? contract.buyer : contract.seller;
  const secondaryParty = viewMode === 'buyer' ? contract.seller : contract.buyer;
  const primaryLabel = viewMode === 'buyer' ? 'Buyer' : 'Seller';
  const secondaryLabel = viewMode === 'buyer' ? 'Seller' : 'Buyer';

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Header */}
      <div
        className="border-b sticky top-0 z-10"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.primaryText}20`
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: `${colors.utility.primaryText}10` }}
              >
                <ArrowLeft size={20} style={{ color: colors.utility.primaryText }} />
              </button>
              <div>
                <h1
                  className="text-xl font-bold"
                  style={{ color: colors.utility.primaryText }}
                >
                  Contract Preview
                </h1>
                <p
                  className="text-sm"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {contract.id} • {contract.type}
                </p>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-4">
              <div
                className="flex rounded-lg p-1"
                style={{ backgroundColor: `${colors.utility.primaryText}10` }}
              >
                <button
                  onClick={() => setViewMode('buyer')}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-all"
                  style={{
                    backgroundColor: viewMode === 'buyer' ? colors.brand.primary : 'transparent',
                    color: viewMode === 'buyer' ? '#fff' : colors.utility.primaryText
                  }}
                >
                  <User size={16} className="inline mr-2" />
                  Buyer View
                </button>
                <button
                  onClick={() => setViewMode('seller')}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-all"
                  style={{
                    backgroundColor: viewMode === 'seller' ? colors.brand.primary : 'transparent',
                    color: viewMode === 'seller' ? '#fff' : colors.utility.primaryText
                  }}
                >
                  <Building2 size={16} className="inline mr-2" />
                  Seller View
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  className="p-2 rounded-lg transition-colors hover:opacity-80"
                  style={{ backgroundColor: `${colors.utility.primaryText}10` }}
                  title="Download PDF"
                >
                  <Download size={20} style={{ color: colors.utility.primaryText }} />
                </button>
                <button
                  className="p-2 rounded-lg transition-colors hover:opacity-80"
                  style={{ backgroundColor: `${colors.utility.primaryText}10` }}
                  title="Print"
                >
                  <Printer size={20} style={{ color: colors.utility.primaryText }} />
                </button>
                <button
                  className="p-2 rounded-lg transition-colors hover:opacity-80"
                  style={{ backgroundColor: `${colors.utility.primaryText}10` }}
                  title="Share"
                >
                  <Share2 size={20} style={{ color: colors.utility.primaryText }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Contract Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contract Header Card */}
            <div
              className="rounded-lg border p-6"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}20`
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2
                    className="text-2xl font-bold mb-2"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {contract.title}
                  </h2>
                  {getStatusBadge(contract.status)}
                </div>
                <div className="text-right">
                  <p
                    className="text-3xl font-bold"
                    style={{ color: colors.semantic.success }}
                  >
                    ₹{contract.value.toLocaleString()}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Contract Value
                  </p>
                </div>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-2 gap-6 mt-6">
                {/* Primary Party (based on view) */}
                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: `${colors.brand.primary}10` }}
                >
                  <p
                    className="text-xs font-medium uppercase tracking-wider mb-2"
                    style={{ color: colors.brand.primary }}
                  >
                    {primaryLabel} (You)
                  </p>
                  <p
                    className="font-semibold"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {primaryParty.name}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {primaryParty.contact}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {primaryParty.email}
                  </p>
                </div>

                {/* Secondary Party */}
                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: `${colors.utility.primaryText}05` }}
                >
                  <p
                    className="text-xs font-medium uppercase tracking-wider mb-2"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {secondaryLabel}
                  </p>
                  <p
                    className="font-semibold"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {secondaryParty.name}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {secondaryParty.contact}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {secondaryParty.email}
                  </p>
                </div>
              </div>

              {/* Duration */}
              <div
                className="flex items-center gap-6 mt-6 pt-6 border-t"
                style={{ borderColor: `${colors.utility.primaryText}10` }}
              >
                <div className="flex items-center gap-2">
                  <Calendar size={18} style={{ color: colors.utility.secondaryText }} />
                  <div>
                    <p
                      className="text-xs"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Start Date
                    </p>
                    <p
                      className="font-medium"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {new Date(contract.startDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div
                  className="h-8 w-px"
                  style={{ backgroundColor: `${colors.utility.primaryText}20` }}
                />
                <div className="flex items-center gap-2">
                  <Calendar size={18} style={{ color: colors.utility.secondaryText }} />
                  <div>
                    <p
                      className="text-xs"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      End Date
                    </p>
                    <p
                      className="font-medium"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {new Date(contract.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div
              className="rounded-lg border p-6"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}20`
              }}
            >
              <h3
                className="text-lg font-semibold mb-4"
                style={{ color: colors.utility.primaryText }}
              >
                Terms & Conditions
              </h3>
              <ul className="space-y-3">
                {contract.terms.map((term, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle
                      size={18}
                      className="mt-0.5 flex-shrink-0"
                      style={{ color: colors.semantic.success }}
                    />
                    <span style={{ color: colors.utility.primaryText }}>{term}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Milestones */}
            <div
              className="rounded-lg border p-6"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}20`
              }}
            >
              <h3
                className="text-lg font-semibold mb-4"
                style={{ color: colors.utility.primaryText }}
              >
                Milestones
              </h3>
              <div className="space-y-4">
                {contract.milestones.map((milestone, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: `${colors.utility.primaryText}05` }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: milestone.status === 'completed'
                            ? `${colors.semantic.success}20`
                            : `${colors.utility.secondaryText}20`
                        }}
                      >
                        {milestone.status === 'completed' ? (
                          <CheckCircle size={16} style={{ color: colors.semantic.success }} />
                        ) : (
                          <Clock size={16} style={{ color: colors.utility.secondaryText }} />
                        )}
                      </div>
                      <span style={{ color: colors.utility.primaryText }}>{milestone.name}</span>
                    </div>
                    <span
                      className="text-sm"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {new Date(milestone.date).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Activity & Stats */}
          <div className="space-y-6">
            {/* Contract Stats - Reusing existing component */}
            <ContractStatsGrid
              contractStats={{
                draft: 0,
                sent: 0,
                negotiation: 0,
                inForce: 1,
                completed: 0
              }}
              contactId={contract.id}
            />

            {/* Activity Feed - Reusing existing component */}
            <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
};

const ContractPreviewPageWithComingSoon: React.FC = () => (
  <ComingSoonWrapper pageKey="contracts" title="Contract Management" subtitle="End-to-end contract lifecycle management." heroIcon={FileText} features={contractsFeatures} floatingIcons={contractsFloatingIcons}>
    <ContractPreviewPage />
  </ComingSoonWrapper>
);

export default ContractPreviewPageWithComingSoon;
