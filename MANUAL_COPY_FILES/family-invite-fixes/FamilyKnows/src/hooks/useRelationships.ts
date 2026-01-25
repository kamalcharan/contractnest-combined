// src/hooks/useRelationships.ts
// Hook to fetch family relationships from masterdata API

import { useState, useEffect, useCallback } from 'react';
import { api, API_ENDPOINTS } from '../services/api';

export interface Relationship {
  id: string;
  name: string;
  displayName: string;
  icon?: string;
  description?: string;
  sequence?: number;
}

// Default relationships as fallback (if API fails)
const DEFAULT_RELATIONSHIPS: Relationship[] = [
  { id: 'father', name: 'Father', displayName: 'Father', icon: 'human-male', sequence: 1 },
  { id: 'mother', name: 'Mother', displayName: 'Mother', icon: 'human-female', sequence: 2 },
  { id: 'spouse', name: 'Spouse', displayName: 'Spouse', icon: 'heart', sequence: 3 },
  { id: 'son', name: 'Son', displayName: 'Son', icon: 'human-male-boy', sequence: 4 },
  { id: 'daughter', name: 'Daughter', displayName: 'Daughter', icon: 'human-female-girl', sequence: 5 },
  { id: 'brother', name: 'Brother', displayName: 'Brother', icon: 'account-multiple', sequence: 6 },
  { id: 'sister', name: 'Sister', displayName: 'Sister', icon: 'account-multiple', sequence: 7 },
  { id: 'grandfather', name: 'Grandfather', displayName: 'Grandpa', icon: 'human-male', sequence: 8 },
  { id: 'grandmother', name: 'Grandmother', displayName: 'Grandma', icon: 'human-female', sequence: 9 },
  { id: 'other', name: 'Other', displayName: 'Other', icon: 'account-question', sequence: 99 },
];

interface UseRelationshipsReturn {
  relationships: Relationship[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useRelationships = (): UseRelationshipsReturn => {
  const [relationships, setRelationships] = useState<Relationship[]>(DEFAULT_RELATIONSHIPS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRelationships = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if API has auth state before making request
      const authState = api.getAuthState();
      if (!authState.hasTenant) {
        console.log('useRelationships: No tenant ID available, using defaults');
        setRelationships(DEFAULT_RELATIONSHIPS);
        setIsLoading(false);
        return;
      }

      // First, fetch all categories to find the Roles/Relationships category
      const categoriesResponse = await api.get<any[]>('/api/masterdata/categories');
      const categories = categoriesResponse.data;

      // Look for Roles or FamilyRelationship category
      const relationshipCategory = categories.find(
        (c: any) =>
          c.CategoryName === 'Roles' ||
          c.DisplayName === 'Roles' ||
          c.CategoryName === 'FamilyRelationship' ||
          c.DisplayName === 'Family Relationship'
      );

      if (relationshipCategory) {
        // Fetch the details for this category
        const detailsResponse = await api.get<any[]>(
          `/api/masterdata/categories/${relationshipCategory.id}/details`
        );
        const details = detailsResponse.data;

        if (details && details.length > 0) {
          const transformedRelationships: Relationship[] = details
            .filter((d: any) => d.is_active !== false && d.IsActive !== false)
            .map((d: any) => ({
              id: d.id,
              name: d.SubCatName || d.sub_cat_name || d.Name || d.name,
              displayName: d.DisplayName || d.display_name || d.Name || d.name,
              // Use icon_name from API first, then fallback to mapping
              icon: d.icon_name || getRelationshipIcon(d.DisplayName || d.display_name || d.Name || d.name),
              description: d.Description || d.description,
              sequence: d.Sequence_no || d.sequence_no || d.Sequence || d.sequence || 99,
            }))
            .sort((a: Relationship, b: Relationship) => (a.sequence || 99) - (b.sequence || 99));

          // Add "Other" option if not present
          if (!transformedRelationships.find((r) => r.name.toLowerCase() === 'other')) {
            transformedRelationships.push({
              id: 'other',
              name: 'Other',
              displayName: 'Other',
              icon: 'account-plus',
              sequence: 999,
            });
          }

          setRelationships(transformedRelationships);
        }
      } else {
        // Use default relationships if category not found
        console.log('Roles/Relationships category not found, using defaults');
        setRelationships(DEFAULT_RELATIONSHIPS);
      }
    } catch (err: any) {
      // Log as warning instead of error to avoid Expo error notifications
      console.log('Failed to fetch relationships:', err.message);

      // Don't set error for tenantId issues (user might not be fully onboarded)
      if (!err.message?.includes('tenantId') && !err.message?.includes('temporarily unavailable')) {
        setError(err.message || 'Failed to fetch relationships');
      }
      // Keep default relationships on error
      setRelationships(DEFAULT_RELATIONSHIPS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  return {
    relationships,
    isLoading,
    error,
    refetch: fetchRelationships,
  };
};

// Helper function to map relationship names to icons (valid MaterialCommunityIcons)
function getRelationshipIcon(name: string): string {
  const iconMap: Record<string, string> = {
    father: 'human-male',
    dad: 'human-male',
    mother: 'human-female',
    mom: 'human-female',
    spouse: 'heart',
    partner: 'heart',
    husband: 'human-male',
    wife: 'human-female',
    son: 'human-male-boy',
    daughter: 'human-female-girl',
    brother: 'account-multiple',
    sister: 'account-multiple',
    sibling: 'account-multiple',
    grandfather: 'human-male',
    grandpa: 'human-male',
    grandmother: 'human-female',
    grandma: 'human-female',
    'grand mother': 'human-female',
    'grand daughter': 'human-female-girl',
    granddaughter: 'human-female-girl',
    grandparent: 'account-multiple',
    uncle: 'human-male',
    aunt: 'human-female',
    cousin: 'account-multiple',
    nephew: 'human-male-boy',
    niece: 'human-female-girl',
    guardian: 'shield-account',
    executor: 'briefcase-account',
    other: 'account-question',
  };

  const lowerName = name.toLowerCase();
  return iconMap[lowerName] || 'account';
}

export default useRelationships;
