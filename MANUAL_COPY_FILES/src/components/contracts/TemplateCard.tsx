// src/components/contracts/TemplateCard.tsx
// Re-export TemplateCard from service-contracts with adapted types
import React from 'react';
import {
  Eye,
  Star,
  Users,
  Clock,
  FileText,
  TrendingUp,
  CheckCircle,
  ChevronRight,
  Tag,
  Building2,
  Calendar,
  Edit,
  Copy,
  Settings
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// Template interface for contracts
export interface Template {
  id: string;
  name: string;
  description: string;
  contractType: 'service' | 'partnership';
  industry: string;
  complexity: 'simple' | 'medium' | 'complex';
  estimatedDuration: string;
  blocks: any[];
  tags: string[];
  rating: number;
  usageCount: number;
  isPopular?: boolean;
  globalTemplate?: boolean;
  version?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateCardContext {
  mode: 'selection' | 'marketplace' | 'management';
  isGlobal?: boolean;
  userRole?: 'user' | 'admin';
  canEdit?: boolean;
  canCopy?: boolean;
  canCreateContract?: boolean;
}

interface TemplateCardProps {
  template: Template;
  onClick?: (template: Template) => void;
  onPreview?: (template: Template) => void;
  onSelect?: (template: Template) => void;
  isSelected?: boolean;
  showActions?: boolean;
  compact?: boolean;
  context?: TemplateCardContext;
}

const CONTRACT_TYPE_LABELS = {
  service: 'Service Contract',
  partnership: 'Partnership Agreement'
};

const TEMPLATE_COMPLEXITY_LABELS = {
  simple: 'Simple',
  medium: 'Medium',
  complex: 'Complex'
};

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onClick,
  onPreview,
  onSelect,
  isSelected = false,
  showActions = true,
  compact = false,
  context
}) => {
  const { isDarkMode } = useTheme();

  // Default context if not provided
  const cardContext: TemplateCardContext = context || {
    mode: 'selection',
    isGlobal: template.globalTemplate,
    userRole: 'user',
    canEdit: !template.globalTemplate,
    canCopy: true,
    canCreateContract: true
  };

  // Get contract type configuration
  const getContractTypeConfig = (contractType: string) => {
    switch (contractType) {
      case 'service':
        return {
          name: CONTRACT_TYPE_LABELS.service,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100 dark:bg-blue-900/20'
        };
      case 'partnership':
        return {
          name: CONTRACT_TYPE_LABELS.partnership,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100 dark:bg-purple-900/20'
        };
      default:
        return {
          name: 'Unknown',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100 dark:bg-gray-900/20'
        };
    }
  };

  // Get industry configuration
  const getIndustryConfig = (industry: string) => {
    const industryMap: Record<string, { name: string; icon: string }> = {
      healthcare: { name: 'Healthcare', icon: '🏥' },
      manufacturing: { name: 'Manufacturing', icon: '🏭' },
      financial: { name: 'Financial Services', icon: '💰' },
      technology: { name: 'Technology', icon: '💻' },
      retail: { name: 'Retail', icon: '🛒' },
      education: { name: 'Education', icon: '🎓' },
      government: { name: 'Government', icon: '🏛️' },
      nonprofit: { name: 'Non-Profit', icon: '🤝' },
      consulting: { name: 'Consulting', icon: '💼' },
      legal: { name: 'Legal', icon: '⚖️' },
      'pest-control': { name: 'Pest Control', icon: '🐜' },
      construction: { name: 'Construction', icon: '🏗️' }
    };

    return industryMap[industry] || { name: industry, icon: '📄' };
  };

  // Get actions based on context
  const getContextActions = () => {
    const { mode, isGlobal, userRole } = cardContext;

    if (mode === 'marketplace' && isGlobal) {
      return [
        { id: 'preview', label: 'Preview', icon: Eye, primary: false },
        { id: 'create-contract', label: 'Use Template', icon: CheckCircle, primary: true }
      ];
    }

    if (mode === 'management' && !isGlobal) {
      return [
        { id: 'preview', label: 'Preview', icon: Eye, primary: false },
        { id: 'clone', label: 'Clone', icon: Copy, primary: false },
        { id: 'create-contract', label: 'Create Contract', icon: CheckCircle, primary: true }
      ];
    }

    if (mode === 'selection') {
      return [
        { id: 'preview', label: 'Preview', icon: Eye, primary: false },
        { id: 'select', label: isSelected ? 'Selected' : 'Use Template', icon: CheckCircle, primary: true }
      ];
    }

    return [
      { id: 'preview', label: 'Preview', icon: Eye, primary: false },
      { id: 'select', label: 'Use Template', icon: CheckCircle, primary: true }
    ];
  };

  // Get configurations
  const contractTypeConfig = getContractTypeConfig(template.contractType);
  const industryConfig = getIndustryConfig(template.industry);
  const complexityLabel = TEMPLATE_COMPLEXITY_LABELS[template.complexity];
  const actions = getContextActions();

  // Handle card click
  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) {
      onClick(template);
    }
  };

  // Handle action clicks
  const handleActionClick = (actionId: string, e: React.MouseEvent) => {
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
      default:
        console.log('Action:', actionId);
    }
  };

  // Get complexity color
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800';
      case 'complex':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-200 dark:border-gray-800';
    }
  };

  // Render rating stars
  const renderRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
      );
    }

    const emptyStars = 5 - fullStars;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="h-3 w-3 text-gray-300" />
      );
    }

    return stars;
  };

  // Compact version for list views
  if (compact) {
    return (
      <div
        onClick={handleCardClick}
        className={`
          relative p-3 rounded-lg border transition-all duration-200 cursor-pointer
          hover:shadow-md hover:border-primary/30 group
          ${isSelected
            ? 'ring-2 ring-primary border-primary bg-primary/5'
            : 'bg-card border-border hover:bg-accent/50'
          }
        `}
      >
        {template.globalTemplate && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
              Global
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-lg">{industryConfig?.icon || '📄'}</span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate text-foreground">
                {template.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                  template.contractType === 'service'
                    ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800'
                    : 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-200 dark:border-purple-800'
                }`}>
                  {contractTypeConfig.name}
                </span>
              </div>
            </div>
          </div>

          {showActions && (
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {template.usageCount}
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {template.rating.toFixed(1)}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {template.estimatedDuration}
          </span>
        </div>
      </div>
    );
  }

  // Full card version
  return (
    <div
      onClick={handleCardClick}
      className={`
        relative rounded-lg border transition-all duration-200 cursor-pointer group
        hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 hover:-translate-y-1
        ${isSelected
          ? 'ring-2 ring-primary border-primary bg-primary/5'
          : 'bg-card border-border'
        }
      `}
    >
      {template.isPopular && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
            <TrendingUp className="h-3 w-3" />
            Popular
          </div>
        </div>
      )}

      {template.globalTemplate && (
        <div className="absolute top-3 left-3 z-10">
          <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
            <Building2 className="h-3 w-3" />
            Global
          </div>
        </div>
      )}

      {isSelected && (
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
            <CheckCircle className="h-3 w-3" />
            Selected
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
              {industryConfig?.icon || '📄'}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                {template.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {industryConfig?.name || template.industry}
              </p>
            </div>
          </div>

          <div className={`p-2 rounded-lg ${contractTypeConfig.bgColor}`}>
            {template.contractType === 'service' ? (
              <FileText className={`h-4 w-4 ${contractTypeConfig.color}`} />
            ) : (
              <Building2 className={`h-4 w-4 ${contractTypeConfig.color}`} />
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
          {template.description}
        </p>

        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {template.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                +{template.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
            template.contractType === 'service'
              ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800'
              : 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-200 dark:border-purple-800'
          }`}>
            {contractTypeConfig.name}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getComplexityColor(template.complexity)}`}>
            {complexityLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold text-foreground">{template.usageCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Times used</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <div className="flex items-center gap-0.5">
                {renderRating(template.rating)}
              </div>
              <span className="text-lg font-semibold text-foreground ml-1">{template.rating.toFixed(1)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Rating</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Est. Duration: {template.estimatedDuration}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {template.blocks?.length || 0} blocks
          </span>
        </div>

        {showActions && actions.length > 0 && (
          <div className="flex gap-2 pt-4 border-t border-border">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={(e) => handleActionClick(action.id, e)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  action.primary
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-border hover:bg-accent text-foreground'
                } ${isSelected && action.id === 'select' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                disabled={isSelected && action.id === 'select'}
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateCard;
