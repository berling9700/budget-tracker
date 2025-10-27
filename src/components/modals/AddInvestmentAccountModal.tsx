
import React, { useState, useEffect } from 'react';
import { Asset, AssetType } from '../../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Omit<Asset, 'id'>) => void;
  initialData?: Asset | null;
}

const assetTypes: AssetType[] = ['Brokerage', 'Retirement', 'HSA', 'Cash & Savings', 'Real Estate', 'Vehicle', 'Other'];
const typesWithValue: AssetType[] = ['Cash & Savings', 'Real Estate', 'Vehicle', 'Other'];

export const AddAssetModal: React.FC<AddAssetModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('Brokerage');
  const [value, setValue] = useState('');

  const isValueType = typesWithValue.includes(type);

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setType(initialData?.type || 'Brokerage');
      setValue(initialData?.value?.toString() || '');
    }
  }, [isOpen, initialData]);

  const handleSave = () => {
    if (!name.trim()) {
      alert("Please enter an asset name.");
      return;
    }

    let assetData: Omit<Asset, 'id'>;

    if (isValueType) {
        const valueNum = parseFloat(value);
        if (isNaN(valueNum) || valueNum < 0) {
            alert("Please enter a valid, positive value for the asset.");
            return;
        }
        assetData = { name, type, value: valueNum };
    } else {
        assetData = { name, type, holdings: initialData?.holdings || [] };
    }
    
    onSave(assetData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Asset" : "Add Asset"}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Asset Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2"
            placeholder="e.g., Fidelity Brokerage, Primary Home"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Asset Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as AssetType)}
            className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2"
          >
            {assetTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        
        {isValueType && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Value ($)</label>
              <input
                type="number"
                value={value}
                onChange={e => setValue(e.target.value)}
                className="w-full bg-slate-700 border-slate-600 text-white rounded-md p-2"
                placeholder="0.00"
              />
            </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{initialData ? "Save Changes" : "Add Asset"}</Button>
        </div>
      </div>
    </Modal>
  );
};