import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { DailySummary } from '../types/dashboard';

export function useDailySummary(month?: number, year?: number) {
  const params = new URLSearchParams();
  if (month != null) params.set('month', String(month));
  if (year != null) params.set('year', String(year));
  const qs = params.toString();

  return useQuery({
    queryKey: ['dashboard', 'daily', month ?? null, year ?? null],
    queryFn: () =>
      apiClient<DailySummary>(`/dashboard/daily${qs ? `?${qs}` : ''}`),
  });
}
