import React, { useState, useMemo } from 'react';
import { InvestmentAccount, Holding } from '../../types';
import { Button } from './ui/Button';
import { AddInvestmentAccountModal } from './modals/AddInvestmentAccountModal';
import { AddHoldingModal } from './modals/AddHoldingModal';
import { Spinner } from './ui/Spinner';

const HoldingRow: React.FC<{
    holding: Holding,
    onEdit: () => void,
    onDelete: () => void,
}> = ({ holding, onEdit, onDelete }) => {
    const value = holding.shares * holding.currentPrice;
    const gainLoss = (holding.currentPrice - holding.purchasePrice) * holding.shares;
    const isGain = gainLoss >= 0;

    return (
        <tr className="border-b border-slate-700 hover:bg-slate-700/50">
            <td className="p-3 font-semibold">{holding.ticker}</td>
            <td className="p-3">{holding.name}</td>
            <td className="p-3 text-right font-mono">{holding.shares.toLocaleString()}</td>
            <td className="p-3 text-right font-mono">${holding.purchasePrice.toFixed(2)}</td>
            <td className="p-3 text-right font-mono">${holding.currentPrice.toFixed(2)}</td>
            <td className="p-3 text-right font-mono">${value.toFixed(2)}</td>
            <td className={`p-3 text-right font-mono ${isGain ? 'text-green-400' : 'text-red-400'}`}>
                {isGain ? '+' : ''}${gainLoss.toFixed(2)}
            </td>
            <td className="p-3 text-right">
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon-sm" onClick={onEdit}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                    </Button>
                    <Button variant="danger" size="icon-sm" onClick={onDelete}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                    </Button>
                </div>
            </td>
        </tr>
    );
}

