import React, { useState, useEffect } from 'react';
import { Holding } from '../../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { fetchQuote } from '../../services/marketDataService';
import { Spinner } from '../ui/Spinner';

interface AddHoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (holding: Omit<Holding, 'id'>) => void;
  initialData?: Holding | null;
}

export const AddHoldingModal: React.FC<AddHoldingModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [shares, setShares] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTicker(initialData?.ticker || '');
      setName(initialData?.name || '');
      setShares(initialData?.shares.toString() || '');
      setCurrentPrice(initialData?.currentPrice.toString() || '');
      setFetchError('');
    } else {
      // Clear form on close
      setTicker('');
      setName('');
      setShares('');
      setCurrentPrice('');
    }
  }, [isOpen, initialData]);
  
  const handleFetchInfo = async () => {
    if (!ticker.trim()) return;
    setIsFetching(true);
    setFetchError('');
    try {
        const quote = await fetchQuote(ticker.trim());
        if (quote) {
            setName(quote.name);
            setCurrentPrice(quote.price.toString());
        }
    } catch (error: any) {
        setFetchError(error.message || "Failed to fetch data.");
    } finally {
        setIsFetching(false);
    }
  };

  const handleSave = () => {
    const sharesNum = parseFloat(shares);
    const currentPriceNum = parseFloat(currentPrice);

    if (!ticker.trim() || !name.trim() || isNaN(sharesNum) || isNaN(currentPriceNum) || sharesNum <= 0) {
      alert("Please fill out all fields with valid numbers.");
      return;
    }
    
    // If editing, preserve the original purchase price. If new, set it to the current price.
    const purchasePriceToSave = initialData?.purchasePrice ?? currentPriceNum;

    onSave({ 
        ticker: ticker.toUpperCase().trim(), 
        name, 
        shares: sharesNum, 
        purchasePrice: purchasePriceToSave, 
        currentPrice: currentPriceNum 
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Holding" : "Add Holding"}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Ticker Symbol</label>
              <div className="flex items-center gap-2">
                <input type="text" value={ticker} onChange={e => setTicker(e.target.value)} className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2" placeholder="e.g., VOO" />
                <Button variant="secondary" onClick={handleFetchInfo} disabled={isFetching} className="px-3">
                    {isFetching ? <Spinner size="sm" /> : 'Fetch'}
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2" placeholder="e.g., Vanguard S&P 500 ETF" />
            </div>
        </div>
        {fetchError && <p className="text-red-500 text-sm col-span-2 -mt-2">{fetchError}</p>}
        <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Shares</label>
              <input type="number" value={shares} onChange={e => setShares(e.target.value)} className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2" placeholder="0.00" />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Current Price ($)</label>
              <input type="number" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2" placeholder="0.00" />
            </div>
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{initialData ? "Save Changes" : "Add Holding"}</Button>
        </div>
      </div>
    </Modal>
  );
};