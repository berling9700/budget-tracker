export interface Holding {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  purchasePrice: number;
  currentPrice: number;
}

export interface InvestmentAccount {
  id: string;
  name: string;
  type: 'Brokerage' | 'Roth IRA' | 'Traditional IRA' | '401k' | 'HSA' | 'Other';
  holdings: Holding[];
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