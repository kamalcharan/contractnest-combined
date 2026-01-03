// src/components/catalog-studio/IconPicker.tsx
// Phase 5: Icon Picker with all Lucide icons, search, and grid layout

import React, { useState, useMemo, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import { Search, X, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// =================================================================
// TYPES
// =================================================================

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  showLabel?: boolean;
  maxHeight?: number;
  columns?: number;
}

interface IconOption {
  name: string;
  component: React.ComponentType<{ className?: string; size?: number }>;
}

// =================================================================
// ICON LIST - All commonly used Lucide icons
// =================================================================

const ICON_NAMES: string[] = [
  // Business & Work
  'Briefcase', 'Building', 'Building2', 'Factory', 'Landmark', 'Store', 'Warehouse',
  // People & Users
  'User', 'Users', 'UserCheck', 'UserPlus', 'UserCog', 'Contact', 'CircleUser',
  // Home & Property
  'Home', 'House', 'Hotel', 'Bed', 'Bath', 'Sofa', 'Lamp', 'DoorOpen', 'Key',
  // Medical & Health
  'Stethoscope', 'Heart', 'HeartPulse', 'Activity', 'Thermometer', 'Pill', 'Syringe', 'Cross', 'Hospital',
  // Technology & IT
  'Monitor', 'Laptop', 'Smartphone', 'Tablet', 'Cpu', 'HardDrive', 'Wifi', 'Bluetooth', 'Server',
  // Tools & Repair
  'Wrench', 'Hammer', 'Screwdriver', 'Settings', 'Cog', 'Tool', 'Construction', 'PaintBucket', 'Ruler',
  // Automotive & Transport
  'Car', 'Truck', 'Bus', 'Bike', 'Plane', 'Ship', 'Train', 'Fuel', 'ParkingCircle',
  // Cleaning & Maintenance
  'Sparkles', 'Droplet', 'Droplets', 'Trash2', 'Recycle', 'Leaf', 'TreeDeciduous', 'Flower2',
  // Education & Training
  'GraduationCap', 'BookOpen', 'Library', 'School', 'PenTool', 'Pencil', 'NotebookPen',
  // Food & Beverage
  'UtensilsCrossed', 'Coffee', 'Pizza', 'Cake', 'Cookie', 'Wine', 'Beer', 'ChefHat',
  // Fitness & Sports
  'Dumbbell', 'Trophy', 'Medal', 'Target', 'Footprints', 'Bike', 'PersonStanding',
  // Weather & Environment
  'Sun', 'Moon', 'Cloud', 'Snowflake', 'Umbrella', 'Wind', 'Thermometer', 'Flame',
  // Finance & Payment
  'DollarSign', 'CreditCard', 'Wallet', 'Receipt', 'PiggyBank', 'Banknote', 'Coins', 'TrendingUp',
  // Communication
  'Phone', 'PhoneCall', 'Mail', 'MessageSquare', 'MessageCircle', 'Send', 'Inbox', 'AtSign',
  // Media & Content
  'Camera', 'Video', 'Music', 'Mic', 'Image', 'Film', 'Radio', 'Tv', 'Youtube',
  // Files & Documents
  'File', 'FileText', 'Folder', 'FolderOpen', 'ClipboardList', 'ClipboardCheck', 'FileCheck', 'FilePlus',
  // Security & Safety
  'Shield', 'ShieldCheck', 'Lock', 'Unlock', 'Key', 'Eye', 'EyeOff', 'AlertTriangle',
  // Time & Calendar
  'Clock', 'Timer', 'Calendar', 'CalendarCheck', 'CalendarDays', 'History', 'Hourglass',
  // Navigation & Location
  'MapPin', 'Map', 'Navigation', 'Compass', 'Globe', 'Route', 'Milestone',
  // Shopping & E-commerce
  'ShoppingCart', 'ShoppingBag', 'Package', 'Box', 'Gift', 'Tag', 'Barcode', 'QrCode',
  // Status & Actions
  'Check', 'CheckCircle', 'CheckSquare', 'X', 'XCircle', 'Plus', 'Minus', 'RefreshCw',
  // Arrows & Direction
  'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ChevronRight', 'ChevronLeft', 'MoveRight',
  // Misc
  'Star', 'Zap', 'Bell', 'Bookmark', 'Flag', 'Award', 'Crown', 'Gem', 'Rocket', 'Lightbulb',
  'CircleDot', 'Circle', 'Square', 'Triangle', 'Hexagon', 'Paperclip', 'Link', 'Anchor',
];

// =================================================================
// COMPONENT
// =================================================================

const IconPicker: React.FC<IconPickerProps> = ({
  value,
  onChange,
  label = 'Icon',
  placeholder = 'Search icons...',
  disabled = false,
  showLabel = true,
  maxHeight = 240,
  columns = 8,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get icon component by name
  const getIconComponent = useCallback((iconName: string) => {
    const iconsMap = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; size?: number }>>;
    return iconsMap[iconName] || LucideIcons.Circle;
  }, []);

  // Filter icons based on search
  const filteredIcons = useMemo(() => {
    if (!searchQuery) return ICON_NAMES;
    const query = searchQuery.toLowerCase();
    return ICON_NAMES.filter(name => name.toLowerCase().includes(query));
  }, [searchQuery]);

  // Get selected icon component
  const SelectedIcon = getIconComponent(value || 'Circle');

  // Handle icon selection
  const handleSelect = useCallback((iconName: string) => {
    onChange(iconName);
    setIsOpen(false);
    setSearchQuery('');
  }, [onChange]);

  // Handle close
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, []);

  return (
    <div className="relative">
      {/* Label */}
      {showLabel && label && (
        <label
          className="block text-sm font-medium mb-1"
          style={{ color: colors.utility.primaryText }}
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-3 px-3 py-2 border rounded-lg transition-all w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: colors.utility.primaryBackground,
          borderColor: isOpen ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB'),
          boxShadow: isOpen ? `0 0 0 2px ${colors.brand.primary}30` : 'none',
        }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${colors.brand.primary}15` }}
        >
          <SelectedIcon className="w-5 h-5" style={{ color: colors.brand.primary }} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
            {value || 'Select Icon'}
          </div>
          <div className="text-xs" style={{ color: colors.utility.secondaryText }}>
            Click to browse all icons
          </div>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleClose}
          />

          {/* Picker Panel */}
          <div
            className="absolute z-50 mt-2 w-full min-w-[320px] rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
            }}
          >
            {/* Search Header */}
            <div
              className="p-3 border-b"
              style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
            >
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: colors.utility.secondaryText }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={placeholder}
                  autoFocus
                  className="w-full pl-9 pr-8 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: 'transparent',
                    color: colors.utility.primaryText,
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <X className="w-3 h-3" style={{ color: colors.utility.secondaryText }} />
                  </button>
                )}
              </div>
              <div className="text-xs mt-2" style={{ color: colors.utility.secondaryText }}>
                {filteredIcons.length} icons available
              </div>
            </div>

            {/* Icons Grid */}
            <div
              className="p-3 overflow-y-auto"
              style={{ maxHeight: `${maxHeight}px` }}
            >
              {filteredIcons.length > 0 ? (
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
                >
                  {filteredIcons.map((iconName) => {
                    const IconComp = getIconComponent(iconName);
                    const isSelected = value === iconName;

                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => handleSelect(iconName)}
                        className="relative p-2 rounded-lg flex items-center justify-center transition-all group"
                        style={{
                          backgroundColor: isSelected
                            ? `${colors.brand.primary}20`
                            : 'transparent',
                          border: isSelected
                            ? `2px solid ${colors.brand.primary}`
                            : '2px solid transparent',
                        }}
                        title={iconName}
                      >
                        <IconComp
                          className="w-5 h-5 transition-transform group-hover:scale-110"
                          style={{
                            color: isSelected
                              ? colors.brand.primary
                              : colors.utility.secondaryText,
                          }}
                        />
                        {isSelected && (
                          <div
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: colors.brand.primary }}
                          >
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search className="w-8 h-8 mx-auto mb-2" style={{ color: colors.utility.secondaryText }} />
                  <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                    No icons found for "{searchQuery}"
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="p-3 border-t flex items-center justify-between"
              style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
            >
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                Selected: <strong>{value || 'None'}</strong>
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1 text-xs font-medium rounded-lg transition-colors"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default IconPicker;

// =================================================================
// EXPORTS
// =================================================================

export { ICON_NAMES };
export type { IconPickerProps };
