import { PAGE } from './labels';

export type NavSection = {
  title: string;
  items: { to: string; label: string }[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Ringkasan',
    items: [{ to: '/', label: PAGE.dashboard }],
  },
  {
    title: 'Keuangan',
    items: [
      { to: '/transactions', label: PAGE.transactions },
      { to: '/accounts', label: PAGE.accounts },
      { to: '/assets', label: PAGE.assets },
    ],
  },
  {
    title: 'Perencanaan',
    items: [
      { to: '/categories', label: PAGE.categories },
      { to: '/budgets', label: PAGE.budgets },
      { to: '/savings-goals', label: PAGE.savingsGoals },
    ],
  },
];

export const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);
