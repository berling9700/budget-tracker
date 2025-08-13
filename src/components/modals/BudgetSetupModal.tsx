
import React, { useState, useEffect } from 'react';
import { Budget, Category } from '../../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface BudgetSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (budget: Omit<Budget, 'id' | 'expenses'>) => void;
  onDelete: (budgetId: string) => void;
  initialBudget?: Budget | null;
  allBudgets?: Budget[];
}

export const BudgetSetupModal: React.FC<BudgetSetupModalProps> = ({ isOpen, onClose, onSave, onDelete, initialBudget, allBudgets }) => {
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [categories, setCategories] = useState<Category[]>([{ id: `cat-${Date.now()}`, name: '', budgeted: 0 }]);
  const [copyFromBudgetId, setCopyFromBudgetId] = useState('');
  
  const resetForm = (budget?: Budget | null) => {
    setName(budget?.name || `${new Date().getFullYear()} Budget`);
    setYear(budget?.year || new Date().getFullYear());
    setCategories(budget?.categories.length ? budget.categories : [{ id: `cat-${Date.now()}`, name: '', budgeted: 0 }]);
    setCopyFromBudgetId('');
  };
  
  useEffect(() => {
    if (isOpen) {
        resetForm(initialBudget);
    }
  }, [isOpen, initialBudget]);

  useEffect(() => {
    if (copyFromBudgetId) {
        const budgetToCopy = allBudgets?.find(b => b.id === copyFromBudgetId);
        if (budgetToCopy) {
            setName(`Copy of ${budgetToCopy.name}`);
            setYear(new Date().getFullYear());
            setCategories(budgetToCopy.categories.map((cat, index) => ({
                ...cat,
                id: `cat-${Date.now()}-${index}` // Generate new IDs for copies
            })));
        }
    } else {
        // If "Don't copy" is selected, reset to default new budget form
        if (!initialBudget) {
            resetForm();
        }
    }
  }, [copyFromBudgetId, allBudgets, initialBudget]);

  const handleCategoryChange = <T,>(index: number, field: keyof Category, value: T) => {
    const newCategories = [...categories];
    newCategories[index] = { ...newCategories[index], [field]: value };
    setCategories(newCategories);
  };

  const addCategory = () => {
    setCategories([...categories, { id: `cat-${Date.now()}`, name: '', budgeted: 0 }]);
  };

  const removeCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // A category is valid as long as it has a name. A budget of 0 is allowed.
    // This prevents deleting categories like 'Other' which may hold expenses but have no budgeted amount.
    const finalCategories = categories.filter(c => c.name.trim() !== '');
    if (finalCategories.length > 0 && name.trim()) {
        onSave({
            name,
            year,
            categories: finalCategories,
        });
        onClose();
    } else {
        alert("Please provide a budget name and at least one category.");
    }
  };

  const handleDelete = () => {
    if (initialBudget) {
      if (window.confirm(`Are you sure you want to permanently delete the budget "${initialBudget.name}"? All of its categories and expenses will be lost.`)) {
        onDelete(initialBudget.id);
        onClose();
      }
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialBudget ? "Edit Budget" : "Create Budget"} size="lg">
      <div className="space-y-6">
        {!initialBudget && allBudgets && allBudgets.length > 0 && (
            <div>
                 <label className="block text-sm font-medium text-slate-400 mb-1">Copy from existing budget?</label>
                 <select
                    value={copyFromBudgetId}
                    onChange={e => setCopyFromBudgetId(e.target.value)}
                    className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2"
                 >
                    <option value="">Start with a blank budget</option>
                    {allBudgets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                 </select>
            </div>
        )}
        <div className="grid grid-cols-2 gap-4">
           <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Budget Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2"
              placeholder="e.g., 2024 Personal Budget"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Year</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2"
            />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Categories</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {categories.map((category, index) => (
              <div key={category.id} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  placeholder="Category Name (e.g., Groceries)"
                  value={category.name}
                  onChange={e => handleCategoryChange(index, 'name', e.target.value)}
                  className="col-span-6 bg-slate-700 border-slate-600 text-white rounded-md p-2"
                />
                <input
                  type="number"
                  placeholder="Budgeted Amount"
                  value={category.budgeted}
                  onChange={e => handleCategoryChange(index, 'budgeted', parseFloat(e.target.value) || 0)}
                  className="col-span-4 bg-slate-700 border-slate-600 text-white rounded-md p-2"
                />
                <div className="col-span-2 flex justify-end">
                  <Button variant="danger" size="icon-sm" onClick={() => removeCategory(index)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                    </svg>
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button onClick={addCategory} variant="secondary" className="mt-4">Add Category</Button>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-slate-700">
          <div>
            {initialBudget && (
              <Button variant="danger" onClick={handleDelete}>Delete Budget</Button>
            )}
          </div>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>{initialBudget ? 'Save Changes' : 'Save Budget'}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};