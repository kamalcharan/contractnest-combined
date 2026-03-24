// src/components/service-contracts/templates/TemplateCard.tsx
// Redesigned to match Catalog Studio card UX

import React, { useState, useRef, useEffect } from 'react';
import {
  Eye,
  Users,
  Clock,
  FileText,
  CheckCircle,
  Globe,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  LayoutTemplate,
  Star,
  Calendar,
  Settings,
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  Template,
  TemplateCardProps,
  CONTRACT_TYPE_LABELS,
  TEMPLATE_COMPLEXITY_LABELS,
  TemplateCardContext,
} from '../../../types/service-contracts/template';

// =================================================================
// STATUS / COMPLEXITY COLOR HELPERS
// =================================================================

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onClick,
  onPreview,
  onSelect,
  onEdit,
  isSelected = false,
  showActions = true,
  compact = false,
  context,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  // Default context
  const cardContext: TemplateCardContext = context || {
    mode: 'selection',
    isGlobal: template.globalTemplate,
    userRole: 'user',
    canEdit: !template.globalTemplate,
    canCopy: true,
    canCreateContract: true,
  };

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

  // ── Determine primary action label ──
  const getPrimaryAction = () => {
    const { mode, isGlobal, userRole } = cardContext;
    if (mode === 'management' && isGlobal && userRole === 'admin') {
      return { label: 'Settings', icon: Settings, id: 'settings' };
    }
    if (mode === 'management') {
      return { label: 'Create Contract', icon: CheckCircle, id: 'create-contract' };
    }
    if (isSelected) {
      return { label: 'Selected', icon: CheckCircle, id: 'select' };
    }
    return { label: 'Use Template', icon: CheckCircle, id: 'select' };
  };

  // ── Action handler ──
  const handleAction = (actionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDropdown(false);

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
      case 'clone':
        console.log('Clone template:', template.id);
        break;
      case 'settings':
        onEdit?.(template);
        break;
      case 'delete':
        console.log('Delete template:', template.id);
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

  const primaryAction = getPrimaryAction();
  const statusColor = getStatusColor(template.status);
  const complexityColor = getComplexityColor(template.complexity);
  const contractTypeLabel = CONTRACT_TYPE_LABELS[template.contractType] || template.contractType;
  const complexityLabel = TEMPLATE_COMPLEXITY_LABELS[template.complexity] || template.complexity;

  // ── Dropdown menu items ──
  const getDropdownItems = () => {
    const items: { id: string; label: string; icon: React.FC<any>; danger?: boolean }[] = [
      { id: 'preview', label: 'Preview', icon: Eye },
    ];
    if (cardContext.canCopy) {
      items.push({ id: 'clone', label: 'Duplicate', icon: Copy });
    }
    if (cardContext.canEdit) {
      items.push({ id: 'edit', label: 'Edit', icon: Edit });
    }
    if (cardContext.userRole === 'admin') {
      items.push({ id: 'delete', label: 'Delete', icon: Trash2, danger: true });
    }
    return items;
  };

  // =================================================================
  // COMPACT / LIST VIEW
  // =================================================================
  if (compact) {
    return (
      <div
        onClick={handleCardClick}
        className="p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer group"
        style={{
          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
          borderColor: isSelected ? colors.brand.primary : colors.utility.secondaryText + '20',
          boxShadow: isSelected ? `0 0 0 2px ${colors.brand.primary}40` : undefined,
        }}
      >
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${colors.brand.primary}15` }}
          >
            <LayoutTemplate className="w-6 h-6" style={{ color: colors.brand.primary }} />
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
                <Globe className="w-4 h-4 flex-shrink-0" style={{ color: colors.brand.primary }} />
              )}
              <span
                className="text-[10px] px-2 py-0.5 rounded-full capitalize flex-shrink-0"
                style={{
                  backgroundColor: `${statusColor}20`,
                  color: statusColor,
                }}
              >
                {template.status}
              </span>
            </div>
            <p
              className="text-xs truncate mt-1"
              style={{ color: colors.utility.secondaryText }}
            >
              {template.description}
            </p>
          </div>

          {/* Stats */}
          <div
            className="flex items-center gap-6 text-xs flex-shrink-0"
            style={{ color: colors.utility.secondaryText }}
          >
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {template.blocks.length}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {template.estimatedDuration}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {template.usageCount}
            </span>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={(e) => handleAction(primaryAction.id, e)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: isSelected ? (colors.semantic?.success || '#10B981') : colors.brand.primary,
                  color: '#FFFFFF',
                }}
                disabled={isSelected && primaryAction.id === 'select'}
              >
                {primaryAction.label}
              </button>

              {/* 3-dot menu */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                  }}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showDropdown && (
                  <div
                    className="absolute right-0 top-full mt-1 w-40 rounded-lg border shadow-lg z-20"
                    style={{
                      backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
                      borderColor: colors.utility.secondaryText + '20',
                    }}
                  >
                    {getDropdownItems().map((item, idx) => (
                      <React.Fragment key={item.id}>
                        {item.danger && idx > 0 && (
                          <div
                            className="border-t mx-1"
                            style={{ borderColor: colors.utility.secondaryText + '20' }}
                          />
                        )}
                        <button
                          onClick={(e) => handleAction(item.id, e)}
                          className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors rounded-md mx-0"
                          style={{
                            color: item.danger
                              ? (colors.semantic?.error || '#EF4444')
                              : colors.utility.primaryText,
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = item.danger
                              ? (isDarkMode ? 'rgba(239,68,68,0.1)' : '#FEF2F2')
                              : (isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB');
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                          }}
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =================================================================
  // FULL / GRID VIEW CARD
  // =================================================================
  return (
    <div
      onClick={handleCardClick}
      className="rounded-xl border transition-all hover:shadow-lg hover:-translate-y-1 group cursor-pointer"
      style={{
        backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
        borderColor: isSelected ? colors.brand.primary : colors.utility.secondaryText + '20',
        boxShadow: isSelected ? `0 0 0 2px ${colors.brand.primary}40` : undefined,
      }}
    >
      {/* ── Header Section ── */}
      <div
        className="p-4 border-b"
        style={{ borderColor: colors.utility.secondaryText + '10' }}
      >
        <div className="flex items-start justify-between mb-3">
          {/* Icon */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${colors.brand.primary}15` }}
          >
            <LayoutTemplate className="w-6 h-6" style={{ color: colors.brand.primary }} />
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {template.globalTemplate && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium"
                style={{
                  backgroundColor: `${colors.brand.primary}15`,
                  color: colors.brand.primary,
                }}
              >
                <Globe className="w-3 h-3" />
                Global
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
          className="font-semibold text-base leading-snug group-hover:opacity-80 transition-opacity"
          style={{ color: colors.utility.primaryText }}
        >
          {template.name}
        </h3>
        <p
          className="text-xs mt-1 line-clamp-2 leading-relaxed"
          style={{ color: colors.utility.secondaryText }}
        >
          {template.description}
        </p>

        {/* Contract Type + Complexity Badges */}
        <div className="flex items-center gap-1.5 mt-3">
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
        </div>
      </div>

      {/* ── Stats Section ── */}
      <div className="px-4 py-3">
        <div
          className="grid grid-cols-2 gap-2 text-center py-2.5 rounded-lg"
          style={{ backgroundColor: `${colors.brand.primary}05` }}
        >
          <div>
            <div className="flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
              <span
                className="text-sm font-semibold"
                style={{ color: colors.utility.primaryText }}
              >
                {template.usageCount}
              </span>
            </div>
            <div
              className="text-[10px] mt-0.5"
              style={{ color: colors.utility.secondaryText }}
            >
              Times used
            </div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span
                className="text-sm font-semibold"
                style={{ color: colors.utility.primaryText }}
              >
                {template.rating.toFixed(1)}
              </span>
            </div>
            <div
              className="text-[10px] mt-0.5"
              style={{ color: colors.utility.secondaryText }}
            >
              Rating
            </div>
          </div>
        </div>

        {/* Meta Info */}
        <div
          className="flex items-center justify-between mt-3 text-xs"
          style={{ color: colors.utility.secondaryText }}
        >
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {template.estimatedDuration}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {template.blocks.length} blocks
          </span>
        </div>
      </div>

      {/* ── Footer Actions ── */}
      {showActions && (
        <div
          className="px-4 py-3 border-t flex items-center gap-2"
          style={{ borderColor: colors.utility.secondaryText + '10' }}
        >
          {/* Primary Action Button */}
          <button
            onClick={(e) => handleAction(primaryAction.id, e)}
            className="flex-1 py-2 text-sm font-medium rounded-lg transition-opacity hover:opacity-90 flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: isSelected ? (colors.semantic?.success || '#10B981') : colors.brand.primary,
              color: '#FFFFFF',
            }}
            disabled={isSelected && primaryAction.id === 'select'}
          >
            <primaryAction.icon className="w-4 h-4" />
            {primaryAction.label}
          </button>

          {/* Secondary icon actions */}
          <button
            onClick={(e) => handleAction('preview', e)}
            className="p-2 rounded-lg border transition-colors"
            style={{
              borderColor: colors.utility.secondaryText + '40',
              color: colors.utility.secondaryText,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = isDarkMode
                ? 'rgba(255,255,255,0.05)'
                : '#F9FAFB';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* 3-dot dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDropdown(!showDropdown);
              }}
              className="p-2 rounded-lg border transition-colors"
              style={{
                borderColor: colors.utility.secondaryText + '40',
                color: colors.utility.secondaryText,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = isDarkMode
                  ? 'rgba(255,255,255,0.05)'
                  : '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showDropdown && (
              <div
                className="absolute right-0 bottom-full mb-1 w-40 rounded-lg border shadow-lg z-20"
                style={{
                  backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
                  borderColor: colors.utility.secondaryText + '20',
                }}
              >
                {getDropdownItems().map((item, idx) => (
                  <React.Fragment key={item.id}>
                    {item.danger && idx > 0 && (
                      <div
                        className="border-t mx-1"
                        style={{ borderColor: colors.utility.secondaryText + '20' }}
                      />
                    )}
                    <button
                      onClick={(e) => handleAction(item.id, e)}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors"
                      style={{
                        color: item.danger
                          ? (colors.semantic?.error || '#EF4444')
                          : colors.utility.primaryText,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = item.danger
                          ? (isDarkMode ? 'rgba(239,68,68,0.1)' : '#FEF2F2')
                          : (isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB');
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateCard;
