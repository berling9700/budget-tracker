import React, { useState, useEffect } from 'react';
import { Liability } from '../../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface AddLiabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (liability: Omit<Liability, 'id'>) => void;
  initialData?: Liability | null;
}

export const AddLiabilityModal: React.FC<AddLiabilityModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setAmount(initialData?.amount.toString() || '');
    }
  }, [isOpen, initialData]);

  const handleSave = () => {
    const amountNum = parseFloat(amount);
    if (!name.trim() || isNaN(amountNum) || amountNum < 0) {
      alert("Please provide a valid name and a positive amount.");
      return;
    }
    onSave({ name, amount: amountNum });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Liability" : "Add Liability"}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Liability Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2"
            placeholder="e.g., Mortgage, Student Loan"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Amount ($)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2"
            placeholder="0.00"
          />
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{initialData ? "Save Changes" : "Add Liability"}</Button>
        </div>
      </div>
    </Modal>
  );
};