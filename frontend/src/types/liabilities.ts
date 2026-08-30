export type LiabilityType = 'credit_card' | 'loan' | 'other';

export type Liability = {
  id: number;
  name: string;
  type: LiabilityType;
  amount: string | number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
