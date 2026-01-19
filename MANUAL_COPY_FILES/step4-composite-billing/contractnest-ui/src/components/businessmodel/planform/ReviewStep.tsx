// src/components/businessmodel/planform/ReviewStep.tsx
// Business Model Phase 4 - Step 4: Review & Publish Step
import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  Package,
  DollarSign,
  Users,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Layers
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { getCurrencySymbol } from '@/utils/constants/currencies';

interface ReviewStepProps {
  isEditMode?: boolean;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ isEditMode = false }) => {
  const { watch } = useFormContext();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Watch all form values
  const productCode = watch('productCode');
  const name = watch('name');
  const description = watch('description');
  const planType = watch('planType');
  const trialDuration = watch('trialDuration');
  const isVisible = watch('isVisible');
  const defaultCurrencyCode = watch('defaultCurrencyCode');
  const supportedCurrencies = watch('supportedCurrencies') || [];
  const tiers = watch('tiers') || [];
  const features = watch('features') || [];
  const notifications = watch('notifications') || [];

  // Format price with currency symbol
  const formatPrice = (price: number, currency: string): string => {
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${price.toLocaleString()}`;
  };

  // Get tier label
  const getTierLabel = (tier: any, index: number): string => {
    if (tier.label) return tier.label;
    const unit = planType === 'Per User' ? 'users' : 'contracts';
    if (tier.maxValue === null) {
      return `${tier.minValue}+ ${unit}`;
    }
    return `${tier.minValue}-${tier.maxValue} ${unit}`;
  };

  // Count enabled features
  const enabledFeatures = features.filter((f: any) => f.enabled);
  const specialFeatures = features.filter((f: any) => f.is_special_feature && f.enabled);

  // Count enabled notifications
  const enabledNotifications = notifications.filter((n: any) => n.enabled);

  // Calculate total credits per unit
  const totalCreditsPerUnit = enabledNotifications.reduce(
    (sum: number, n: any) => sum + (n.credits_per_unit || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Edit Mode Notice */}
      {isEditMode && (
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: `${colors.brand.primary}10`,
            borderColor: `${colors.brand.primary}20`
          }}
        >
          <div className="flex items-start">
            <AlertCircle
              className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5"
              style={{ color: colors.brand.primary }}
            />
            <div>
              <p
                className="text-sm font-medium"
                style={{ color: colors.brand.primary }}
              >
                Creating New Plan Version
              </p>
              <p
                className="mt-1 text-sm"
                style={{ color: colors.brand.primary }}
              >
                Review your changes below. Saving will create a new version of this plan.
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className="text-sm"
        style={{ color: colors.utility.secondaryText }}
      >
        Review your plan configuration before {isEditMode ? 'saving changes' : 'creating the plan'}.
      </div>

      {/* Plan Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Information */}
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}20`
          }}
        >
          <div className="flex items-center mb-3">
            <Package
              className="h-5 w-5 mr-2"
              style={{ color: colors.brand.primary }}
            />
            <h3
              className="font-semibold"
              style={{ color: colors.utility.primaryText }}
            >
              Basic Information
            </h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: colors.utility.secondaryText }}>Product</span>
              <span
                className="font-medium"
                style={{ color: colors.utility.primaryText }}
              >
                {productCode || 'Not selected'}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: colors.utility.secondaryText }}>Plan Name</span>
              <span
                className="font-medium"
                style={{ color: colors.utility.primaryText }}
              >
                {name || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: colors.utility.secondaryText }}>Plan Type</span>
              <span
                className="font-medium"
                style={{ color: colors.utility.primaryText }}
              >
                {planType}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: colors.utility.secondaryText }}>Trial Duration</span>
              <span
                className="font-medium"
                style={{ color: colors.utility.primaryText }}
              >
                {trialDuration} days
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: colors.utility.secondaryText }}>Visibility</span>
              <span
                className="font-medium flex items-center"
                style={{ color: isVisible ? colors.semantic.success : colors.utility.secondaryText }}
              >
                {isVisible ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Visible
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-1" />
                    Hidden
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Summary */}
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}20`
          }}
        >
          <div className="flex items-center mb-3">
            <DollarSign
              className="h-5 w-5 mr-2"
              style={{ color: colors.brand.primary }}
            />
            <h3
              className="font-semibold"
              style={{ color: colors.utility.primaryText }}
            >
              Pricing
            </h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: colors.utility.secondaryText }}>Default Currency</span>
              <span
                className="font-medium"
                style={{ color: colors.utility.primaryText }}
              >
                {defaultCurrencyCode}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: colors.utility.secondaryText }}>Supported Currencies</span>
              <span
                className="font-medium"
                style={{ color: colors.utility.primaryText }}
              >
                {supportedCurrencies.length} currencies
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: colors.utility.secondaryText }}>Pricing Tiers</span>
              <span
                className="font-medium"
                style={{ color: colors.utility.primaryText }}
              >
                {tiers.length} tier{tiers.length !== 1 ? 's' : ''}
              </span>
            </div>
            {tiers.length > 0 && (
              <div
                className="mt-2 pt-2 border-t"
                style={{ borderColor: `${colors.utility.primaryText}10` }}
              >
                <div
                  className="text-xs mb-1"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Starting at ({defaultCurrencyCode}):
                </div>
                <div
                  className="text-lg font-bold"
                  style={{ color: colors.brand.primary }}
                >
                  {formatPrice(tiers[0]?.prices?.[defaultCurrencyCode] || 0, defaultCurrencyCode)}
                  <span
                    className="text-sm font-normal ml-1"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    /{planType === 'Per User' ? 'user' : 'contract'}/month
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Summary */}
      <div
        className="rounded-lg border p-4"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.primaryText}20`
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Layers
              className="h-5 w-5 mr-2"
              style={{ color: colors.brand.primary }}
            />
            <h3
              className="font-semibold"
              style={{ color: colors.utility.primaryText }}
            >
              Features
            </h3>
          </div>
          <span
            className="text-sm px-2 py-1 rounded-full"
            style={{
              backgroundColor: `${colors.brand.primary}20`,
              color: colors.brand.primary
            }}
          >
            {enabledFeatures.length} enabled
          </span>
        </div>

        {enabledFeatures.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {enabledFeatures.slice(0, 6).map((feature: any, index: number) => (
              <div
                key={feature.feature_id || index}
                className="flex items-center text-sm"
              >
                <CheckCircle
                  className="h-4 w-4 mr-2 flex-shrink-0"
                  style={{ color: colors.semantic.success }}
                />
                <span style={{ color: colors.utility.primaryText }}>
                  {feature.name || feature.feature_id}
                </span>
                {feature.limit && feature.limit !== -1 && (
                  <span
                    className="ml-1"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    ({feature.limit === 0 ? 'Unlimited' : feature.limit})
                  </span>
                )}
              </div>
            ))}
            {enabledFeatures.length > 6 && (
              <div
                className="text-sm"
                style={{ color: colors.utility.secondaryText }}
              >
                +{enabledFeatures.length - 6} more features
              </div>
            )}
          </div>
        ) : (
          <div
            className="text-sm text-center py-4"
            style={{ color: colors.utility.secondaryText }}
          >
            No features configured
          </div>
        )}

        {specialFeatures.length > 0 && (
          <div
            className="mt-3 pt-3 border-t"
            style={{ borderColor: `${colors.utility.primaryText}10` }}
          >
            <div
              className="text-xs mb-2"
              style={{ color: colors.utility.secondaryText }}
            >
              Premium Add-ons:
            </div>
            <div className="flex flex-wrap gap-2">
              {specialFeatures.map((feature: any, index: number) => (
                <span
                  key={feature.feature_id || index}
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: `${colors.semantic.warning}20`,
                    color: colors.semantic.warning || '#F59E0B'
                  }}
                >
                  {feature.name || feature.feature_id}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notifications/Credits Summary */}
      <div
        className="rounded-lg border p-4"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.primaryText}20`
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Bell
              className="h-5 w-5 mr-2"
              style={{ color: colors.brand.primary }}
            />
            <h3
              className="font-semibold"
              style={{ color: colors.utility.primaryText }}
            >
              Notification Credits
            </h3>
          </div>
          <span
            className="text-sm px-2 py-1 rounded-full"
            style={{
              backgroundColor: `${colors.brand.primary}20`,
              color: colors.brand.primary
            }}
          >
            {totalCreditsPerUnit} credits/{planType === 'Per User' ? 'user' : 'contract'}
          </span>
        </div>

        {enabledNotifications.length > 0 ? (
          <div className="space-y-2">
            {enabledNotifications.map((notification: any, index: number) => (
              <div
                key={`${notification.notif_type}-${notification.category}-${index}`}
                className="flex items-center justify-between text-sm p-2 rounded"
                style={{ backgroundColor: `${colors.utility.secondaryText}10` }}
              >
                <div className="flex items-center">
                  <CheckCircle
                    className="h-4 w-4 mr-2"
                    style={{ color: colors.semantic.success }}
                  />
                  <span style={{ color: colors.utility.primaryText }}>
                    {notification.notif_type} ({notification.category})
                  </span>
                </div>
                <div
                  className="font-medium"
                  style={{ color: colors.utility.primaryText }}
                >
                  {notification.credits_per_unit} credits
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="text-sm text-center py-4"
            style={{ color: colors.utility.secondaryText }}
          >
            No notification credits configured
          </div>
        )}
      </div>

      {/* Final Confirmation */}
      <div
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: `${colors.semantic.success}10`,
          borderColor: `${colors.semantic.success}30`
        }}
      >
        <div className="flex items-start">
          <FileText
            className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5"
            style={{ color: colors.semantic.success }}
          />
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: colors.semantic.success }}
            >
              Ready to {isEditMode ? 'Save Changes' : 'Create Plan'}
            </p>
            <p
              className="mt-1 text-sm"
              style={{ color: colors.semantic.success }}
            >
              {isEditMode
                ? 'Click "Save Changes" to create a new version of this plan with your modifications.'
                : 'Click "Create Plan" to publish this pricing plan. You can edit it later if needed.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewStep;
