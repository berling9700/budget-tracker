
import React, { useState, useEffect } from 'react';
import { Expense, Category } from '../../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { parseCsvExpenses, ParsedExpenseData } from '../../services/geminiService';

type ExpenseToReview = Partial<Omit<Expense, 'id'>> & { categoryName?: string };

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expenses: (Omit<Expense, 'id' | 'categoryId'> & { categoryId?: string; categoryName?: string })[]) => void;
  categories: Category[];
}

type Mode = 'single' | 'bulk';

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose, onSave, categories }) => {
  const [mode, setMode] = useState<Mode>('single');

  // State for single expense
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [categoryId, setCategoryId] = useState('');
  
  // State for bulk expense
  const [csvContent, setCsvContent] = useState('');
  const [parsedExpenses, setParsedExpenses] = useState<ExpenseToReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');


  useEffect(() => {
    if (isOpen) {
      // Reset forms on open
      setName('');
      setAmount('');
      setDate(new Date().toLocaleDateString('en-CA'));
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setMode('single');
      setCsvContent('');
      setParsedExpenses([]);
      setError('');
      setIsLoading(false);
    }
  }, [isOpen, categories]);
  
  const handleSingleSave = () => {
    if (!name || !amount || !categoryId || parseFloat(amount) <= 0 || !date) {
      alert("Please fill out all fields and enter a valid amount and date.");
      return;
    }
    const [year, month, day] = date.split('-').map(Number);
    const correctDate = new Date(year, month - 1, day);

    onSave([{
      name,
      amount: parseFloat(amount),
      date: correctDate.toISOString(),
      categoryId
    }]);
    onClose();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCsvContent(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleParse = async () => {
    if (!csvContent.trim()) return;
    setIsLoading(true);
    setError('');
    setParsedExpenses([]);
    try {
      const result = await parseCsvExpenses(csvContent, categories);
      const expensesToReview = result.map(exp => {
          const category = categories.find(c => c.name.toLowerCase() === exp.categoryName?.toLowerCase());
          return {
              name: exp.name,
              amount: exp.amount,
              date: exp.date,
              categoryId: category?.id,
              // Keep the original name if we couldn't find a category, so we can create it later.
              categoryName: exp.categoryName,
          };
      });
      setParsedExpenses(expensesToReview);
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBulkSave = () => {
    const expensesToSave = parsedExpenses
        .map(exp => {
            // Ensure date is a valid ISO string before saving
            if (exp.date && !exp.date.includes('T')) {
                const [year, month, day] = exp.date.split('-').map(Number);
                const correctDate = new Date(year, month - 1, day);
                return {...exp, date: correctDate.toISOString()};
            }
            return exp;
        })
        .map(exp => ({
            name: exp.name,
            amount: exp.amount,
            date: exp.date,
            categoryId: exp.categoryId,
            categoryName: !exp.categoryId ? exp.categoryName : undefined
        }))
        .filter(
            (exp: Record<string, any>): exp is (Omit<Expense, 'id' | 'categoryId'> & { categoryId?: string; categoryName?: string }) => 
                !!exp.name && !!exp.amount && !!exp.date && (!!exp.categoryId || !!exp.categoryName)
        );
    
    if (expensesToSave.length > 0) {
      onSave(expensesToSave);
      onClose();
    } else {
        alert("No valid expenses to add. Please check the parsed results or try parsing again.")
    }
  };
  
  const handleExpenseChange = <T,>(index: number, field: keyof ExpenseToReview, value: T) => {
    const newExpenses = [...parsedExpenses];
    const newExpense = { ...newExpenses[index], [field]: value };
    newExpenses[index] = newExpense;
    setParsedExpenses(newExpenses);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Expenses" size={mode === 'bulk' ? 'xl' : 'md'}>
        <div className="mb-4 border-b border-slate-700">
            <nav className="flex space-x-2">
                <button onClick={() => setMode('single')} className={`px-4 py-2 text-sm font-medium rounded-t-lg ${mode === 'single' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    Single Expense
                </button>
                <button onClick={() => setMode('bulk')} className={`px-4 py-2 text-sm font-medium rounded-t-lg ${mode === 'bulk' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    Bulk from CSV
                </button>
            </nav>
        </div>

      {mode === 'single' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Expense Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2" placeholder="e.g., Coffee"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Amount</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Category</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2" >
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSingleSave}>Add Expense</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Upload CSV File</label>
              <input type="file" accept=".csv" onChange={handleFileChange} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"/>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleParse} disabled={isLoading || !csvContent.trim()}>
                {isLoading ? 'Parsing with AI...' : 'Parse CSV'}
              </Button>
            </div>
            {error && <p className="text-red-500 text-center">{error}</p>}
            {parsedExpenses.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-700">
                <h3 className="text-lg font-semibold text-white">Review Parsed Expenses</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {parsedExpenses.map((exp, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center bg-slate-900/50 p-2 rounded-md">
                       <input type="text" value={exp.name || ''} onChange={e => handleExpenseChange(index, 'name', e.target.value)} className="col-span-4 bg-slate-700 border-slate-600 text-white rounded-md p-2 text-sm" />
                       <input type="number" value={exp.amount || ''} onChange={e => handleExpenseChange(index, 'amount', parseFloat(e.target.value))} className="col-span-2 bg-slate-700 border-slate-600 text-white rounded-md p-2 text-sm" />
                       <input type="date" value={exp.date ? new Date(exp.date).toLocaleDateString('en-CA') : ''} onChange={e => handleExpenseChange(index, 'date', e.target.value)} className="col-span-3 bg-slate-700 border-slate-600 text-white rounded-md p-2 text-sm" />
                       <div className="col-span-3">
                           <select value={exp.categoryId || ''} onChange={e => handleExpenseChange(index, 'categoryId', e.target.value)} className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2 text-sm">
                               <option value="">
                                 {exp.categoryName && !exp.categoryId ? `New: ${exp.categoryName}` : 'Select Category'}
                               </option>
                               {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                           </select>
                       </div>
                    </div>
                  ))}
                </div>
                 <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleBulkSave}>Add All to Budget</Button>
                </div>
              </div>
            )}
        </div>
      )}
    </Modal>
  );
};
