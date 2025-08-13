
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Budget, Expense, Category } from '../types';
import { Dashboard } from './components/Dashboard';
import { BudgetSetupModal } from './components/modals/BudgetSetupModal';
import { AddExpenseModal } from './components/modals/AddExpenseModal';
import { Button } from './components/ui/Button';
import { Dropdown, DropdownItem } from './components/ui/Dropdown';

type ModalType = 'setup' | 'addExpense' | null;
type ExpenseData = Omit<Expense, 'id' | 'categoryId'> & { categoryId?: string; categoryName?: string };


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

const App: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [activeBudgetId, setActiveBudgetId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);
  const [viewMonth, setViewMonth] = useState<number>(0); // 0 for annual, 1-12 for month
  const [isLoading, setIsLoading] = useState(true);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const savedBudgets = localStorage.getItem('budget-tracker-data');
      const savedActiveId = localStorage.getItem('budget-tracker-active-id');
      if (savedBudgets) {
        const parsedBudgets = JSON.parse(savedBudgets);
        setBudgets(parsedBudgets);
        if (savedActiveId && parsedBudgets.find((b: Budget) => b.id === savedActiveId)) {
            setActiveBudgetId(savedActiveId);
        } else if (parsedBudgets.length > 0) {
            setActiveBudgetId(parsedBudgets[0].id);
        }
      }
    } catch (error) {
        console.error("Failed to load budgets from localStorage", error);
    } finally {
        setIsLoading(false);
    }
  }, []);
  
  const activeBudget = useMemo(() => budgets.find(b => b.id === activeBudgetId), [budgets, activeBudgetId]);

  const saveBudgets = useCallback((newBudgets: Budget[], newActiveId?: string | null) => {
    setBudgets(newBudgets);
    const finalActiveId = newActiveId !== undefined ? newActiveId : activeBudgetId;
    setActiveBudgetId(finalActiveId);
    try {
      localStorage.setItem('budget-tracker-data', JSON.stringify(newBudgets));
      if (finalActiveId) {
          localStorage.setItem('budget-tracker-active-id', finalActiveId);
      } else {
          localStorage.removeItem('budget-tracker-active-id');
      }
    } catch (error) {
        console.error("Failed to save budgets to localStorage", error);
    }
  }, [activeBudgetId]);

  const handleSaveBudget = (budgetData: Omit<Budget, 'id' | 'expenses'>) => {
    if (budgetToEdit) { // Editing existing budget
        const updatedBudgets = budgets.map(b => b.id === budgetToEdit.id ? {...budgetToEdit, ...budgetData} : b);
        saveBudgets(updatedBudgets, budgetToEdit.id);
    } else { // Creating new budget
        const newBudgetId = `budget-${Date.now()}`;
        const newBudget = { ...budgetData, id: newBudgetId, expenses: [] };
        const updatedBudgets = [...budgets, newBudget];
        saveBudgets(updatedBudgets, newBudgetId);
    }
    setActiveModal(null);
    setBudgetToEdit(null);
  };
  
  const handleAddExpenses = (newExpensesData: ExpenseData[]) => {
      if (!activeBudget) return;

      const expensesForActiveBudget: ExpenseData[] = [];
      const skippedExpenses: ExpenseData[] = [];

      newExpensesData.forEach(exp => {
          if (new Date(exp.date).getFullYear() === activeBudget.year) {
              expensesForActiveBudget.push(exp);
          } else {
              skippedExpenses.push(exp);
          }
      });

      if (skippedExpenses.length > 0) {
          const skippedYears = [...new Set(skippedExpenses.map(e => new Date(e.date).getFullYear()))];
          alert(`Some expenses were not added because their year did not match the active budget's year (${activeBudget.year}). Skipped expenses for years: ${skippedYears.join(', ')}`);
      }
      
      if (expensesForActiveBudget.length === 0) return;

      const budgetCategories = [...activeBudget.categories];
      let categoriesWereUpdated = false;

      const finalizedExpenses = expensesForActiveBudget.map((expData, i) => {
          let categoryId = expData.categoryId;
          if (!categoryId && expData.categoryName) {
              let category = budgetCategories.find(c => c.name.toLowerCase() === expData.categoryName!.toLowerCase());
              if (!category) {
                  // Create new category
                  category = {
                      id: `cat-${Date.now()}-${i}`,
                      name: expData.categoryName,
                      budgeted: 0 // New categories from expenses start with 0 budget
                  };
                  budgetCategories.push(category);
                  categoriesWereUpdated = true;
              }
              categoryId = category.id;
          }
          return {
              id: `exp-${Date.now()}-${i}`,
              name: expData.name,
              amount: expData.amount,
              date: expData.date,
              categoryId: categoryId!,
          } as Expense;
      }).filter(exp => exp.categoryId); // Filter out any that still couldn't get a categoryId
      
      const updatedBudget = {
          ...activeBudget,
          categories: categoriesWereUpdated ? budgetCategories : activeBudget.categories,
          expenses: [...activeBudget.expenses, ...finalizedExpenses]
      };
      const updatedBudgets = budgets.map(b => b.id === activeBudgetId ? updatedBudget : b);
      saveBudgets(updatedBudgets);
  };

  const handleUpdateExpense = (updatedExpense: Expense) => {
    if(!activeBudget) return;
    const updatedExpenses = activeBudget.expenses.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp);
    const updatedBudget = {...activeBudget, expenses: updatedExpenses};
    const updatedBudgets = budgets.map(b => b.id === activeBudgetId ? updatedBudget : b);
    saveBudgets(updatedBudgets);
  }

  const handleDeleteExpense = (expenseId: string) => {
    if(!activeBudget) return;
    if(window.confirm("Are you sure you want to delete this expense?")) {
        const updatedExpenses = activeBudget.expenses.filter(exp => exp.id !== expenseId);
        const updatedBudget = {...activeBudget, expenses: updatedExpenses};
        const updatedBudgets = budgets.map(b => b.id === activeBudgetId ? updatedBudget : b);
        saveBudgets(updatedBudgets);
    }
  }
  
  const handleDeleteMultipleExpenses = (expenseIds: string[]) => {
    if(!activeBudget) return;
    const expenseIdSet = new Set(expenseIds);
    const updatedExpenses = activeBudget.expenses.filter(exp => !expenseIdSet.has(exp.id));
    const updatedBudget = {...activeBudget, expenses: updatedExpenses};
    const updatedBudgets = budgets.map(b => b.id === activeBudgetId ? updatedBudget : b);
    saveBudgets(updatedBudgets);
  }

  const handleUpdateMultipleExpensesCategory = (expenseIds: string[], newCategoryId: string) => {
    if (!activeBudget) return;
    const expenseIdSet = new Set(expenseIds);

    const updatedExpenses = activeBudget.expenses.map(exp => {
        if (expenseIdSet.has(exp.id)) {
            return { ...exp, categoryId: newCategoryId };
        }
        return exp;
    });

    const updatedBudget = { ...activeBudget, expenses: updatedExpenses };
    const updatedBudgets = budgets.map(b => b.id === activeBudgetId ? updatedBudget : b);
    saveBudgets(updatedBudgets);
  }
  
  const handleEditBudget = () => {
    setBudgetToEdit(activeBudget);
    setActiveModal('setup');
  }

  const handleExportData = () => {
    if (budgets.length === 0) {
        alert("No data to export.");
        return;
    }
    const dataStr = JSON.stringify(budgets, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'budget-tracker-data.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result as string;
            const importedBudgets = JSON.parse(text);

            if (!Array.isArray(importedBudgets) || importedBudgets.some(b => !b.id || !b.name || !b.year || !b.categories || !b.expenses)) {
                throw new Error("Invalid file format. The file must contain an array of budgets.");
            }

            if (window.confirm("This will overwrite all your current budget data. Are you sure you want to continue?")) {
                const newActiveId = importedBudgets.length > 0 ? importedBudgets[0].id : null;
                saveBudgets(importedBudgets, newActiveId);
                alert("Data imported successfully!");
            }
        } catch (error: any) {
            alert(`Failed to import data: ${error.message}`);
            console.error("Import error:", error);
        } finally {
            if (event.target) {
                event.target.value = '';
            }
        }
    };
    reader.readAsText(file);
  };


  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-screen">
            <div className="text-2xl text-slate-400">Loading Budgets...</div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">Budget Tracker</h1>
                <p className="text-purple-300 mt-1 text-lg">{activeBudget ? activeBudget.name : "Create a budget to get started"}</p>
            </div>
            <div className="flex items-center space-x-2 flex-wrap">
                {budgets.length > 1 && (
                    <select
                        value={activeBudgetId || ''}
                        onChange={e => {
                            const newActiveId = e.target.value;
                            setActiveBudgetId(newActiveId)
                            localStorage.setItem('budget-tracker-active-id', newActiveId);
                        }}
                        className="bg-slate-700 border-slate-600 text-white rounded-md p-2 h-10"
                    >
                        {budgets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                )}
                
                {activeBudget && <Button onClick={() => setActiveModal('addExpense')}>Add Expense</Button> }
                 
                {budgets.length > 0 && (
                    <Button variant='secondary' onClick={() => {
                        setBudgetToEdit(null);
                        setActiveModal('setup');
                    }}>
                        New Budget
                    </Button>
                )}

                <input type="file" ref={importInputRef} style={{ display: 'none' }} onChange={handleImportFile} accept=".json" />
                <Dropdown trigger={
                    <Button variant="ghost" size="icon-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                    </Button>
                }>
                    <DropdownItem onClick={() => importInputRef.current?.click()}>Import Data</DropdownItem>
                    <DropdownItem onClick={handleExportData}>Export Data</DropdownItem>
                </Dropdown>

            </div>
        </header>

        <main>
          {activeBudget ? (
            <>
              <MonthSelector selectedMonth={viewMonth} onSelectMonth={setViewMonth} />
              <Dashboard 
                budget={activeBudget} 
                viewMonth={viewMonth} 
                onUpdateExpense={handleUpdateExpense} 
                onDeleteExpense={handleDeleteExpense}
                onDeleteMultipleExpenses={handleDeleteMultipleExpenses}
                onUpdateMultipleExpensesCategory={handleUpdateMultipleExpensesCategory}
                onEditBudget={handleEditBudget} 
              />
            </>
          ) : (
            <div className="text-center py-20 bg-slate-800 rounded-xl">
              <h2 className="text-2xl font-semibold text-white">No budget found.</h2>
              <p className="text-slate-400 mt-2 mb-6">Create your first budget to start tracking your finances.</p>
              <Button onClick={() => {
                setBudgetToEdit(null);
                setActiveModal('setup');
              }}>Get Started</Button>
            </div>
          )}
        </main>
      </div>

      <BudgetSetupModal
        isOpen={activeModal === 'setup'}
        onClose={() => {
            setActiveModal(null);
            setBudgetToEdit(null);
        }}
        onSave={handleSaveBudget}
        initialBudget={budgetToEdit}
        allBudgets={budgets}
      />
      
      {activeBudget && (
        <AddExpenseModal
            isOpen={activeModal === 'addExpense'}
            onClose={() => setActiveModal(null)}
            onSave={handleAddExpenses}
            categories={activeBudget.categories}
        />
      )}
    </div>
  );
};

export default App;