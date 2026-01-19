// src/pages/settings/businessmodel/tenants/Subscription/Credits.tsx
// Business Model Phase 4 - Step 3: Credit Manager
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MessageSquare,
  Mail,
  Phone,
  CreditCard,
  Package,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  Zap
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useCreditBalance,
  useTopupPacks,
  CreditBalance,
  TopupPack
} from '@/hooks/queries/useBusinessModelQueries';

// Channel icons mapping
const getChannelIcon = (channel: string | undefined, creditType: string) => {
  const type = channel?.toLowerCase() || creditType?.toLowerCase() || '';

  if (type.includes('whatsapp')) {
    return <MessageSquare className="h-5 w-5" />;
  }
  if (type.includes('sms')) {
    return <Phone className="h-5 w-5" />;
  }
  if (type.includes('email')) {
    return <Mail className="h-5 w-5" />;
  }
  return <Zap className="h-5 w-5" />;
};

// Channel display name
const getChannelName = (channel: string | undefined, creditType: string) => {
  const type = channel?.toLowerCase() || creditType?.toLowerCase() || '';

  if (type.includes('whatsapp')) return 'WhatsApp';
  if (type.includes('sms')) return 'SMS';
  if (type.includes('email')) return 'Email';
  if (type.includes('notification')) return 'Notifications';
  return creditType || 'Credits';
};

// Format expiry date
const formatExpiry = (expiresAt: string | null | undefined): string => {
  if (!expiresAt) return 'Never expires';

  const date = new Date(expiresAt);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return 'Expired';
  if (daysUntilExpiry === 0) return 'Expires today';
  if (daysUntilExpiry === 1) return 'Expires tomorrow';
  if (daysUntilExpiry <= 7) return `Expires in ${daysUntilExpiry} days`;

  return `Expires ${date.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })}`;
};

const CreditsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Fetch credit balances
  const {
    data: creditData,
    isLoading: creditsLoading,
    error: creditsError
  } = useCreditBalance();

  // Fetch available topup packs
  const {
    data: topupData,
    isLoading: topupLoading,
    error: topupError
  } = useTopupPacks(undefined, 'notification');

  const handleBack = () => {
    navigate('/businessmodel/tenants/subscription');
  };

  const handleBuyPack = (pack: TopupPack) => {
    // For now, just log - will integrate with payment gateway later
    console.log('Buying pack:', pack);
    // TODO: Integrate with payment flow
    alert(`Purchase ${pack.name} for ${pack.currency} ${pack.price}`);
  };

  // Group balances by credit type
  const balances = creditData?.balances || [];
  const totalCredits = creditData?.total_notification_credits || 0;

  return (
    <div
      className="p-6 transition-colors min-h-screen"
      style={{ backgroundColor: `${colors.utility.secondaryText}10` }}
    >
      {/* Page Header */}
      <div className="flex items-center mb-8">
        <button
          onClick={handleBack}
          className="mr-4 p-2 rounded-full transition-colors hover:opacity-80"
          style={{ backgroundColor: `${colors.utility.secondaryText}20` }}
        >
          <ArrowLeft
            className="h-5 w-5"
            style={{ color: colors.utility.secondaryText }}
          />
        </button>
        <div>
          <h1
            className="text-2xl font-bold transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Credit Manager
          </h1>
          <p
            className="transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            Manage your notification credits across all channels
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Credit Balances */}
        <div className="lg:col-span-2 space-y-6">
          {/* Total Credits Summary */}
          <div
            className="rounded-lg border overflow-hidden transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <div
              className="px-6 py-4 border-b transition-colors"
              style={{
                backgroundColor: `${colors.brand.primary}10`,
                borderBottomColor: `${colors.utility.primaryText}20`
              }}
            >
              <div className="flex items-center justify-between">
                <h2
                  className="text-lg font-semibold transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  Total Notification Credits
                </h2>
                <div
                  className="text-3xl font-bold"
                  style={{ color: colors.brand.primary }}
                >
                  {creditsLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    totalCredits.toLocaleString()
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Credit Balances by Channel */}
          <div
            className="rounded-lg border overflow-hidden transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <div
              className="px-6 py-4 border-b transition-colors"
              style={{
                backgroundColor: `${colors.utility.secondaryText}10`,
                borderBottomColor: `${colors.utility.primaryText}20`
              }}
            >
              <h2
                className="text-lg font-semibold transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Credit Balances by Channel
              </h2>
            </div>

            <div className="p-6">
              {creditsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2
                    className="h-6 w-6 animate-spin"
                    style={{ color: colors.brand.primary }}
                  />
                  <span
                    className="ml-2"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Loading credit balances...
                  </span>
                </div>
              ) : creditsError || balances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${colors.utility.secondaryText}20` }}
                  >
                    <CreditCard
                      className="h-8 w-8"
                      style={{ color: colors.utility.secondaryText }}
                    />
                  </div>
                  <h3
                    className="text-lg font-medium mb-2"
                    style={{ color: colors.utility.primaryText }}
                  >
                    No Credits Available
                  </h3>
                  <p
                    className="text-sm mb-6 max-w-sm"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {creditsError
                      ? 'Unable to load credit balances. Please try again later.'
                      : 'You don\'t have any notification credits yet. Purchase a pack below to get started.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {balances.map((balance: CreditBalance, index: number) => {
                    const isLow = balance.balance < 50;
                    const isExpiring = balance.expires_at &&
                      new Date(balance.expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

                    return (
                      <div
                        key={`${balance.credit_type}-${balance.channel || index}`}
                        className="flex items-center justify-between p-4 rounded-lg border transition-colors"
                        style={{
                          borderColor: isLow
                            ? `${colors.semantic.error}40`
                            : `${colors.utility.primaryText}20`,
                          backgroundColor: isLow
                            ? `${colors.semantic.error}05`
                            : 'transparent'
                        }}
                      >
                        <div className="flex items-center space-x-4">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: `${colors.brand.primary}20`,
                              color: colors.brand.primary
                            }}
                          >
                            {getChannelIcon(balance.channel, balance.credit_type)}
                          </div>
                          <div>
                            <div
                              className="font-medium"
                              style={{ color: colors.utility.primaryText }}
                            >
                              {getChannelName(balance.channel, balance.credit_type)}
                            </div>
                            <div
                              className="text-sm"
                              style={{
                                color: isExpiring
                                  ? colors.semantic.warning || '#F59E0B'
                                  : colors.utility.secondaryText
                              }}
                            >
                              {formatExpiry(balance.expires_at)}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className="text-2xl font-bold"
                            style={{
                              color: isLow
                                ? colors.semantic.error
                                : colors.utility.primaryText
                            }}
                          >
                            {balance.balance.toLocaleString()}
                          </div>
                          <div
                            className="text-sm"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            credits
                          </div>
                          {isLow && (
                            <div
                              className="flex items-center text-xs mt-1"
                              style={{ color: colors.semantic.error }}
                            >
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Low balance
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Topup Packs */}
        <div className="space-y-6">
          <div
            className="rounded-lg border overflow-hidden transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <div
              className="px-6 py-4 border-b transition-colors"
              style={{
                backgroundColor: `${colors.utility.secondaryText}10`,
                borderBottomColor: `${colors.utility.primaryText}20`
              }}
            >
              <h2
                className="text-lg font-semibold transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Buy Credits
              </h2>
            </div>

            <div className="p-4">
              {topupLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2
                    className="h-5 w-5 animate-spin"
                    style={{ color: colors.brand.primary }}
                  />
                  <span
                    className="ml-2 text-sm"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Loading packs...
                  </span>
                </div>
              ) : topupError || !topupData?.packs?.length ? (
                <div className="text-center py-8">
                  <Package
                    className="h-10 w-10 mx-auto mb-3"
                    style={{ color: colors.utility.secondaryText }}
                  />
                  <p
                    className="text-sm"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {topupError
                      ? 'Unable to load packs'
                      : 'No topup packs available'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topupData.packs.map((pack: TopupPack) => (
                    <div
                      key={pack.id}
                      className="p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer"
                      style={{
                        borderColor: `${colors.utility.primaryText}20`,
                        backgroundColor: 'transparent'
                      }}
                      onClick={() => handleBuyPack(pack)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="font-medium"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {pack.name}
                        </div>
                        <div
                          className="text-lg font-bold"
                          style={{ color: colors.brand.primary }}
                        >
                          {pack.currency} {pack.price}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div
                          className="text-sm"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          {pack.quantity.toLocaleString()} credits
                        </div>
                        {pack.expiry_days && (
                          <div
                            className="text-xs"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            Valid for {pack.expiry_days} days
                          </div>
                        )}
                      </div>
                      <button
                        className="w-full mt-3 px-4 py-2 rounded-md transition-colors hover:opacity-90 flex items-center justify-center text-sm font-medium"
                        style={{
                          backgroundColor: colors.brand.primary,
                          color: 'white'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuyPack(pack);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Buy Now
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Help Card */}
          <div
            className="rounded-lg border overflow-hidden transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <div className="p-4">
              <div className="flex items-start space-x-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: `${colors.brand.primary}20`,
                    color: colors.brand.primary
                  }}
                >
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3
                    className="font-medium mb-1"
                    style={{ color: colors.utility.primaryText }}
                  >
                    How credits work
                  </h3>
                  <ul
                    className="text-sm space-y-1"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    <li>1 credit = 1 notification</li>
                    <li>Credits are used per channel</li>
                    <li>Unused credits don't expire*</li>
                    <li>Bulk packs offer better value</li>
                  </ul>
                  <p
                    className="text-xs mt-2"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    *Unless specified in pack terms
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditsPage;
