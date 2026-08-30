export type AssetType = 'property' | 'vehicle' | 'investment' | 'gold' | 'cash' | 'other';

export type Asset = {
  id: number;
  name: string;
  type: AssetType;
  value: string | number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
