
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Budget, Expense, Category, Asset, Holding, Liability, NetWorthSnapshot } from '../types';
import { BudgetSetupModal } from './components/modals/BudgetSetupModal';
import { AddExpenseModal } from './components/modals/AddExpenseModal';
import { AddAssetModal } from './components/modals/AddInvestmentAccountModal';
import { Button } from './components/ui/Button';
import { Dropdown, DropdownItem } from './components/ui/Dropdown';
import { Spinner } from './components/ui/Spinner';
import { Nav } from './components/ui/Nav';
import { BudgetView } from './components/BudgetView';
import { AssetsDashboard } from './components/InvestmentsDashboard';
import { NetWorthDashboard } from './components/NetWorthDashboard';
import { Chatbot } from './components/ui/Chatbot';

type ModalType = 'setup' | 'addExpense' | 'addAsset' | 'settings' | null;
type ExpenseData = Omit<Expense, 'id' | 'categoryId'> & { categoryId?: string; categoryName?: string };
type Page = 'dashboard' | 'budgets' | 'assets';

interface AppSettings {
    alphaVantageApiKey?: string;
}

const calculateCurrentNetWorth = (currentAssets: Asset[], currentLiabilities: Liability[]): number => {
    const totalAssets = currentAssets.reduce((sum, asset) => {
        if (asset.holdings) {
            return sum + asset.holdings.reduce((hSum, h) => hSum + h.shares * h.currentPrice, 0);
        }
        return sum + (asset.value || 0);
    }, 0);
    const totalLiabilities = currentLiabilities.reduce((sum, l) => sum + l.amount, 0);
    return totalAssets - totalLiabilities;
};

