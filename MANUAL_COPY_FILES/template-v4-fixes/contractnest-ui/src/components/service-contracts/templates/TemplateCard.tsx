// src/components/service-contracts/templates/TemplateCard.tsx
// Redesigned to match Catalog Studio card UX with tenant-branded background

import React, { useMemo } from 'react';
import {
  Eye,
  Users,
  Clock,
  FileText,
  FilePlus2,
  Globe,
  Edit,
  Copy,
  Star,
  Settings,
  Wrench,
  Building2,
  TrendingUp,
  Tag,
  // Industry icons – imported statically for mapping
  Stethoscope,
  DollarSign,
  Factory,
  ShoppingBag,
  Cpu,
  GraduationCap,
  Landmark,
  Heart,
  Briefcase,
  Phone,
  Truck,
  Zap,
  Construction,
  UtensilsCrossed,
  Film,
  Wheat,
  Pill,
  Car,
  Plane,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useTenantProfile } from '../../../hooks/useTenantProfile';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  Template,
  TemplateCardProps,
  CONTRACT_TYPE_LABELS,
  TEMPLATE_COMPLEXITY_LABELS,
  TemplateCardContext,
} from '../../../types/service-contracts/template';
import { industries } from '../../../lib/constants/industries';

// =================================================================
// ICON MAP — maps industry icon string → Lucide component
// =================================================================
const INDUSTRY_ICON_MAP: Record<string, LucideIcon> = {
  Stethoscope,
  DollarSign,
  Factory,
  ShoppingBag,
  Cpu,
  GraduationCap,
  Landmark,
  Heart,
  Briefcase,
  Phone,
  Truck,
  Zap,
  Construction,
  UtensilsCrossed,
  Film,
  Wheat,
  Pill,
  Car,
  Plane,
  MoreHorizontal,
};

