import React, { useState, useEffect } from 'react';
import { Holding } from '../../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

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
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTicker(initialData?.ticker || '');
      setName(initialData?.name || '');
      setShares(initialData?.shares.toString() || '');
      setPurchasePrice(initialData?.purchasePrice.toString() || '');
      setCurrentPrice(initialData?.currentPrice.toString() || '');
    } else {
      // Clear form on close
      setTicker('');
      setName('');
      setShares('');
      setPurchasePrice('');
      setCurrentPrice('');
    }
  }, [isOpen, initialData]);

  const handleSave = () => {
    const sharesNum = parseFloat(shares);
    const purchasePriceNum = parseFloat(purchasePrice);
    const currentPriceNum = parseFloat(currentPrice);

    if (!ticker.trim() || !name.trim() || isNaN(sharesNum) || isNaN(purchasePriceNum) || isNaN(currentPriceNum) || sharesNum <= 0) {
      alert("Please fill out all fields with valid numbers.");
      return;
    }
    
    onSave({ ticker: ticker.toUpperCase().trim(), name, shares: sharesNum, purchasePrice: purchasePriceNum, currentPrice: currentPriceNum });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Holding" : "Add Holding"}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Ticker Symbol</label>
              <input type="text" value={ticker} onChange={e => setTicker(e.target.value)} className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2" placeholder="e.g., VOO" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2" placeholder="e.g., Vanguard S&P 500 ETF" />
            </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Shares</label>
              <input type="number" value={shares} onChange={e => setShares(e.target.value)} className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Avg. Purchase Price ($)</label>
              <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2" placeholder="0.00" />
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