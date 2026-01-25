// src/hooks/useRelationships.ts
// Hook to fetch family relationships from masterdata API

import { useState, useEffect, useCallback } from 'react';
import { api, API_ENDPOINTS } from '../services/api';
import { useAuth } from '../context/AuthContext';

export interface Relationship {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  description?: string;
  sequence?: number;
  defaultMessage: string; // Pre-filled invite message
}

// Valid MaterialCommunityIcons names for relationships
const RELATIONSHIP_ICONS: Record<string, string> = {
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
  brother: 'account-group',
  sister: 'account-group',
  sibling: 'account-group',
  grandfather: 'account',
  grandpa: 'account',
  grandmother: 'account',
  grandma: 'account',
  grandparent: 'account-group',
  uncle: 'human-male',
  aunt: 'human-female',
  cousin: 'account-group',
  nephew: 'human-male-boy',
  niece: 'human-female-girl',
  other: 'account-plus',
};

// Default invite messages per relationship
const DEFAULT_MESSAGES: Record<string, string> = {
  father: "Hi Dad! I'm using FamilyKnows to keep our family connected. Join me so we can share moments together! 💙",
  dad: "Hi Dad! I'm using FamilyKnows to keep our family connected. Join me so we can share moments together! 💙",
  mother: "Hi Mom! I'm using FamilyKnows to keep our family connected. Join me so we can share precious moments! 💕",
  mom: "Hi Mom! I'm using FamilyKnows to keep our family connected. Join me so we can share precious moments! 💕",
  spouse: "Hey love! Let's use FamilyKnows together to stay connected with our family. Join me! ❤️",
  partner: "Hey! Let's use FamilyKnows together to stay connected with our family. Join me! ❤️",
  husband: "Hey! Let's use FamilyKnows together to stay connected with our family. Join me! ❤️",
  wife: "Hey! Let's use FamilyKnows together to stay connected with our family. Join me! ❤️",
  son: "Hey! Join our family on FamilyKnows. Let's stay connected! 🌟",
  daughter: "Hey! Join our family on FamilyKnows. Let's stay connected! 🌟",
  brother: "Hey bro! I'm using FamilyKnows to keep our family connected. Join the family hub! 💪",
  sister: "Hey sis! I'm using FamilyKnows to keep our family connected. Join the family hub! 💖",
  sibling: "Hey! I'm using FamilyKnows to keep our family connected. Join the family hub!",
  grandfather: "Hi Grandpa! Join our family on FamilyKnows. We'd love to have you! 🌳",
  grandpa: "Hi Grandpa! Join our family on FamilyKnows. We'd love to have you! 🌳",
  grandmother: "Hi Grandma! Join our family on FamilyKnows. We'd love to have you! 🌸",
  grandma: "Hi Grandma! Join our family on FamilyKnows. We'd love to have you! 🌸",
  grandparent: "Hi! Join our family on FamilyKnows. We'd love to have you! 🌳",
  uncle: "Hi Uncle! Join our family on FamilyKnows. Let's stay connected! 🤝",
  aunt: "Hi Aunty! Join our family on FamilyKnows. Let's stay connected! 💐",
  cousin: "Hey! Join our family on FamilyKnows. Let's stay connected! 🎉",
  nephew: "Hey! Join our family on FamilyKnows!",
  niece: "Hey! Join our family on FamilyKnows!",
  other: "Hey! I'm inviting you to join our family on FamilyKnows. Let's stay connected! 🏠",
};

// Default relationships as fallback (if API fails)
const DEFAULT_RELATIONSHIPS: Relationship[] = [
  { id: 'father', name: 'Father', displayName: 'Dad', icon: 'human-male', sequence: 1, defaultMessage: DEFAULT_MESSAGES.father },
  { id: 'mother', name: 'Mother', displayName: 'Mom', icon: 'human-female', sequence: 2, defaultMessage: DEFAULT_MESSAGES.mother },
  { id: 'spouse', name: 'Spouse', displayName: 'Spouse', icon: 'heart', sequence: 3, defaultMessage: DEFAULT_MESSAGES.spouse },
  { id: 'sibling', name: 'Sibling', displayName: 'Sibling', icon: 'account-group', sequence: 4, defaultMessage: DEFAULT_MESSAGES.sibling },
  { id: 'grandparent', name: 'Grandparent', displayName: 'Grandpa', icon: 'account', sequence: 5, defaultMessage: DEFAULT_MESSAGES.grandparent },
  { id: 'other', name: 'Other', displayName: 'Other', icon: 'account-plus', sequence: 99, defaultMessage: DEFAULT_MESSAGES.other },
];

interface UseRelationshipsReturn {
  relationships: Relationship[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useRelationships = (): UseRelationshipsReturn => {
  const { currentTenant, isAuthenticated } = useAuth();
  const [relationships, setRelationships] = useState<Relationship[]>(DEFAULT_RELATIONSHIPS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRelationships = useCallback(async () => {
    // Don't fetch if not authenticated or no tenant
    if (!isAuthenticated || !currentTenant?.id) {
      console.log('Skipping relationships fetch - no auth or tenant');
      setRelationships(DEFAULT_RELATIONSHIPS);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // CRITICAL: Pass tenant ID explicitly to avoid cache sync issues
      // The api service cache might not be in sync with AuthContext state
      const headers = { 'x-tenant-id': currentTenant.id };
      console.log('useRelationships: Fetching with tenant ID:', currentTenant.id);

      // First, fetch all categories to find the Roles/Relationships category
      const categoriesResponse = await api.get<any[]>('/api/masterdata/categories', headers);
      const categories = categoriesResponse.data;

      if (!categories || !Array.isArray(categories)) {
        console.log('No categories returned, using defaults');
        setRelationships(DEFAULT_RELATIONSHIPS);
        return;
      }

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
          `/api/masterdata/categories/${relationshipCategory.id}/details`,
          headers
        );
        const details = detailsResponse.data;

        if (details && Array.isArray(details) && details.length > 0) {
          const transformedRelationships: Relationship[] = details
            .filter((d: any) => d.IsActive !== false)
            .map((d: any) => {
              const name = d.Name || d.name || 'Unknown';
              const lowerName = name.toLowerCase();
              return {
                id: d.id,
                name: name,
                displayName: d.DisplayName || name,
                icon: RELATIONSHIP_ICONS[lowerName] || 'account',
                description: d.Description || d.description,
                sequence: d.Sequence || d.sequence || 99,
                defaultMessage: DEFAULT_MESSAGES[lowerName] || DEFAULT_MESSAGES.other,
              };
            })
            .sort((a: Relationship, b: Relationship) => (a.sequence || 99) - (b.sequence || 99));

          // Add "Other" option if not present
          if (!transformedRelationships.find((r) => r.name.toLowerCase() === 'other')) {
            transformedRelationships.push({
              id: 'other',
              name: 'Other',
              displayName: 'Other',
              icon: 'account-plus',
              sequence: 999,
              defaultMessage: DEFAULT_MESSAGES.other,
            });
          }

          setRelationships(transformedRelationships);
        } else {
          console.log('No relationship details found, using defaults');
          setRelationships(DEFAULT_RELATIONSHIPS);
        }
      } else {
        // Use default relationships if category not found
        console.log('Roles/Relationships category not found, using defaults');
        setRelationships(DEFAULT_RELATIONSHIPS);
      }
    } catch (err: any) {
      console.error('Error fetching relationships:', err);
      // Don't set error state - just use defaults silently
      // This prevents showing error toasts for non-critical data
      setRelationships(DEFAULT_RELATIONSHIPS);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentTenant?.id]);

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

export default useRelationships;
