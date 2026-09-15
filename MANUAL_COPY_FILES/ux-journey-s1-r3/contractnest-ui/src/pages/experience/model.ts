import type { Contract } from '@/types/contracts';

export type ExperiencePerspective = 'revenue' | 'expense';
export type StartAction = 'create' | 'record' | 'request' | 'respond' | 'claim';
export const startActions = (perspective: ExperiencePerspective): StartAction[] =>
  perspective === 'revenue' ? ['create', 'record', 'respond', 'claim'] : ['request', 'create', 'record', 'claim'];
export const experienceKey = (tenantId: string, isLive: boolean, perspective: ExperiencePerspective) =>
  ['experience', 'contracts', tenantId, isLive, perspective] as const;
// Same relationship filter as the existing Contracts Hub.
export const relationshipFilter = (perspective: ExperiencePerspective) =>
  perspective === 'revenue' ? 'client,partner' : 'vendor';
export interface ContractSnapshot { items: Contract[]; total: number }
// A failed or changed response must never look like an empty workspace.
export function parseContractSnapshot(payload: unknown): ContractSnapshot {
  const envelope = payload as { data?: unknown } | null;
  const data = (envelope?.data ?? payload) as { items?: unknown; total_count?: unknown } | null;
  if (!data || !Array.isArray(data.items) || typeof data.total_count !== 'number' ||
      !Number.isFinite(data.total_count) || data.total_count < data.items.length ||
      !data.items.every(item => item && typeof item.id === 'string' && typeof item.status === 'string')) {
    throw new Error('Contract summary is unavailable.');
  }
  return { items: data.items as Contract[], total: data.total_count };
}
export function contractDestination(contract: Pick<Contract, 'id' | 'status'>) {
  // The hub owns draft hydration and wizard resumption.
  return contract.status === 'draft' ? '/contracts' : `/contracts/${encodeURIComponent(contract.id)}`;
}
export const readableStatus = (status: string) => status.replace(/_/g, ' ').replace(/^./, first => first.toUpperCase());
export function textOnBrand(hex: string) {
  const value = hex.replace('#', '');
  if (!/^[\da-f]{6}$/i.test(value)) return '#ffffff';
  const channels = [0, 2, 4].map(offset => {
    const s = parseInt(value.slice(offset, offset + 2), 16) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const l = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return (l + 0.05) / 0.05 >= 1.05 / (l + 0.05) ? '#000000' : '#ffffff';
}
