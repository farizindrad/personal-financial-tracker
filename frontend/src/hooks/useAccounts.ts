import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  Account,
  AccountInput,
  AccountsResponse,
} from '../types/accounts';

export function useAccounts(page = 1, limit = 100) {
  return useQuery({
    queryKey: ['accounts', page, limit],
    queryFn: () =>
      apiClient<AccountsResponse>(`/accounts?page=${page}&limit=${limit}`),
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AccountInput) =>
      apiClient<Account>('/accounts', { method: 'POST', body }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['accounts'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: AccountInput }) =>
      apiClient<Account>(`/accounts/${id}`, { method: 'PATCH', body }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['accounts'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient<void>(`/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['accounts'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}