const updateNetWorthHistory = (currentHistory: NetWorthSnapshot[], currentAssets: Asset[], currentLiabilities: Liability[]): NetWorthSnapshot[] => {
    const newNetWorth = calculateCurrentNetWorth(currentAssets, currentLiabilities);
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    
    const lastSnapshot = currentHistory.length > 0 ? currentHistory[currentHistory.length - 1] : null;
    
    // Avoid creating an initial zero-value entry if everything is empty
    if (newNetWorth === 0 && currentHistory.length === 0 && currentAssets.length === 0 && currentLiabilities.length === 0) {
        return [];
    }
    
    // If the latest snapshot is for today, update its value (if it changed)
    if (lastSnapshot && lastSnapshot.date === today) {
        if (lastSnapshot.netWorth.toFixed(2) === newNetWorth.toFixed(2)) return currentHistory; 
        const newHistory = [...currentHistory];
        newHistory[newHistory.length - 1] = { date: today, netWorth: newNetWorth };
        return newHistory;
    } else {
        // If there's no snapshot for today, add a new one, but only if value changed from last time
        if (lastSnapshot && lastSnapshot.netWorth.toFixed(2) === newNetWorth.toFixed(2)) return currentHistory;
        return [...currentHistory, { date: today, netWorth: newNetWorth }];
    }
}

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('dashboard');
  
  // Budget State
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [activeBudgetId, setActiveBudgetId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);
  const [viewMonth, setViewMonth] = useState<number>(0); // 0 for annual, 1-12 for month

  // Asset State
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);

  // Liabilities State
  const [liabilities, setLiabilities] = useState<Liability[]>([]);

  // Net Worth History State
  const [netWorthHistory, setNetWorthHistory] = useState<NetWorthSnapshot[]>([]);

  // Settings State
  const [settings, setSettings] = useState<AppSettings>({});

  // General State
  const [isLoading, setIsLoading] = useState(true);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      // New data structure
      const appDataString = localStorage.getItem('budget-tracker-app-data');
      if (appDataString) {
          const appData = JSON.parse(appDataString);
          setBudgets(appData.budgets || []);
          setAssets(appData.assets || appData.investmentAccounts || []); // Migration from investmentAccounts
          setLiabilities(appData.liabilities || []);
          setNetWorthHistory(appData.netWorthHistory || []);
          const savedActiveId = appData.activeBudgetId;
          if (savedActiveId && (appData.budgets || []).find((b: Budget) => b.id === savedActiveId)) {
            setActiveBudgetId(savedActiveId);
          } else if ((appData.budgets || []).length > 0) {
            setActiveBudgetId(appData.budgets[0].id);
          }
          // Load settings
          const savedSettings = localStorage.getItem('budget-tracker-settings');
            if (savedSettings) {
                setSettings(JSON.parse(savedSettings));
            }
          return;
      }

      // Legacy data migration for budgets
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
        // Save migrated data to new structure
        saveAllData({ budgets: parsedBudgets, activeBudgetId: savedActiveId, assets: [], liabilities: [], netWorthHistory: [] });
        localStorage.removeItem('budget-tracker-data');
        localStorage.removeItem('budget-tracker-active-id');
      }
    } catch (error) {
        console.error("Failed to load data from localStorage", error);
    } finally {
        setIsLoading(false);
    }
  }, []);
  
  const activeBudget = useMemo(() => budgets.find(b => b.id === activeBudgetId), [budgets, activeBudgetId]);

  const headerTitle = useMemo(() => {
    switch (page) {
      case 'dashboard': return 'Your Financial Overview';
      case 'assets': return 'Your Assets';
      case 'budgets': return activeBudget ? activeBudget.name : 'Create a budget to get started';
      default: return '';
    }
  }, [page, activeBudget]);

  const saveAllData = useCallback((data: { budgets: Budget[], activeBudgetId: string | null, assets: Asset[], liabilities: Liability[], netWorthHistory: NetWorthSnapshot[] }) => {
    try {
        const dataToSave = {
            budgets: data.budgets,
            activeBudgetId: data.activeBudgetId,
            assets: data.assets,
            liabilities: data.liabilities,
            netWorthHistory: data.netWorthHistory,
        };
        localStorage.setItem('budget-tracker-app-data', JSON.stringify(dataToSave));
    } catch (error) {
        console.error("Failed to save data to localStorage", error);
    }
  }, []);

  const saveBudgets = useCallback((newBudgets: Budget[], newActiveId?: string | null) => {
    setBudgets(newBudgets);
    const finalActiveId = newActiveId !== undefined ? newActiveId : activeBudgetId;
    setActiveBudgetId(finalActiveId);
    saveAllData({ budgets: newBudgets, activeBudgetId: finalActiveId, assets, liabilities, netWorthHistory });
  }, [activeBudgetId, assets, liabilities, netWorthHistory, saveAllData]);

  const saveAssets = useCallback((newAssets: Asset[]) => {
      const newHistory = updateNetWorthHistory(netWorthHistory, newAssets, liabilities);
      setAssets(newAssets);
      setNetWorthHistory(newHistory);
      saveAllData({ budgets, activeBudgetId, assets: newAssets, liabilities, netWorthHistory: newHistory });
  }, [budgets, activeBudgetId, liabilities, netWorthHistory, saveAllData]);

  const saveLiabilities = useCallback((newLiabilities: Liability[]) => {
      const newHistory = updateNetWorthHistory(netWorthHistory, assets, newLiabilities);
      setLiabilities(newLiabilities);
      setNetWorthHistory(newHistory);
      saveAllData({ budgets, activeBudgetId, assets, liabilities: newLiabilities, netWorthHistory: newHistory });
  }, [budgets, activeBudgetId, assets, netWorthHistory, saveAllData]);

  const saveSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
        localStorage.setItem('budget-tracker-settings', JSON.stringify(newSettings));
    } catch (error) {
        console.error("Failed to save settings", error);
    }
  }, []);

  // BUDGET HANDLERS
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
  
  const handleDeleteBudget = (budgetId: string) => {
    const newBudgets = budgets.filter(b => b.id !== budgetId);
    let newActiveId = activeBudgetId;

    if (activeBudgetId === budgetId) {
        newActiveId = newBudgets.length > 0 ? newBudgets[0].id : null;
    }
    
    saveBudgets(newBudgets, newActiveId);
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
                  category = {
                      id: `cat-${Date.now()}-${i}`,
                      name: expData.categoryName,
                      budgeted: 0
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
      }).filter(exp => exp.categoryId);
      
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

  const handleDeleteExpensesInView = () => {
    if (!activeBudget) return;
    const months = ["Annual", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const viewName = viewMonth === 0 ? `the year ${activeBudget.year}` : `${months[viewMonth]} ${activeBudget.year}`;
    const expensesInView = viewMonth === 0 ? activeBudget.expenses : activeBudget.expenses.filter(exp => new Date(exp.date).getUTCMonth() + 1 === viewMonth);

    if (expensesInView.length === 0) {
        alert(`There are no expenses to delete for ${viewName}.`);
        return;
    }
    if (window.confirm(`Are you sure you want to delete all ${expensesInView.length} expense(s) for ${viewName}? This action cannot be undone.`)) {
        const expensesToKeep = viewMonth === 0 ? [] : activeBudget.expenses.filter(exp => new Date(exp.date).getUTCMonth() + 1 !== viewMonth);
        const updatedBudget = { ...activeBudget, expenses: expensesToKeep };
        const updatedBudgets = budgets.map(b => b.id === activeBudgetId ? updatedBudget : b);
        saveBudgets(updatedBudgets);
    }
  };
  
  const handleEditBudget = () => {
    setBudgetToEdit(activeBudget || null);
    setActiveModal('setup');
  }

  // ASSET HANDLERS
  const handleSaveAsset = (assetData: Omit<Asset, 'id'>) => {
    if (assetToEdit) {
        const updatedAssets = assets.map(asset => asset.id === assetToEdit.id ? { ...assetToEdit, ...assetData } : asset);
        saveAssets(updatedAssets);
    } else {
        const newAsset: Asset = { ...assetData, id: `asset-${Date.now()}` };
        saveAssets([...assets, newAsset]);
    }
    setActiveModal(null);
    setAssetToEdit(null);
  };

  const handleEditAsset = (asset: Asset) => {
    setAssetToEdit(asset);
    setActiveModal('addAsset');
  };


  // DATA IMPORT/EXPORT
  const handleExportData = () => {
    const data = { budgets, activeBudgetId, assets, liabilities, settings, netWorthHistory };
    if (budgets.length === 0 && assets.length === 0 && liabilities.length === 0) {
        alert("No data to export.");
        return;
    }
    const dataStr = JSON.stringify(data, null, 2);
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
            const importedData = JSON.parse(text);
            const importedBudgets = importedData.budgets || [];
            // Handle migration from old 'investmentAccounts' key
            const importedAssets = importedData.assets || importedData.investmentAccounts || [];
            const importedLiabilities = importedData.liabilities || [];
            const importedNetWorthHistory = importedData.netWorthHistory || [];
            const importedSettings = importedData.settings || {};


            if (!Array.isArray(importedBudgets) || !Array.isArray(importedAssets) || !Array.isArray(importedLiabilities)) {
                 throw new Error("Invalid file format.");
            }
            if (window.confirm("This will overwrite all your current data, including settings. Are you sure you want to continue?")) {
                const newActiveId = importedData.activeBudgetId || (importedBudgets.length > 0 ? importedBudgets[0].id : null);
                setBudgets(importedBudgets);
                setAssets(importedAssets);
                setLiabilities(importedLiabilities);
                setNetWorthHistory(importedNetWorthHistory);
                setActiveBudgetId(newActiveId);
                saveAllData({ budgets: importedBudgets, activeBudgetId: newActiveId, assets: importedAssets, liabilities: importedLiabilities, netWorthHistory: importedNetWorthHistory });
                saveSettings(importedSettings);
                alert("Data imported successfully!");
            }
        } catch (error: any) {
            alert(`Failed to import data: ${error.message}`);
            console.error("Import error:", error);
        } finally {
            if (event.target) event.target.value = '';
        }
    };
    reader.readAsText(file);
  };


  if (isLoading) {
    return (
        <div className="flex flex-col justify-center items-center h-screen bg-slate-900 space-y-4">
            <Spinner size="lg" />
            <div className="text-2xl text-slate-400">Loading Your Financials...</div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">Financial Tracker</h1>
                <p className="text-purple-300 mt-1 text-lg">{headerTitle}</p>
            </div>
            <div className="flex items-center space-x-2 flex-wrap">
                {page === 'budgets' && budgets.length > 1 && (
                    <select
                        value={activeBudgetId || ''}
                        onChange={e => {
                            const newActiveId = e.target.value;
                            setActiveBudgetId(newActiveId);
                            saveAllData({ budgets, activeBudgetId: newActiveId, assets, liabilities, netWorthHistory });
                        }}
                        className="bg-slate-700 border-slate-600 text-white rounded-md p-2 h-10"
                    >
                        {budgets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                )}
                
                {page === 'budgets' && activeBudget && <Button onClick={() => setActiveModal('addExpense')}>Add Expense</Button> }
                 
                {page === 'budgets' && (
                    <Button variant='secondary' onClick={() => {
                        setBudgetToEdit(null);
                        setActiveModal('setup');
                    }}>
                        {budgets.length > 0 ? 'New Budget' : 'Create Budget'}
                    </Button>
                )}

                {page === 'assets' &&
                    <Button onClick={() => {
                        setAssetToEdit(null);
                        setActiveModal('addAsset');
                    }}>
                        Add Asset
                    </Button>
                }

                <input type="file" ref={importInputRef} style={{ display: 'none' }} onChange={handleImportFile} accept=".json" />
                <Dropdown trigger={
                    <Button variant="ghost" size="icon-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                    </Button>
                }>
                    <DropdownItem onClick={() => setActiveModal('settings')}>Settings</DropdownItem>
                    <DropdownItem onClick={() => importInputRef.current?.click()}>Import Data</DropdownItem>
                    <DropdownItem onClick={handleExportData}>Export Data</DropdownItem>
                    {page === 'budgets' && (
                      <DropdownItem 
                          onClick={handleDeleteExpensesInView}
                          disabled={!activeBudget || activeBudget.expenses.length === 0}
                          className={`
                              ${(!activeBudget || activeBudget.expenses.length === 0) 
                                  ? 'text-slate-600 cursor-not-allowed' 
                                  //: 'hover:bg-red-800/50 text-red-400 hover:text-red-300'
                                  : 'text-red-400 hover:text-red-300 hover:bg-red-500/20'
                              }`
                          }
                      >
                          Delete Expenses in View
                      </DropdownItem>
                    )}
                </Dropdown>

            </div>
        </header>
        
        <Nav currentPage={page} onPageChange={setPage} />

        <main>
          {page === 'dashboard' && (
            <NetWorthDashboard
                assets={assets}
                liabilities={liabilities}
                onSaveLiabilities={saveLiabilities}
                activeBudget={activeBudget}
                netWorthHistory={netWorthHistory}
            />
          )}

          {page === 'budgets' && (
            <BudgetView
              activeBudget={activeBudget}
              viewMonth={viewMonth}
              setViewMonth={setViewMonth}
              onUpdateExpense={handleUpdateExpense}
              onDeleteExpense={handleDeleteExpense}
              onDeleteMultipleExpenses={handleDeleteMultipleExpenses}
              onUpdateMultipleExpensesCategory={handleUpdateMultipleExpensesCategory}
              onEditBudget={handleEditBudget}
              onGetStarted={() => {
                  setBudgetToEdit(null);
                  setActiveModal('setup');
              }}
            />
          )}

          {page === 'assets' && (
            <AssetsDashboard
              assets={assets}
              onSaveAssets={saveAssets}
              onEditAsset={handleEditAsset}
            />
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
        onDelete={handleDeleteBudget}
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

      <AddAssetModal
        isOpen={activeModal === 'addAsset'}
        onClose={() => {
            setActiveModal(null);
            setAssetToEdit(null);
        }}
        onSave={handleSaveAsset}
        initialData={assetToEdit}
      />

      <Chatbot
        page={page}
        budgets={budgets}
        assets={assets}
        liabilities={liabilities}
       />
    </div>
  );
};

export default App;