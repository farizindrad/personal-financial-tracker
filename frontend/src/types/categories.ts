import type { Paginated } from './index';

export type CategoryType = 'income' | 'expense';

export type Category = {
  id: number;
  name: string;
  type: CategoryType;
  parentId: number | null;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  children?: Category[];
};

export type CategoriesResponse = Paginated<Category>;

export type CategoryInput = {
  name: string;
  type: CategoryType;
  parentId?: number;
  color?: string;
  icon?: string;
};

export type CategoryUpdateInput = {
  name?: string;
  parentId?: number | null;
  color?: string;
  icon?: string;
  isActive?: boolean;
};
