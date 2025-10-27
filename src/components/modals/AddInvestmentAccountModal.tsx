import React, { useState, useEffect } from 'react';
import { InvestmentAccount } from '../../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface AddInvestmentAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: Omit<InvestmentAccount, 'id' | 'holdings'>) => void;
  initialData?: InvestmentAccount | null;
}

const accountTypes: InvestmentAccount['type'][] = ['Brokerage', 'Roth IRA', 'Traditional IRA', '401k', 'HSA', 'Other'];

export const AddInvestmentAccountModal: React.FC<AddInvestmentAccountModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<InvestmentAccount['type']>('Brokerage');

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setType(initialData?.type || 'Brokerage');
    }
  }, [isOpen, initialData]);

  const handleSave = () => {
    if (!name.trim()) {
      alert("Please enter an account name.");
      return;
    }
    onSave({ name, type });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Investment Account" : "Add Investment Account"}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Account Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2"
            placeholder="e.g., Fidelity Brokerage"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Account Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as InvestmentAccount['type'])}
            className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2"
          >
            {accountTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{initialData ? "Save Changes" : "Add Account"}</Button>
        </div>
      </div>
    </Modal>
  );
};