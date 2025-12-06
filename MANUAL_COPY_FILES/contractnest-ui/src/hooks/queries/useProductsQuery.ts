// src/hooks/queries/useProductsQuery.ts
// Hook to fetch products from the products edge function

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';

export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  settings?: Record<string, any>;
  created_at: string;
}

export interface ProductsResponse {
  success: boolean;
  data: Product[];
  count: number;
}

export const productKeys = {
  all: ['products'] as const,
  list: () => [...productKeys.all, 'list'] as const,
  detail: (code: string) => [...productKeys.all, 'detail', code] as const,
};

/**
 * Fetch products from the edge function
 */
const fetchProducts = async (token: string, supabaseUrl: string): Promise<Product[]> => {
  const response = await fetch(`${supabaseUrl}/functions/v1/products`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status}`);
  }

  const result: ProductsResponse = await response.json();

  if (!result.success) {
    throw new Error('Failed to fetch products');
  }

  return result.data;
};

/**
 * Hook to get all active products
 */
export const useProducts = () => {
  const { user } = useAuth();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  return useQuery({
    queryKey: productKeys.list(),
    queryFn: async () => {
      if (!user?.token) {
        throw new Error('User not authenticated');
      }
      return fetchProducts(user.token, supabaseUrl);
    },
    enabled: !!user?.token && !!supabaseUrl,
    staleTime: 5 * 60 * 1000, // 5 minutes - products don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  });
};

/**
 * Get the default product code
 */
export const useDefaultProduct = () => {
  const { data: products, isLoading } = useProducts();

  const defaultProduct = products?.find(p => p.is_default) || products?.[0];

  return {
    defaultProductCode: defaultProduct?.code || 'contractnest',
    isLoading,
  };
};

export default useProducts;
