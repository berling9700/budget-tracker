
import React, { useState, useEffect } from 'react';
import { Expense, Category } from '../../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { parseCsvExpenses, ParsedExpenseData } from '../../services/geminiService';
import { Spinner } from '../ui/Spinner';
import {
  createHeaderSignature,
  convertMappedCsvToExpenses,
  CsvMapping,
  CsvMappingPreset,
  detectDelimiter,
  findPresetByHeaders,
  getCsvHeaders,
  loadMappingPresets,
  parseCsvRecords,
  saveMappingPresets,
  suggestMapping,
} from '../../services/csvImportService';

type ExpenseToReview = {
  name: string;
  amount: number;
  date: string;
  categoryId?: string;
  importCategoryName?: string;
  csvCategoryName?: string;
  finalCategoryName?: string;
};

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expenses: (Omit<Expense, 'id' | 'categoryId'> & { categoryId?: string; categoryName?: string })[]) => void;
  categories: Category[];
}

type Mode = 'single' | 'bulk';
type BulkParseMode = 'mapped' | 'ai';

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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [bulkParseMode, setBulkParseMode] = useState<BulkParseMode>('mapped');
  const [delimiter, setDelimiter] = useState(',');
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<CsvMapping>({ dateColumn: '', descriptionColumn: '', amountColumn: '', categoryColumn: '' });
  const [mappingPresets, setMappingPresets] = useState<CsvMappingPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [newPresetName, setNewPresetName] = useState('');
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<number>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState('');


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
      setIsFullScreen(false);
      setBulkParseMode('mapped');
      setDelimiter(',');
      setHeaders([]);
      setMapping({ dateColumn: '', descriptionColumn: '', amountColumn: '', categoryColumn: '' });
      const presets = loadMappingPresets();
      setMappingPresets(presets);
      setSelectedPresetId('');
      setNewPresetName('');
      setSelectedExpenseIds(new Set());
      setBulkCategoryId('');
    }
  }, [isOpen, categories]);

  const normalizeMappingKey = (value?: string): string | undefined => {
    const normalized = value?.trim().toLowerCase();
    return normalized ? normalized : undefined;
  };

  const applyPresetOverrides = (expenses: ExpenseToReview[], presetId: string): ExpenseToReview[] => {
    const preset = mappingPresets.find(p => p.id === presetId);
    if (!preset) return expenses;

    return expenses.map(expense => {
      const csvKey = normalizeMappingKey(expense.csvCategoryName);
      if (csvKey && preset.categoryMappings && preset.categoryMappings[csvKey]) {
        const targetCategoryId = preset.categoryMappings[csvKey];
        const targetCategory = categories.find(c => c.id === targetCategoryId);
        if (targetCategory) {
          return {
            ...expense,
            categoryId: targetCategory.id,
            finalCategoryName: targetCategory.name,
          };
        }
      }

      const importKey = normalizeMappingKey(expense.importCategoryName);
      if (!importKey) return expense;

      if (preset.categoryMappings && preset.categoryMappings[importKey]) {
        const targetCategoryId = preset.categoryMappings[importKey];
        const targetCategory = categories.find(c => c.id === targetCategoryId);
        if (targetCategory) {
          return {
            ...expense,
            categoryId: targetCategory.id,
            finalCategoryName: targetCategory.name,
          };
        }
      }

      const overrideCategoryName = preset.categoryOverrides[importKey];
      if (!overrideCategoryName) return expense;
      const targetCategory = categories.find(c => c.name.toLowerCase() === overrideCategoryName.toLowerCase());
      if (!targetCategory) return expense;

      return {
        ...expense,
        categoryId: targetCategory.id,
        finalCategoryName: targetCategory.name,
      };
    });
  };
  
  const handleSingleSave = () => {
    if (!name || !amount || !categoryId || parseFloat(amount) <= 0 || !date) {
      setError('Please fill out all fields and enter a valid amount and date.');
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
    setError('');
    onClose();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const detectedDelimiter = detectDelimiter(content);
        const detectedHeaders = getCsvHeaders(content, detectedDelimiter);
        setCsvContent(content);
        setDelimiter(detectedDelimiter);
        setHeaders(detectedHeaders);
        setMapping(suggestMapping(detectedHeaders));
        const matchedPreset = findPresetByHeaders(mappingPresets, detectedHeaders);
        if (matchedPreset) {
          setSelectedPresetId(matchedPreset.id);
          setMapping(matchedPreset.mapping);
          setDelimiter(matchedPreset.delimiter);
        } else {
          setSelectedPresetId('');
        }
        setSelectedExpenseIds(new Set());
        setBulkCategoryId('');
      };
      reader.readAsText(file);
    }
  };

  const handleAiParse = async () => {
    if (!csvContent.trim()) return;
    setIsLoading(true);
    setError('');
    setParsedExpenses([]);
    try {
      const result = await parseCsvExpenses(csvContent, categories);
      
      // Extract raw CSV categories for mapping consistency
      const csvRows = parseCsvRecords(csvContent, delimiter);
      const csvHeaders = getCsvHeaders(csvContent, delimiter);
      const csvCategoryColumnIndex = csvHeaders.findIndex(h => h.toLowerCase().includes('category'));
      
      const expensesToReview: ExpenseToReview[] = result.map((exp, index) => {
          const importCategoryName = exp.categoryName?.trim();
          const category = categories.find(c => c.name.toLowerCase() === importCategoryName?.toLowerCase());
          
          // Get the raw CSV category value using row index
          let csvCategoryName: string | undefined;
          if (csvCategoryColumnIndex >= 0 && csvRows[index]) {
            const categoryColumnName = csvHeaders[csvCategoryColumnIndex];
            csvCategoryName = csvRows[index][categoryColumnName]?.trim();
          }
          
          return {
            name: exp.name,
            amount: exp.amount,
            date: exp.date,
            categoryId: category?.id,
            importCategoryName,
            csvCategoryName,
            finalCategoryName: category?.name || importCategoryName,
          };
      });
      const withOverrides = selectedPresetId ? applyPresetOverrides(expensesToReview, selectedPresetId) : expensesToReview;
      setParsedExpenses(withOverrides);
      setSelectedExpenseIds(new Set());
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappedParse = () => {
    if (!csvContent.trim()) return;
    if (!mapping.dateColumn || !mapping.descriptionColumn || !mapping.amountColumn) {
      setError('Date, description, and amount columns are required for mapped parsing.');
      return;
    }

    try {
      setError('');
      const rows = parseCsvRecords(csvContent, delimiter);
      const parsed = convertMappedCsvToExpenses(rows, mapping, categories);
      const parsedExpensesWithCategories = parsed.map((exp, index) => {
        const category = categories.find(c => c.name.toLowerCase() === exp.categoryName?.toLowerCase());
        
        // Extract raw CSV category value if column is mapped
        let csvCategoryName: string | undefined;
        if (mapping.categoryColumn && rows[index]) {
          csvCategoryName = rows[index][mapping.categoryColumn]?.trim();
        }
        
        return {
          name: exp.name,
          amount: exp.amount,
          date: exp.date,
          categoryId: category?.id,
          importCategoryName: exp.categoryName,
          csvCategoryName,
          finalCategoryName: category?.name || exp.categoryName,
        };
      });
      const withOverrides = selectedPresetId ? applyPresetOverrides(parsedExpensesWithCategories, selectedPresetId) : parsedExpensesWithCategories;
      setParsedExpenses(withOverrides);
      setSelectedExpenseIds(new Set());
      if (parsed.length === 0) {
        setError('No valid expenses were parsed. Check mapping or CSV format.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to parse CSV using the selected mapping.');
    }
  };

  const handleParse = async () => {
    if (bulkParseMode === 'ai') {
      await handleAiParse();
    } else {
      handleMappedParse();
    }
  };

  const buildCategoryMappings = (): { mappings: Record<string, string>; categoryOverrides: Record<string, string>; csvCategoryNames: string[] } => {
    const mappings: Record<string, string> = {};
    const categoryOverrides: Record<string, string> = {};
    const csvCategoryNames: string[] = [];

    parsedExpenses.forEach(expense => {
      if (!expense.categoryId) return;

      const importKey = normalizeMappingKey(expense.importCategoryName);
      const csvKey = normalizeMappingKey(expense.csvCategoryName);

      if (importKey) {
        mappings[importKey] = expense.categoryId;
        if (expense.finalCategoryName) {
          categoryOverrides[importKey] = expense.finalCategoryName;
        }
      }

      if (csvKey && csvKey !== importKey) {
        mappings[csvKey] = expense.categoryId;
      }

      if (expense.csvCategoryName && !csvCategoryNames.includes(expense.csvCategoryName)) {
        csvCategoryNames.push(expense.csvCategoryName);
      }
    });

    return { mappings, categoryOverrides, csvCategoryNames };
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      setError('Enter a preset name before saving.');
      return;
    }
    if (!mapping.dateColumn || !mapping.descriptionColumn || !mapping.amountColumn) {
      setError('Map date, description, and amount columns before saving a preset.');
      return;
    }

    const { mappings, categoryOverrides, csvCategoryNames } = buildCategoryMappings();
    const preset: CsvMappingPreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName.trim(),
      mapping,
      delimiter,
      headerSignature: createHeaderSignature(headers),
      categoryOverrides,
      categoryMappings: mappings,
      csvCategoryNames,
    };
    const updated = [...mappingPresets, preset];
    setMappingPresets(updated);
    saveMappingPresets(updated);
    setSelectedPresetId(preset.id);
    setNewPresetName('');
  };

  const handleApplyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = mappingPresets.find(p => p.id === presetId);
    if (!preset) return;
    setMapping(preset.mapping);
    setDelimiter(preset.delimiter);
    if (parsedExpenses.length > 0) {
      setParsedExpenses(applyPresetOverrides(parsedExpenses, presetId));
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
            categoryName: !exp.categoryId ? exp.finalCategoryName : undefined
        }))
        .filter(
            (exp: Record<string, any>): exp is (Omit<Expense, 'id' | 'categoryId'> & { categoryId?: string; categoryName?: string }) => 
                !!exp.name && !!exp.amount && !!exp.date && (!!exp.categoryId || !!exp.categoryName)
        );
    
    if (expensesToSave.length > 0) {
      setError('');
      onSave(expensesToSave);
      onClose();
    } else {
        setError('No valid expenses to add. Please check the parsed results or try parsing again.');
    }
  };
  
  const handleExpenseChange = <T,>(index: number, field: keyof ExpenseToReview, value: T) => {
    const newExpenses = [...parsedExpenses];
    const newExpense = { ...newExpenses[index], [field]: value };
    if (field === 'categoryId') {
      const matchedCategory = categories.find(cat => cat.id === value);
      newExpense.finalCategoryName = matchedCategory?.name || newExpense.finalCategoryName;
    }
    newExpenses[index] = newExpense;
    setParsedExpenses(newExpenses);
  }

  const handleToggleExpense = (index: number, checked: boolean) => {
    setSelectedExpenseIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(index);
      else next.delete(index);
      return next;
    });
  };

  const handleToggleAllExpenses = (checked: boolean) => {
    if (!checked) {
      setSelectedExpenseIds(new Set());
      return;
    }
    setSelectedExpenseIds(new Set(parsedExpenses.map((_, index) => index)));
  };

  const handleApplyBulkCategory = () => {
    if (!bulkCategoryId || selectedExpenseIds.size === 0) return;
    const selectedCategory = categories.find(cat => cat.id === bulkCategoryId);
    const updated = parsedExpenses.map((expense, index) => {
      if (!selectedExpenseIds.has(index)) return expense;
      return {
        ...expense,
        categoryId: bulkCategoryId,
        finalCategoryName: selectedCategory?.name || expense.finalCategoryName,
      };
    });
    setParsedExpenses(updated);
    setSelectedExpenseIds(new Set());
    setBulkCategoryId('');
  };

  const handleSaveAiMapping = () => {
    if (!newPresetName.trim()) {
      setError('Enter a mapping name before saving.');
      return;
    }
    if (headers.length === 0) {
      setError('Upload a CSV and parse with AI before saving a mapping.');
      return;
    }

    const { mappings, categoryOverrides, csvCategoryNames } = buildCategoryMappings();
    const preset: CsvMappingPreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName.trim(),
      mapping,
      delimiter,
      headerSignature: createHeaderSignature(headers),
      categoryOverrides,
      categoryMappings: mappings,
      csvCategoryNames,
    };
    const updatedPresets = [...mappingPresets, preset];
    setMappingPresets(updatedPresets);
    saveMappingPresets(updatedPresets);
    setSelectedPresetId(preset.id);
    setNewPresetName('');
    setError('');
  };

  const headerActions = (
    <button onClick={() => setIsFullScreen(!isFullScreen)} className="text-slate-400 hover:text-white transition-colors" aria-label={isFullScreen ? 'Exit full screen' : 'Enter full screen'}>
        {isFullScreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <polyline points="4 14 10 14 10 20"></polyline>
                <polyline points="20 10 14 10 14 4"></polyline>
                <line x1="14" y1="10" x2="21" y2="3"></line>
                <line x1="10" y1="14" x2="3" y2="21"></line>
            </svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
        )}
    </button>
  );

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title="Add Expenses" 
        size={mode === 'bulk' ? 'xl' : 'md'}
        isFullScreen={mode === 'bulk' && isFullScreen}
        headerActions={mode === 'bulk' ? headerActions : undefined}
        closeOnBackdropClick={false}
    >
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
        <div className={isFullScreen ? 'flex flex-col h-full space-y-4' : 'space-y-4'}>
            <div className={isFullScreen ? 'flex-shrink-0' : ''}>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Upload CSV File</label>
                  <input type="file" accept=".csv" onChange={handleFileChange} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"/>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Parsing Mode</label>
                    <select
                      value={bulkParseMode}
                      onChange={e => setBulkParseMode(e.target.value as BulkParseMode)}
                      className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2"
                    >
                      <option value="mapped">Mapped Parser (fast and consistent)</option>
                      <option value="ai">AI Parser (best for messy files)</option>
                    </select>
                  </div>
                  {bulkParseMode === 'mapped' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Saved Mapping Preset</label>
                      <select
                        value={selectedPresetId}
                        onChange={e => handleApplyPreset(e.target.value)}
                        className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2"
                      >
                        <option value="">No preset selected</option>
                        {mappingPresets.map(preset => (
                          <option key={preset.id} value={preset.id}>{preset.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {bulkParseMode === 'mapped' && headers.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg border border-slate-700 bg-slate-900/40 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Date Column</label>
                        <select value={mapping.dateColumn} onChange={e => setMapping(prev => ({ ...prev, dateColumn: e.target.value }))} className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2">
                          <option value="">Select column</option>
                          {headers.map(header => <option key={header} value={header}>{header}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Description Column</label>
                        <select value={mapping.descriptionColumn} onChange={e => setMapping(prev => ({ ...prev, descriptionColumn: e.target.value }))} className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2">
                          <option value="">Select column</option>
                          {headers.map(header => <option key={header} value={header}>{header}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Amount Column</label>
                        <select value={mapping.amountColumn} onChange={e => setMapping(prev => ({ ...prev, amountColumn: e.target.value }))} className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2">
                          <option value="">Select column</option>
                          {headers.map(header => <option key={header} value={header}>{header}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Category Column (Optional)</label>
                        <select value={mapping.categoryColumn || ''} onChange={e => setMapping(prev => ({ ...prev, categoryColumn: e.target.value }))} className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2">
                          <option value="">None</option>
                          {headers.map(header => <option key={header} value={header}>{header}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <input
                        type="text"
                        value={newPresetName}
                        onChange={e => setNewPresetName(e.target.value)}
                        className="flex-1 bg-slate-700 border-slate-600 text-white rounded-md p-2"
                        placeholder="Save this mapping as preset (e.g., Chase Checking)"
                      />
                      <Button variant="secondary" onClick={handleSavePreset}>Save Preset</Button>
                    </div>
                  </div>
                )}
                <div className="flex justify-end mt-4">
                  <Button onClick={handleParse} disabled={isLoading || !csvContent.trim()}>
                    {isLoading ? (
                      <span className="flex items-center">
                        <Spinner size="sm" className="mr-2" />
                        Parsing...
                      </span>
                    ) : bulkParseMode === 'ai' ? 'Parse CSV with AI' : 'Parse CSV with Mapping'}
                  </Button>
                </div>
            </div>

            {error && <p className={`text-red-500 text-center ${isFullScreen ? 'flex-shrink-0' : ''}`}>{error}</p>}

            {parsedExpenses.length > 0 && (
              <div className={`pt-4 border-t border-slate-700 ${isFullScreen ? 'flex-grow overflow-hidden flex flex-col space-y-3' : 'space-y-3'}`}>
                <h3 className="text-lg font-semibold text-white flex-shrink-0">Review Parsed Expenses</h3>
                <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm text-slate-300 inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={parsedExpenses.length > 0 && selectedExpenseIds.size === parsedExpenses.length}
                        onChange={e => handleToggleAllExpenses(e.target.checked)}
                      />
                      Select all
                    </label>
                    <select
                      value={bulkCategoryId}
                      onChange={e => setBulkCategoryId(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white rounded-md p-2 text-sm min-w-48"
                    >
                      <option value="">Bulk change category...</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    <Button variant="secondary" onClick={handleApplyBulkCategory} disabled={!bulkCategoryId || selectedExpenseIds.size === 0}>
                      Apply to Selected ({selectedExpenseIds.size})
                    </Button>
                  </div>
                  {bulkParseMode === 'ai' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={newPresetName}
                        onChange={e => setNewPresetName(e.target.value)}
                        className="flex-1 min-w-60 bg-slate-700 border-slate-600 text-white rounded-md p-2 text-sm"
                        placeholder="Save AI mapping name (e.g., Amex Monthly Import)"
                      />
                      <Button variant="secondary" onClick={handleSaveAiMapping}>Save Mapping</Button>
                    </div>
                  )}
                </div>
                <div className={`space-y-2 pr-2 overflow-y-auto ${isFullScreen ? 'flex-grow' : 'max-h-60'}`}>
                  {parsedExpenses.map((exp, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center bg-slate-900/50 p-2 rounded-md">
                       <div className="col-span-1 flex justify-center">
                          <input
                            type="checkbox"
                            checked={selectedExpenseIds.has(index)}
                            onChange={e => handleToggleExpense(index, e.target.checked)}
                          />
                       </div>
                       <input type="text" value={exp.name || ''} onChange={e => handleExpenseChange(index, 'name', e.target.value)} className="col-span-3 bg-slate-700 border-slate-600 text-white rounded-md p-2 text-sm" />
                       <input type="number" value={exp.amount || ''} onChange={e => handleExpenseChange(index, 'amount', parseFloat(e.target.value))} className="col-span-2 bg-slate-700 border-slate-600 text-white rounded-md p-2 text-sm" />
                       <input type="date" value={exp.date ? new Date(exp.date).toLocaleDateString('en-CA') : ''} onChange={e => handleExpenseChange(index, 'date', e.target.value)} className="col-span-2 bg-slate-700 border-slate-600 text-white rounded-md p-2 text-sm" />
                       <div className="col-span-4">
                           <select value={exp.categoryId || ''} onChange={e => handleExpenseChange(index, 'categoryId', e.target.value)} className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2 text-sm">
                               <option value="">
                                 {exp.finalCategoryName && !exp.categoryId ? `New: ${exp.finalCategoryName}` : 'Select Category'}
                               </option>
                               {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                           </select>
                           {exp.importCategoryName && (
                             <p className="text-[11px] text-slate-400 mt-1">Imported category: {exp.importCategoryName}</p>
                           )}
                       </div>
                    </div>
                  ))}
                </div>
                 <div className={`flex justify-end space-x-3 pt-4 border-t border-slate-700 ${isFullScreen ? 'flex-shrink-0' : ''}`}>
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