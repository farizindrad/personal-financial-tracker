import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { Paginated } from '../types';
import type { Asset } from '../types/assets';

export type AssetInput = {
  name: string;
  type?: string;
  value: number;
  notes?: string;
};

export function useAssets(page = 1, limit = 100) {
  return useQuery({
    queryKey: ['assets', page, limit],
    queryFn: () =>
      apiClient<Paginated<Asset>>(`/assets?page=${page}&limit=${limit}`),
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AssetInput) =>
      apiClient<Asset>('/assets', { method: 'POST', body }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['assets'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: AssetInput }) =>
      apiClient<Asset>(`/assets/${id}`, { method: 'PATCH', body }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['assets'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient<void>(`/assets/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['assets'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}
