// src/pages/entity-registry/index.tsx
// Facility Registry — thin wrapper around the shared Equipment/Facility Registry page
// Shows only resources with resource_type_id = 'asset'

import React from 'react';
import EquipmentPage from '@/pages/equipment-registry';

const EntityRegistryPage: React.FC = () => {
  return <EquipmentPage registryMode="entity" />;
};

export default EntityRegistryPage;
