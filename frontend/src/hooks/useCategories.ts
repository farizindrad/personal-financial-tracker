import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  CategoriesResponse,
  Category,
  CategoryInput,
  CategoryType,
  CategoryUpdateInput,
} from '../types/categories';

export function useCategories(type?: CategoryType, page = 1, limit = 50) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (type) params.set('type', type);

  return useQuery({
    queryKey: ['categories', type ?? 'all', page, limit],
    queryFn: () =>
      apiClient<CategoriesResponse>(`/categories?${params.toString()}`),
  });
}

/** Flatten root + children for select options */
export function flattenCategories(roots: Category[]): Category[] {
  const out: Category[] = [];
  for (const root of roots) {
    out.push(root);
    for (const child of root.children ?? []) {
      out.push({ ...child, name: `${root.name} / ${child.name}` });
    }
  }
  return out;
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CategoryInput) =>
      apiClient<Category>('/categories', { method: 'POST', body }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CategoryUpdateInput }) =>
      apiClient<Category>(`/categories/${id}`, { method: 'PATCH', body }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