// =================================================================
// HELPER — opacity util (same pattern as catalog-studio reference)
// =================================================================
const withOpacity = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// =================================================================
// MAIN COMPONENT
// =================================================================
const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onClick,
  onPreview,
  onSelect,
  onEdit,
  onSettings,
  isSelected = false,
  showActions = true,
  compact = false,
  context,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { profile: tenantProfile } = useTenantProfile();

  // ── Tenant brand colors (same as catalog-studio reference) ──
  const tenantPrimary = tenantProfile?.primary_color || '#667eea';

  // Default context
  const cardContext: TemplateCardContext = context || {
    mode: 'selection',
    isGlobal: template.globalTemplate,
    userRole: 'user',
    canEdit: !template.globalTemplate,
    canCopy: true,
    canCreateContract: true,
  };

  // ── Resolve industry info (primary + all tags) ──
  const industryInfo = useMemo(() => {
    const match = industries.find((ind) => ind.id === template.industry);
    if (!match) return { name: template.industry, Icon: MoreHorizontal };
    const Icon = INDUSTRY_ICON_MAP[match.icon] || MoreHorizontal;
    return { name: match.name, Icon };
  }, [template.industry]);

  // Resolve all industry tags to display names
  const allIndustryNames = useMemo(() => {
    const tags = template.industryTags || [template.industry];
    return tags.map((tagId) => {
      const match = industries.find((ind) => ind.id === tagId);
      return match ? match.name : tagId;
    });
  }, [template.industryTags, template.industry]);

  // ── Status color ──
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.semantic?.success || '#10B981';
      case 'draft':
        return colors.semantic?.warning || '#F59E0B';
      case 'archived':
        return colors.utility.secondaryText;
      default:
        return colors.utility.secondaryText;
    }
  };

  // ── Complexity color ──
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple':
        return '#10B981';
      case 'medium':
        return '#F59E0B';
      case 'complex':
        return '#EF4444';
      default:
        return colors.utility.secondaryText;
    }
  };

  // ── Action handler ──
  const handleAction = (actionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    switch (actionId) {
      case 'preview':
        onPreview?.(template);
        break;
      case 'select':
      case 'create-contract':
        onSelect?.(template);
        break;
      case 'edit':
        onEdit?.(template);
        break;
      case 'settings':
        onSettings?.(template);
        break;
      case 'smart-form':
        console.log('Smart Form for template:', template.id);
        break;
      case 'clone':
        console.log('Clone template:', template.id);
        break;
      default:
        break;
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) onClick(template);
  };

  const statusColor = getStatusColor(template.status);
  const complexityColor = getComplexityColor(template.complexity);
  const contractTypeLabel = CONTRACT_TYPE_LABELS[template.contractType] || template.contractType;
  const complexityLabel = TEMPLATE_COMPLEXITY_LABELS[template.complexity] || template.complexity;
  const IndustryIcon = industryInfo.Icon;

  // ── Reusable tooltip icon button ──
  // accentColor: use a distinct color for special actions (e.g. Create Contract)
  const TooltipIconButton = ({
    tooltip,
    icon: Icon,
    actionId,
    disabled = false,
    accentColor,
  }: {
    tooltip: string;
    icon: LucideIcon;
    actionId: string;
    disabled?: boolean;
    accentColor?: string; // distinct color for this button (default uses secondaryText → tenantPrimary hover)
  }) => {
    const baseColor = accentColor || colors.utility.secondaryText;
    const hoverBg = accentColor ? withOpacity(accentColor, 0.15) : withOpacity(tenantPrimary, 0.1);
    const hoverColor = accentColor || tenantPrimary;
    const borderBase = accentColor ? withOpacity(accentColor, 0.4) : colors.utility.secondaryText + '30';
    const hoverBorder = accentColor ? withOpacity(accentColor, 0.5) : withOpacity(tenantPrimary, 0.3);

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => handleAction(actionId, e)}
            disabled={disabled}
            className="p-2 rounded-lg border transition-colors disabled:opacity-40"
            style={{
              borderColor: borderBase,
              color: baseColor,
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                (e.currentTarget as HTMLElement).style.backgroundColor = hoverBg;
                (e.currentTarget as HTMLElement).style.color = hoverColor;
                (e.currentTarget as HTMLElement).style.borderColor = hoverBorder;
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLElement).style.color = baseColor;
              (e.currentTarget as HTMLElement).style.borderColor = borderBase;
            }}
          >
            <Icon className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  };

  // =================================================================
  // COMPACT / LIST VIEW
  // =================================================================
  if (compact) {
    return (
      <TooltipProvider delayDuration={200}>
        <div
          onClick={handleCardClick}
          className="p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer group"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: isSelected ? tenantPrimary : colors.utility.secondaryText + '20',
            boxShadow: isSelected ? `0 0 0 2px ${withOpacity(tenantPrimary, 0.4)}` : undefined,
          }}
        >
          <div className="flex items-center gap-4">
            {/* Industry Icon */}
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: withOpacity(tenantPrimary, 0.12) }}
            >
              <IndustryIcon className="w-6 h-6" style={{ color: tenantPrimary }} />
            </div>

            {/* Title + Badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3
                  className="font-semibold text-sm truncate"
                  style={{ color: colors.utility.primaryText }}
                >
                  {template.name}
                </h3>
                {template.globalTemplate && (
                  <Globe className="w-4 h-4 flex-shrink-0" style={{ color: tenantPrimary }} />
                )}
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full capitalize flex-shrink-0 font-medium"
                  style={{
                    backgroundColor: `${statusColor}20`,
                    color: statusColor,
                  }}
                >
                  {template.status}
                </span>
              </div>
              <p
                className="text-xs truncate mt-0.5"
                style={{ color: colors.utility.secondaryText }}
              >
                {template.description}
              </p>
              {/* Industry + resource badges */}
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-[10px] flex items-center gap-1"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <IndustryIcon className="w-3 h-3" />
                  {industryInfo.name}
                </span>
                {template.isEquipmentBased && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-medium"
                    style={{ backgroundColor: '#F59E0B20', color: '#F59E0B' }}
                  >
                    <Wrench className="w-3 h-3" />
                    Equipment
                  </span>
                )}
                {template.isFacilityBased && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-medium"
                    style={{ backgroundColor: '#8B5CF620', color: '#8B5CF6' }}
                  >
                    <Building2 className="w-3 h-3" />
                    Facility
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div
              className="flex items-center gap-5 text-xs flex-shrink-0"
              style={{ color: colors.utility.secondaryText }}
            >
              {template.version && (
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  v{template.version}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {template.usageCount}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {template.estimatedDuration}
              </span>
            </div>

            {/* Action Icons */}
            {showActions && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <TooltipIconButton tooltip="Preview" icon={Eye} actionId="preview" />
                <TooltipIconButton tooltip="Duplicate" icon={Copy} actionId="clone" disabled={!cardContext.canCopy} />
                <TooltipIconButton tooltip="Edit" icon={Edit} actionId="edit" disabled={!cardContext.canEdit} />
                <TooltipIconButton tooltip="Smart Form" icon={FileText} actionId="smart-form" />
                <TooltipIconButton tooltip="Settings" icon={Settings} actionId="settings" disabled={!cardContext.canEdit} />
                <TooltipIconButton
                  tooltip="Create Contract"
                  icon={FilePlus2}
                  actionId="create-contract"
                  accentColor={colors.semantic?.success || '#10B981'}
                />
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // =================================================================
  // FULL / GRID VIEW CARD
  // =================================================================
  return (
    <TooltipProvider delayDuration={200}>
      <div
        onClick={handleCardClick}
        className="rounded-2xl border cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-transparent group overflow-hidden"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: isSelected ? tenantPrimary : colors.utility.secondaryText + '20',
          boxShadow: isSelected ? `0 0 0 2px ${withOpacity(tenantPrimary, 0.4)}` : undefined,
        }}
      >
        {/* ── Header with Tenant Gradient (matching catalog-studio reference) ── */}
        <div
          className="p-4 pb-3"
          style={{
            background: isDarkMode
              ? `linear-gradient(135deg, ${withOpacity(tenantPrimary, 0.15)} 0%, transparent 100%)`
              : `linear-gradient(135deg, ${withOpacity(tenantPrimary, 0.08)} 0%, transparent 100%)`,
          }}
        >
          <div className="flex items-start justify-between mb-3">
            {/* Industry Icon + Industry Tags */}
            <div className="flex items-center gap-2 flex-wrap">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: withOpacity(tenantPrimary, 0.15) }}
              >
                <IndustryIcon className="w-5 h-5" style={{ color: tenantPrimary }} />
              </div>
              {allIndustryNames.map((name, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ backgroundColor: withOpacity(tenantPrimary, 0.15), color: tenantPrimary }}
                >
                  {name}
                </span>
              ))}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {template.globalTemplate && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium"
                  style={{
                    backgroundColor: withOpacity(tenantPrimary, 0.15),
                    color: tenantPrimary,
                  }}
                >
                  <Globe className="w-3 h-3" />
                  Global
                </span>
              )}
              {template.isPopular && (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ backgroundColor: '#F59E0B20', color: '#F59E0B' }}
                >
                  <TrendingUp className="w-3 h-3" />
                  Popular
                </span>
              )}
              <span
                className="text-[10px] px-2 py-0.5 rounded-full capitalize font-medium"
                style={{
                  backgroundColor: `${statusColor}20`,
                  color: statusColor,
                }}
              >
                {template.status}
              </span>
            </div>
          </div>

          {/* Title + Description */}
          <h3
            className="font-bold text-lg mb-1.5 transition-colors line-clamp-1"
            style={{ color: colors.utility.primaryText }}
          >
            {template.name}
          </h3>
          <p
            className="text-sm line-clamp-2 leading-relaxed"
            style={{ color: colors.utility.secondaryText }}
          >
            {template.description}
          </p>
        </div>

        {/* ── Card Body ── */}
        <div className="px-4 pb-4">
          {/* Badges Row: Contract Type + Complexity + Equipment/Facility */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
              style={{
                backgroundColor: template.contractType === 'service' ? '#3B82F620' : '#8B5CF620',
                color: template.contractType === 'service' ? '#3B82F6' : '#8B5CF6',
                borderColor: template.contractType === 'service' ? '#3B82F630' : '#8B5CF630',
              }}
            >
              {contractTypeLabel}
            </span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
              style={{
                backgroundColor: `${complexityColor}20`,
                color: complexityColor,
                borderColor: `${complexityColor}30`,
              }}
            >
              {complexityLabel}
            </span>
            {template.isEquipmentBased && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5 font-medium border cursor-default"
                    style={{ backgroundColor: '#F59E0B15', color: '#D97706', borderColor: '#F59E0B30' }}
                  >
                    <Wrench className="w-3 h-3" />
                    Equipment
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Shared equipment included
                </TooltipContent>
              </Tooltip>
            )}
            {template.isFacilityBased && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5 font-medium border cursor-default"
                    style={{ backgroundColor: '#8B5CF615', color: '#7C3AED', borderColor: '#8B5CF630' }}
                  >
                    <Building2 className="w-3 h-3" />
                    Facility
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Shared facility included
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Tags */}
          {template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {template.tags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full text-[10px]"
                  style={{ backgroundColor: colors.utility.primaryBackground, color: colors.utility.secondaryText }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats Row */}
          <div
            className="flex items-end justify-between pt-3 border-t"
            style={{ borderColor: colors.utility.secondaryText + '15' }}
          >
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span style={{ color: colors.utility.primaryText }} className="font-semibold">
                  {template.rating.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center gap-1" style={{ color: colors.utility.secondaryText }}>
                <Users className="w-4 h-4" />
                <span>{template.usageCount}</span>
              </div>
              {template.version && (
                <div className="flex items-center gap-1" style={{ color: colors.utility.secondaryText }}>
                  <Tag className="w-3.5 h-3.5" />
                  <span className="text-xs">v{template.version}</span>
                </div>
              )}
            </div>
            <div
              className="flex items-center gap-3 text-xs"
              style={{ color: colors.utility.secondaryText }}
            >
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {template.estimatedDuration}
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer Actions — 6 icon buttons with tooltips (Create Contract in distinct color) ── */}
        {showActions && (
          <div
            className="flex items-center justify-center px-4 py-3 border-t"
            style={{
              borderColor: colors.utility.secondaryText + '15',
              backgroundColor: colors.utility.primaryBackground,
            }}
          >
            <div className="flex items-center gap-1.5">
              <TooltipIconButton tooltip="Preview" icon={Eye} actionId="preview" />
              <TooltipIconButton
                tooltip="Duplicate"
                icon={Copy}
                actionId="clone"
                disabled={!cardContext.canCopy}
              />
              <TooltipIconButton
                tooltip="Edit"
                icon={Edit}
                actionId="edit"
                disabled={!cardContext.canEdit}
              />
              <TooltipIconButton
                tooltip="Smart Form"
                icon={FileText}
                actionId="smart-form"
              />
              <TooltipIconButton
                tooltip="Settings"
                icon={Settings}
                actionId="settings"
                disabled={!cardContext.canEdit}
              />
              <TooltipIconButton
                tooltip="Create Contract"
                icon={FilePlus2}
                actionId="create-contract"
                accentColor={colors.semantic?.success || '#10B981'}
              />
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default TemplateCard;
