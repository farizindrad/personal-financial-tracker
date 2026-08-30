export type Paginated<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};

export type NavItem = {
  to: string;
  label: string;
};
