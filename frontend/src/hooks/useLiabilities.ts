import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { Paginated } from '../types';
import type { Liability } from '../types/liabilities';

export type LiabilityInput = {
  name: string;
  type?: string;
  amount: number;
  notes?: string;
};

export function useLiabilities(page = 1, limit = 100) {
  return useQuery({
    queryKey: ['liabilities', page, limit],
    queryFn: () =>
      apiClient<Paginated<Liability>>(
        `/liabilities?page=${page}&limit=${limit}`,
      ),
  });
}

export function useCreateLiability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LiabilityInput) =>
      apiClient<Liability>('/liabilities', { method: 'POST', body }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['liabilities'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}

export function useUpdateLiability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: LiabilityInput }) =>
      apiClient<Liability>(`/liabilities/${id}`, { method: 'PATCH', body }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['liabilities'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}

export function useDeleteLiability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient<void>(`/liabilities/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['liabilities'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}
