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