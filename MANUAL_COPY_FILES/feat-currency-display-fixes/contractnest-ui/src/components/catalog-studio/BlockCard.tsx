// src/components/catalog-studio/BlockCard.tsx
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Block, BlockCategory } from '../../types/catalogStudio';
import { stripHtml } from '../../utils/catalog-studio/htmlUtils';

interface BlockCardProps {
  block: Block;
  category: BlockCategory;
  onClick: () => void;
  onDoubleClick?: () => void;
  isSelected?: boolean;
  currency?: string; // When provided, show pricing for this currency's record
}

// Helper to get Lucide icon component by name
const getIconComponent = (iconName: string) => {
  const iconsMap = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; size?: number }>>;
  return iconsMap[iconName] || LucideIcons.Circle;
};

const formatCurrency = (amount: number, currency: string = 'INR') => {
  const symbols: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
  return `${symbols[currency] || currency}${amount.toLocaleString()}`;
};

const BlockCard: React.FC<BlockCardProps> = ({ block, category, onClick, onDoubleClick, isSelected, currency }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const IconComponent = getIconComponent(block.icon);

  // Extract pricing record - prefer matching currency when provided
  const pricingRecords = (block.meta?.pricingRecords || block.config?.pricingRecords || []) as Array<{
    currency: string; amount: number; tax_inclusion: 'inclusive' | 'exclusive';
    taxes: Array<{ id: string; name: string; rate: number }>; is_active: boolean;
  }>;
  const primaryRecord = currency
    ? pricingRecords.find(r => r.currency === currency && r.is_active !== false)
    : (pricingRecords.find(r => r.is_active !== false) || pricingRecords[0]);
  const taxes = primaryRecord?.taxes || [];
  const totalTaxRate = taxes.reduce((sum, t) => sum + t.rate, 0);
  const taxInclusion = primaryRecord?.tax_inclusion || 'exclusive';
  const basePrice = primaryRecord?.amount ?? block.price;

  // Calculate price breakdown
  const priceBreakdown = (() => {
    if (!basePrice || totalTaxRate === 0) return null;
    if (taxInclusion === 'inclusive') {
      const priceExTax = basePrice / (1 + totalTaxRate / 100);
      return { price: priceExTax, taxAmount: basePrice - priceExTax, total: basePrice };
    }
    const taxAmount = (basePrice * totalTaxRate) / 100;
    return { price: basePrice, taxAmount, total: basePrice + taxAmount };
  })();

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className="rounded-xl shadow-sm border-2 overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
      style={{
        backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
        borderColor: isSelected ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
        boxShadow: isSelected ? `0 0 0 1px ${colors.brand.primary}` : undefined
      }}
    >
      <div className="p-4 flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: category.bgColor }}
        >
          <IconComponent className="w-5 h-5" style={{ color: category.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-bold text-sm"
            style={{ color: colors.utility.primaryText }}
          >
            {block.name}
          </div>
          <div
            className="text-xs line-clamp-2"
            style={{ color: colors.utility.secondaryText }}
          >
            {stripHtml(block.description)}
          </div>
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className="flex flex-wrap gap-3 mb-2 text-xs" style={{ color: colors.utility.secondaryText }}>
          {basePrice != null && basePrice > 0 && (
            <span className="flex items-center gap-1">
              {priceBreakdown ? (
                <>
                  <strong style={{ color: colors.utility.primaryText }}>
                    {formatCurrency(Math.round(priceBreakdown.total), primaryRecord?.currency || block.currency)}
                  </strong>
                  <span style={{ color: colors.utility.secondaryText }}>
                    ({formatCurrency(Math.round(priceBreakdown.price), primaryRecord?.currency || block.currency)} + {formatCurrency(Math.round(priceBreakdown.taxAmount), primaryRecord?.currency || block.currency)} tax)
                  </span>
                </>
              ) : (
                <strong style={{ color: colors.utility.primaryText }}>
                  {formatCurrency(basePrice, primaryRecord?.currency || block.currency)}
                </strong>
              )}
            </span>
          )}
          {primaryRecord && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: taxInclusion === 'inclusive' ? `${colors.semantic.success}15` : `${colors.semantic.warning}15`,
                color: taxInclusion === 'inclusive' ? colors.semantic.success : colors.semantic.warning,
              }}
            >
              Tax {taxInclusion === 'inclusive' ? 'Incl' : 'Excl'}
            </span>
          )}
          {block.duration && (
            <span className="flex items-center gap-1">
              <LucideIcons.Clock className="w-3 h-3" />
              <strong style={{ color: colors.utility.primaryText }}>{block.duration}</strong> {block.durationUnit}
            </span>
          )}
          {block.meta?.stock !== undefined && (
            <span className="flex items-center gap-1">
              <LucideIcons.Package className="w-3 h-3" />
              <strong style={{ color: colors.utility.primaryText }}>{block.meta.stock}</strong> stock
            </span>
          )}
          {block.meta?.payments && (
            <span className="flex items-center gap-1">
              <LucideIcons.RefreshCw className="w-3 h-3" />
              <strong style={{ color: colors.utility.primaryText }}>{block.meta.payments}</strong> payments
            </span>
          )}
          {block.meta?.items && (
            <span className="flex items-center gap-1">
              <LucideIcons.List className="w-3 h-3" />
              <strong style={{ color: colors.utility.primaryText }}>{block.meta.items}</strong> items
            </span>
          )}
          {block.meta?.duration && (
            <span className="flex items-center gap-1">
              <LucideIcons.Clock className="w-3 h-3" />
              <strong style={{ color: colors.utility.primaryText }}>{block.meta.duration}</strong>
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {block.evidenceTags?.map((tag, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1"
              style={{
                backgroundColor: `${colors.semantic.success}20`,
                color: colors.semantic.success
              }}
            >
              <LucideIcons.Camera className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
          {block.tags.map((tag, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded"
              style={{
                backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
                color: colors.utility.secondaryText
              }}
            >
              {tag}
            </span>
          ))}
          {block.meta?.sku && (
            <span
              className="text-[10px] px-2 py-0.5 rounded"
              style={{
                backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
                color: colors.utility.secondaryText
              }}
            >
              SKU: {block.meta.sku}
            </span>
          )}
        </div>
      </div>
      <div
        className="px-4 py-2 border-t text-[10px]"
        style={{
          backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB',
          borderColor: isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
          color: colors.utility.secondaryText
        }}
      >
        {block.usage.templates > 0 && `${block.usage.templates} templates`}
        {block.usage.templates > 0 && block.usage.contracts > 0 && ' • '}
        {block.usage.contracts > 0 && `${block.usage.contracts} contracts`}
        {block.usage.templates === 0 && block.usage.contracts === 0 && (() => {
          const records = block.meta?.pricingRecords as Array<{ currency: string; is_active: boolean }> | undefined;
          if (records && records.length > 1) {
            const currencies = records
              .filter(r => r.is_active !== false)
              .map(r => {
                const sym: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' };
                return sym[r.currency] || r.currency;
              });
            const unique = [...new Set(currencies)];
            return (
              <span style={{ color: colors.brand.primary, fontWeight: 600 }}>
                {unique.join(' • ')}
              </span>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
};

export default BlockCard;
