// src/hooks/queries/useProductsQuery.ts
// Hook to fetch products via API (not edge function directly)

import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

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
 * Fetch products via API layer (which proxies to edge function)
 */
const fetchProducts = async (): Promise<Product[]> => {
  const response = await api.get<ProductsResponse>(API_ENDPOINTS.PRODUCTS.LIST);

  if (!response.data.success) {
    throw new Error('Failed to fetch products');
  }

  return response.data.data;
};

/**
 * Hook to get all active products
 */
export const useProducts = () => {
  return useQuery({
    queryKey: productKeys.list(),
    queryFn: fetchProducts,
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
