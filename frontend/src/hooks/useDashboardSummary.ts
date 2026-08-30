import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { DashboardSummary } from '../types/dashboard';

export function useDashboardSummary(month?: number, year?: number) {
  const params = new URLSearchParams();
  if (month != null) params.set('month', String(month));
  if (year != null) params.set('year', String(year));
  const qs = params.toString();

  return useQuery({
    queryKey: ['dashboard', 'summary', month ?? null, year ?? null],
    queryFn: () =>
      apiClient<DashboardSummary>(
        `/dashboard/summary${qs ? `?${qs}` : ''}`,
      ),
  });
}
