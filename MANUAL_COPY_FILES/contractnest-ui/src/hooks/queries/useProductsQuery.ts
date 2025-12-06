// src/hooks/queries/useProductsQuery.ts
// Hook to fetch products via API (following codebase patterns)

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
 * Fetch products via API layer
 * Uses the api service which includes auth headers (Authorization, x-tenant-id, x-product, etc.)
 */
const fetchProducts = async (): Promise<Product[]> => {
  const response = await api.get<ProductsResponse>(API_ENDPOINTS.PRODUCTS.LIST);

  if (!response.data.success) {
    throw new Error('Failed to fetch products');
  }

  return response.data.data;
};

/**
 * Fetch single product by code
 */
const fetchProductByCode = async (code: string): Promise<Product> => {
  const response = await api.get<{ success: boolean; data: Product }>(
    API_ENDPOINTS.PRODUCTS.GET(code)
  );

  if (!response.data.success) {
    throw new Error('Failed to fetch product');
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
 * Hook to get a single product by code
 */
export const useProduct = (code: string) => {
  return useQuery({
    queryKey: productKeys.detail(code),
    queryFn: () => fetchProductByCode(code),
    enabled: !!code,
    staleTime: 5 * 60 * 1000,
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
