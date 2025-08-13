
import React, { useState, useEffect } from 'react';
import { Category, Expense } from '../../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface CategoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  allCategories: Category[];
  expenses: Expense[];
  onUpdateExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onDeleteMultipleExpenses: (expenseIds: string[]) => void;
}

const ExpenseRow: React.FC<{
    expense: Expense;
    allCategories: Category[];
    onUpdate: (expense: Expense) => void;
    onDelete: (expenseId: string) => void;
    isSelected: boolean;
    onSelect: (expenseId: string, checked: boolean) => void;
}> = ({ expense, allCategories, onUpdate, onDelete, isSelected, onSelect }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedExpense, setEditedExpense] = useState(expense);

    const handleUpdate = () => {
        onUpdate(editedExpense);
        setIsEditing(false);
    }
    
    if (isEditing) {
        return (
            <div className="grid grid-cols-12 gap-2 items-center p-2 bg-slate-700/80 rounded-lg">
                <div className="col-span-1"></div> {/* Placeholder for alignment */}
                <input type="text" value={editedExpense.name} onChange={e => setEditedExpense({...editedExpense, name: e.target.value})} className="col-span-3 bg-slate-600 rounded p-1 text-sm"/>
                <input type="number" value={editedExpense.amount} onChange={e => setEditedExpense({...editedExpense, amount: parseFloat(e.target.value)})} className="col-span-2 bg-slate-600 rounded p-1 text-sm"/>
                <input 
                    type="date" 
                    value={new Date(editedExpense.date).toLocaleDateString('en-CA')} 
                    onChange={e => {
                        const dateString = e.target.value;
                        if (dateString) {
                            const [year, month, day] = dateString.split('-').map(Number);
                            const correctDate = new Date(year, month - 1, day);
                            setEditedExpense({...editedExpense, date: correctDate.toISOString()});
                        }
                    }}
                    className="col-span-2 bg-slate-600 rounded p-1 text-sm"
                />
                 <select value={editedExpense.categoryId} onChange={e => setEditedExpense({...editedExpense, categoryId: e.target.value})} className="col-span-2 bg-slate-600 rounded p-1 text-sm">
                    {allCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
                <div className="col-span-2 flex justify-end items-center gap-1">
                   <Button onClick={handleUpdate} size="sm">Save</Button>
                   <Button variant="secondary" onClick={() => setIsEditing(false)} size="sm">Cancel</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-12 gap-2 items-center p-2 hover:bg-slate-700/50 rounded-lg transition-colors">
            <div className="col-span-1 flex justify-center">
                <input 
                    type="checkbox" 
                    className="form-checkbox h-5 w-5 bg-slate-600 border-slate-500 text-purple-600 focus:ring-purple-500 rounded"
                    checked={isSelected}
                    onChange={(e) => onSelect(expense.id, e.target.checked)}
                    aria-label={`Select expense ${expense.name}`}
                />
            </div>
            <span className="col-span-3 truncate">{expense.name}</span>
            <span className="col-span-2 text-right font-mono">${expense.amount.toFixed(2)}</span>
            <span className="col-span-3 text-center">{new Date(expense.date).toLocaleDateString()}</span>
             <div className="col-span-3 flex justify-end items-center gap-2">
                <Button variant="ghost" size="icon-sm" onClick={() => setIsEditing(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                </Button>
                <Button variant="danger" size="icon-sm" onClick={() => onDelete(expense.id)}>
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                </Button>
            </div>
        </div>
    )
}


export const CategoryDetailModal: React.FC<CategoryDetailModalProps> = ({ isOpen, onClose, category, allCategories, expenses, onUpdateExpense, onDeleteExpense, onDeleteMultipleExpenses }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    if(isOpen) {
        setSelectedIds(new Set());
    }
  }, [isOpen]);

  if (!category) return null;

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (checked) {
            newSet.add(id);
        } else {
            newSet.delete(id);
        }
        return newSet;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
        setSelectedIds(new Set(expenses.map(exp => exp.id)));
    } else {
        setSelectedIds(new Set());
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} selected expense(s)?`)) {
        onDeleteMultipleExpenses(Array.from(selectedIds));
        setSelectedIds(new Set());
    }
  };

  const isAllSelected = expenses.length > 0 && selectedIds.size === expenses.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Details for ${category.name}`} size="lg">
      <div className="space-y-4">
        <div className="bg-slate-700/50 p-4 rounded-lg flex justify-between items-center">
            <div>
                <div className="text-slate-400 text-sm">Total Budgeted</div>
                <div className="text-2xl font-bold text-white">${category.budgeted.toFixed(2)}</div>
            </div>
            <div>
                <div className="text-slate-400 text-sm">Total Spent</div>
                <div className="text-2xl font-bold text-red-400">${totalSpent.toFixed(2)}</div>
            </div>
             <div>
                <div className="text-slate-400 text-sm">Remaining</div>
                <div className={`text-2xl font-bold ${totalSpent > category.budgeted ? 'text-red-500' : 'text-green-400'}`}>
                    ${(category.budgeted - totalSpent).toFixed(2)}
                </div>
            </div>
        </div>
        
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-12 gap-2 items-center p-2 text-slate-400 font-semibold text-sm border-b border-slate-700">
                <div className="col-span-1 flex justify-center">
                    <input 
                        type="checkbox"
                        className="form-checkbox h-5 w-5 bg-slate-600 border-slate-500 text-purple-600 focus:ring-purple-500 rounded"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        aria-label="Select all expenses"
                        disabled={expenses.length === 0}
                     />
                </div>
                <span className="col-span-3">Name</span>
                <span className="col-span-2 text-right">Amount</span>
                <span className="col-span-3 text-center">Date</span>
                <span className="col-span-3 text-right">Actions</span>
            </div>
          {expenses.length > 0 ? (
            expenses
              .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(exp => (
                <ExpenseRow 
                    key={exp.id} 
                    expense={exp}
                    allCategories={allCategories} 
                    onUpdate={onUpdateExpense} 
                    onDelete={onDeleteExpense}
                    isSelected={selectedIds.has(exp.id)}
                    onSelect={handleSelect}
                />
            ))
          ) : (
            <p className="text-center text-slate-500 py-8">No expenses in this category yet.</p>
          )}
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-slate-700">
            <div>
                 {selectedIds.size > 0 && (
                    <Button variant="danger" onClick={handleDeleteSelected}>
                        Delete Selected ({selectedIds.size})
                    </Button>
                 )}
            </div>
            <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
};