const InvestmentAccountCard: React.FC<{
    account: InvestmentAccount,
    onEditAccount: () => void,
    onDeleteAccount: () => void,
    onAddHolding: () => void,
    onEditHolding: (holding: Holding) => void,
    onDeleteHolding: (holdingId: string) => void,
}> = (props) => {
    const { account, onEditAccount, onDeleteAccount, onAddHolding, onEditHolding, onDeleteHolding } = props;
    const totalValue = account.holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);

    return (
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 bg-slate-800/80 flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-white">{account.name} <span className="text-sm font-normal text-slate-400 ml-2">{account.type}</span></h3>
                    <p className="text-2xl font-mono text-purple-400">${totalValue.toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={onEditAccount}>Edit</Button>
                    <Button variant="danger" onClick={onDeleteAccount}>Delete</Button>
                    <Button onClick={onAddHolding}>Add Holding</Button>
                </div>
            </div>
            {account.holdings.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-900/50 text-xs text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="p-3">Ticker</th>
                                <th className="p-3">Name</th>
                                <th className="p-3 text-right">Shares</th>
                                <th className="p-3 text-right">Purchase Price</th>
                                <th className="p-3 text-right">Current Price</th>
                                <th className="p-3 text-right">Value</th>
                                <th className="p-3 text-right">Gain/Loss</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {account.holdings.map(h => (
                                <HoldingRow
                                    key={h.id}
                                    holding={h}
                                    onEdit={() => onEditHolding(h)}
                                    onDelete={() => onDeleteHolding(h.id)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="p-6 text-center text-slate-500">No holdings in this account yet.</p>
            )}
        </div>
    )
}

interface InvestmentsDashboardProps {
  accounts: InvestmentAccount[];
  onSaveAccounts: (accounts: InvestmentAccount[]) => void;
}

export const InvestmentsDashboard: React.FC<InvestmentsDashboardProps> = ({ accounts, onSaveAccounts }) => {
    const [accountModalOpen, setAccountModalOpen] = useState(false);
    const [holdingModalOpen, setHoldingModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<InvestmentAccount | null>(null);
    const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
    const [accountForNewHolding, setAccountForNewHolding] = useState<InvestmentAccount | null>(null);

    const { totalValue, totalCost, totalGainLoss } = useMemo(() => {
        let totalValue = 0;
        let totalCost = 0;
        accounts.forEach(acc => {
            acc.holdings.forEach(h => {
                totalValue += h.shares * h.currentPrice;
                totalCost += h.shares * h.purchasePrice;
            })
        });
        return { totalValue, totalCost, totalGainLoss: totalValue - totalCost };
    }, [accounts]);

    const handleSaveAccount = (accountData: Omit<InvestmentAccount, 'id' | 'holdings'>) => {
        if (editingAccount) {
            const updatedAccounts = accounts.map(acc => acc.id === editingAccount.id ? { ...acc, ...accountData } : acc);
            onSaveAccounts(updatedAccounts);
        } else {
            const newAccount: InvestmentAccount = { ...accountData, id: `invacc-${Date.now()}`, holdings: [] };
            onSaveAccounts([...accounts, newAccount]);
        }
        setEditingAccount(null);
    };

    const handleDeleteAccount = (accountId: string) => {
        if (window.confirm("Are you sure you want to delete this account and all its holdings? This cannot be undone.")) {
            onSaveAccounts(accounts.filter(acc => acc.id !== accountId));
        }
    };

    const handleSaveHolding = (holdingData: Omit<Holding, 'id'>) => {
        const accountToUpdateId = editingHolding ? accounts.find(a => a.holdings.some(h => h.id === editingHolding.id))?.id : accountForNewHolding?.id;
        if (!accountToUpdateId) return;

        const updatedAccounts = accounts.map(acc => {
            if (acc.id === accountToUpdateId) {
                let updatedHoldings;
                if (editingHolding) {
                    updatedHoldings = acc.holdings.map(h => h.id === editingHolding.id ? { ...h, ...holdingData } : h);
                } else {
                    const newHolding: Holding = { ...holdingData, id: `hold-${Date.now()}`};
                    updatedHoldings = [...acc.holdings, newHolding];
                }
                return { ...acc, holdings: updatedHoldings };
            }
            return acc;
        });
        onSaveAccounts(updatedAccounts);
        setEditingHolding(null);
        setAccountForNewHolding(null);
    };

    const handleDeleteHolding = (accountId: string, holdingId: string) => {
         const updatedAccounts = accounts.map(acc => {
            if (acc.id === accountId) {
                return { ...acc, holdings: acc.holdings.filter(h => h.id !== holdingId) };
            }
            return acc;
        });
        onSaveAccounts(updatedAccounts);
    }
    
    if (!accounts) {
        return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }

    return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg text-center">
            <h3 className="text-slate-400 text-lg">Total Portfolio Value</h3>
            <p className="text-4xl font-bold text-purple-400">${totalValue.toFixed(2)}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg text-center">
            <h3 className="text-slate-400 text-lg">Total Cost Basis</h3>
            <p className="text-4xl font-bold text-slate-300">${totalCost.toFixed(2)}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg text-center">
            <h3 className="text-slate-400 text-lg">Total Gain / Loss</h3>
            <p className={`text-4xl font-bold ${totalGainLoss >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                {totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toFixed(2)}
            </p>
        </div>
      </div>

      <div className="flex justify-end">
          <Button onClick={() => { setEditingAccount(null); setAccountModalOpen(true); }}>
            Add Investment Account
          </Button>
      </div>
        
        {accounts.length > 0 ? (
            <div className="space-y-6">
                {accounts.map(acc => (
                    <InvestmentAccountCard
                        key={acc.id}
                        account={acc}
                        onEditAccount={() => { setEditingAccount(acc); setAccountModalOpen(true); }}
                        onDeleteAccount={() => handleDeleteAccount(acc.id)}
                        onAddHolding={() => { setAccountForNewHolding(acc); setHoldingModalOpen(true); }}
                        onEditHolding={(holding) => { setEditingHolding(holding); setHoldingModalOpen(true); }}
                        onDeleteHolding={(holdingId) => handleDeleteHolding(acc.id, holdingId)}
                    />
                ))}
            </div>
        ) : (
            <div className="text-center py-20 bg-slate-800 rounded-xl">
              <h2 className="text-2xl font-semibold text-white">No investment accounts found.</h2>
              <p className="text-slate-400 mt-2 mb-6">Add an account to start tracking your investments.</p>
              <Button onClick={() => { setEditingAccount(null); setAccountModalOpen(true); }}>Get Started</Button>
            </div>
        )}

      <AddInvestmentAccountModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        onSave={handleSaveAccount}
        initialData={editingAccount}
      />

       <AddHoldingModal
        isOpen={holdingModalOpen}
        onClose={() => { setHoldingModalOpen(false); setEditingHolding(null); setAccountForNewHolding(null); }}
        onSave={handleSaveHolding}
        initialData={editingHolding}
      />
    </div>
    )
};