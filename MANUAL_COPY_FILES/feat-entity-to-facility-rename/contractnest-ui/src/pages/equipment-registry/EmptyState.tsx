// src/pages/equipment-registry/EmptyState.tsx
// Empty state for Equipment/Facility Registry — context-aware based on selected sub_category

import React from 'react';
import { Plus, Package } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { getSubCategoryConfig } from '@/constants/subCategoryConfig';

interface EquipmentEmptyStateProps {
  selectedSubCategory: string | null;
  onAddEquipment: () => void;
  registryMode?: 'equipment' | 'entity';
}

const EquipmentEmptyState: React.FC<EquipmentEmptyStateProps> = ({
  selectedSubCategory,
  onAddEquipment,
  registryMode = 'equipment',
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const config = getSubCategoryConfig(selectedSubCategory);
  const EmptyIcon = config?.icon || Package;
  const iconColor = config?.color || colors.utility.secondaryText;

  return (
    <div className="text-center py-16 px-6">
      {/* Illustration */}
      <div className="flex justify-center mb-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: iconColor + '12' }}
        >
          <EmptyIcon size={36} style={{ color: iconColor, opacity: 0.7 }} />
        </div>
      </div>

      <h2
        className="text-xl font-bold mb-2"
        style={{ color: colors.utility.primaryText }}
      >
        {selectedSubCategory
          ? `No ${registryMode === 'entity' ? 'facilities' : 'equipment'} in ${selectedSubCategory}`
          : `No ${registryMode === 'entity' ? 'facilities' : 'equipment'} registered yet`}
      </h2>
      <p
        className="text-sm max-w-md mx-auto mb-7 leading-relaxed"
        style={{ color: colors.utility.secondaryText }}
      >
        {selectedSubCategory
          ? `Add ${registryMode === 'entity' ? 'facilities' : 'equipment'} under ${selectedSubCategory} to track assets, link contracts, and manage service schedules.`
          : `Get started by adding your first ${registryMode === 'entity' ? 'facility' : 'equipment'}. Registered items can be linked to contracts, scheduled for service, and tracked with evidence.`}
      </p>

      {/* CTA Button */}
      <Button
        onClick={onAddEquipment}
        className="transition-colors hover:opacity-90"
        style={{
          background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary})`,
          color: '#FFFFFF',
        }}
      >
        <Plus className="mr-1.5 h-4 w-4" />
        {registryMode === 'entity' ? 'Add Facility' : 'Add Equipment'}
      </Button>
    </div>
  );
};

export default EquipmentEmptyState;
