export interface Holding {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  purchasePrice: number;
  currentPrice: number;
}

export type AssetType = 'Brokerage' | 'Retirement' | 'HSA' | 'Cash & Savings' | 'Real Estate' | 'Vehicle' | 'Other';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  value?: number; // For single-value assets
  holdings?: Holding[]; // For accounts with multiple holdings
}

export interface Liability {
  id: string;
  name: string;
  amount: number;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  date: string; // ISO string
  categoryId: string;
}

export interface Category {
  id:string;
  name: string;
  budgeted: number;
}

export interface Budget {
  id: string;
  name: string;
  year: number;
  categories: Category[];
  expenses: Expense[];
}