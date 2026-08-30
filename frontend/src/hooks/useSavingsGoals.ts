import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  SavingsGoal,
  SavingsGoalInput,
  SavingsGoalUpdateInput,
  SavingsGoalsResponse,
} from '../types/savings-goals';

export function useSavingsGoals(page = 1, limit = 50) {
  return useQuery({
    queryKey: ['savings-goals', page, limit],
    queryFn: () =>
      apiClient<SavingsGoalsResponse>(
        `/savings-goals?page=${page}&limit=${limit}`,
      ),
  });
}

export function useCreateSavingsGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SavingsGoalInput) =>
      apiClient<SavingsGoal>('/savings-goals', { method: 'POST', body }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['savings-goals'] });
    },
  });
}

export function useUpdateSavingsGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: SavingsGoalUpdateInput;
    }) =>
      apiClient<SavingsGoal>(`/savings-goals/${id}`, {
        method: 'PATCH',
        body,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['savings-goals'] });
    },
  });
}
