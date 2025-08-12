import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Budget, Category, Expense } from '../../types';
import { CategoryDetailModal } from './modals/CategoryDetailModal';
import { Button } from './ui/Button';

interface DashboardProps {
  budget: Budget;
  viewMonth: number; // 0 for Annual, 1-12 for months
  onUpdateExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onEditBudget: () => void;
}

const CategoryRow: React.FC<{
  category: Category;
  spent: number;
  onClick: () => void;
}> = ({ category, spent, onClick }) => {
  const percentage = category.budgeted > 0 ? (spent / category.budgeted) * 100 : 0;
  const isOverBudget = spent > category.budgeted;
  const progressBarColor = isOverBudget ? 'bg-red-500' : 'bg-purple-500';

  return (
    <div
      className="bg-slate-800 p-4 rounded-lg hover:bg-slate-700/80 transition-all cursor-pointer shadow-md"
      onClick={onClick}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-white">{category.name}</span>
        <span className={`font-mono text-sm ${isOverBudget ? 'text-red-400' : 'text-slate-300'}`}>
          ${spent.toFixed(2)} / ${category.budgeted.toFixed(2)}
        </span>
      </div>
      <div className="w-full bg-slate-600 rounded-full h-2.5">
        <div
          className={`${progressBarColor} h-2.5 rounded-full`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
      {isOverBudget && (
          <p className="text-xs text-red-400 mt-1 text-right">
              Over budget by ${(spent - category.budgeted).toFixed(2)}
          </p>
      )}
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ budget, viewMonth, onUpdateExpense, onDeleteExpense, onEditBudget }) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const filteredExpenses = useMemo(() => {
    if (viewMonth === 0) { // Annual view
      return budget.expenses;
    }
    return budget.expenses.filter(exp => {
      const expenseMonth = new Date(exp.date).getUTCMonth() + 1; // 1-12
      return expenseMonth === viewMonth;
    });
  }, [budget.expenses, viewMonth]);


  const { totalBudgeted, totalSpent, remaining, chartData, categorySpending } = useMemo(() => {
    // If monthly view, adjust total budgeted amount proportionally.
    const budgetDivisor = viewMonth === 0 ? 1 : 12;
    const totalBudgeted = budget.categories.reduce((sum, cat) => sum + (cat.budgeted / budgetDivisor), 0);
    
    const totalSpent = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const categorySpending = new Map<string, number>();
    filteredExpenses.forEach(exp => {
      const currentSpent = categorySpending.get(exp.categoryId) || 0;
      categorySpending.set(exp.categoryId, currentSpent + exp.amount);
    });

    const chartData = budget.categories.map(cat => ({
      name: cat.name,
      Budgeted: (cat.budgeted / budgetDivisor),
      Spent: categorySpending.get(cat.id) || 0,
    }));

    return {
      totalBudgeted,
      totalSpent,
      remaining: totalBudgeted - totalSpent,
      chartData,
      categorySpending
    };
  }, [budget.categories, filteredExpenses, viewMonth]);
  
  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category);
  };

  const handleCloseDetailModal = () => {
    setSelectedCategory(null);
  };
  
  const selectedCategoryExpenses = useMemo(() => {
    if (!selectedCategory) return [];
    // The expenses passed to the modal should also be filtered by the current view
    return filteredExpenses.filter(exp => exp.categoryId === selectedCategory.id);
  }, [selectedCategory, filteredExpenses])
  
  // The category object passed to the detail modal should have its budget adjusted for the view
  const adjustedSelectedCategory = useMemo(() => {
      if(!selectedCategory) return null;
      const budgetDivisor = viewMonth === 0 ? 1 : 12;
      return {
          ...selectedCategory,
          budgeted: selectedCategory.budgeted / budgetDivisor
      }
  }, [selectedCategory, viewMonth]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg text-center">
            <h3 className="text-slate-400 text-lg">Total Budgeted</h3>
            <p className="text-4xl font-bold text-purple-400">${totalBudgeted.toFixed(2)}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg text-center">
            <h3 className="text-slate-400 text-lg">Total Spent</h3>
            <p className="text-4xl font-bold text-red-400">${totalSpent.toFixed(2)}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg text-center">
            <h3 className="text-slate-400 text-lg">Remaining</h3>
            <p className={`text-4xl font-bold ${remaining >= 0 ? 'text-green-400' : 'text-red-500'}`}>${remaining.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl shadow-lg relative">
        <h3 className="text-xl font-bold text-white mb-4">Spending Overview</h3>
        <Button variant="ghost" onClick={onEditBudget} size="icon-md" className="absolute top-4 right-4 text-slate-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
            </svg>
        </Button>
         <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}
                    cursor={{fill: 'rgba(139, 92, 246, 0.1)'}}
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                />
                <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                <Bar dataKey="Budgeted" fill="#8b5cf6" />
                <Bar dataKey="Spent" fill="#F56565" />
            </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-bold text-white mb-4">Category Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {budget.categories.map(cat => {
                  const budgetDivisor = viewMonth === 0 ? 1 : 12;
                  const adjustedCategory = {...cat, budgeted: cat.budgeted / budgetDivisor}
                  return (
                    <CategoryRow 
                        key={cat.id} 
                        category={adjustedCategory}
                        spent={categorySpending.get(cat.id) || 0}
                        onClick={() => handleCategoryClick(cat)}
                    />
                  );
                })}
          </div>
      </div>
      
      <CategoryDetailModal 
        isOpen={!!selectedCategory}
        onClose={handleCloseDetailModal}
        category={adjustedSelectedCategory}
        expenses={selectedCategoryExpenses}
        onUpdateExpense={onUpdateExpense}
        onDeleteExpense={onDeleteExpense}
      />
    </div>
  );
};