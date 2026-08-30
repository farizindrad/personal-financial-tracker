import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { Budget, BudgetInput, BudgetsResponse } from '../types/budgets';

export function useBudgets(month: number, year: number, page = 1, limit = 50) {
  return useQuery({
    queryKey: ['budgets', month, year, page, limit],
    queryFn: () =>
      apiClient<BudgetsResponse>(
        `/budgets?month=${month}&year=${year}&page=${page}&limit=${limit}`,
      ),
  });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BudgetInput) =>
      apiClient<Budget>('/budgets', { method: 'POST', body }),
    onSuccess: async (_data, vars) => {
      await Promise.all([
        qc.invalidateQueries({
          queryKey: ['budgets', vars.month, vars.year],
        }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}
