import React from 'react';
import { Budget, Expense } from '../../types';
import { Dashboard } from './Dashboard';
import { Button } from './ui/Button';

interface BudgetViewProps {
    activeBudget: Budget | undefined;
    viewMonth: number;
    setViewMonth: (month: number) => void;
    onUpdateExpense: (expense: Expense) => void;
    onDeleteExpense: (expenseId: string) => void;
    onDeleteMultipleExpenses: (expenseIds: string[]) => void;
    onUpdateMultipleExpensesCategory: (expenseIds: string[], newCategoryId: string) => void;
    onEditBudget: () => void;
    onGetStarted: () => void;
}

const MonthSelector: React.FC<{selectedMonth: number, onSelectMonth: (month: number) => void}> = ({selectedMonth, onSelectMonth}) => {
    const months = ["Annual", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return (
        <div className="flex flex-wrap gap-1 md:gap-2 items-center bg-slate-800/50 p-2 rounded-lg mb-8">
            {months.map((month, index) => (
                <button
                    key={index}
                    onClick={() => onSelectMonth(index)}
                    className={`flex-1 text-center px-2 py-1 text-sm font-semibold rounded-md transition-colors ${selectedMonth === index ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                >
                    {month}
                </button>
            ))}
        </div>
    )
}

export const BudgetView: React.FC<BudgetViewProps> = ({
    activeBudget,
    viewMonth,
    setViewMonth,
    onUpdateExpense,
    onDeleteExpense,
    onDeleteMultipleExpenses,
    onUpdateMultipleExpensesCategory,
    onEditBudget,
    onGetStarted,
}) => {
    return (
        <>
        {activeBudget ? (
            <>
              <MonthSelector selectedMonth={viewMonth} onSelectMonth={setViewMonth} />
              <Dashboard 
                budget={activeBudget} 
                viewMonth={viewMonth} 
                onUpdateExpense={onUpdateExpense} 
                onDeleteExpense={onDeleteExpense}
                onDeleteMultipleExpenses={onDeleteMultipleExpenses}
                onUpdateMultipleExpensesCategory={onUpdateMultipleExpensesCategory}
                onEditBudget={onEditBudget} 
              />
            </>
          ) : (
            <div className="text-center py-20 bg-slate-800 rounded-xl">
              <h2 className="text-2xl font-semibold text-white">No budget found.</h2>
              <p className="text-slate-400 mt-2 mb-6">Create your first budget to start tracking your finances.</p>
              <Button onClick={onGetStarted}>Get Started</Button>
            </div>
          )}
        </>
    )
}