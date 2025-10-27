

import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Asset, Liability, Budget } from '../../types';
import { Button } from './ui/Button';
import { AddLiabilityModal } from './modals/AddLiabilityModal';

interface NetWorthDashboardProps {
    assets: Asset[];
    liabilities: Liability[];
    onSaveLiabilities: (liabilities: Liability[]) => void;
    activeBudget: Budget | undefined;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00c49f', '#ffbb28', '#ff82a9', '#a2d2ff'];

const LiabilityRow: React.FC<{ liability: Liability, onEdit: () => void, onDelete: () => void }> = ({ liability, onEdit, onDelete }) => (
    <div className="flex justify-between items-center p-3 hover:bg-slate-700/50 rounded-lg">
        <span className="font-semibold">{liability.name}</span>
        <div className="flex items-center gap-4">
            <span className="font-mono">${liability.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" onClick={onEdit}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                </Button>
                <Button variant="danger" size="icon-sm" onClick={onDelete}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                </Button>
            </div>
        </div>
    </div>
);


export const NetWorthDashboard: React.FC<NetWorthDashboardProps> = ({ assets, liabilities, onSaveLiabilities, activeBudget }) => {
    const [liabilityModalOpen, setLiabilityModalOpen] = useState(false);
    const [editingLiability, setEditingLiability] = useState<Liability | null>(null);

    const { totalAssets, assetAllocationData, totalLiabilities, netWorth, netWorthChartData } = useMemo(() => {
        const totalAssets = assets.reduce((sum, asset) => {
            if (asset.holdings) {
                return sum + asset.holdings.reduce((hSum, h) => hSum + h.shares * h.currentPrice, 0);
            }
            return sum + (asset.value || 0);
        }, 0);
        
        const allocationMap = new Map<string, number>();
        assets.forEach(asset => {
            if (asset.holdings) {
                asset.holdings.forEach(holding => {
                    const value = holding.shares * holding.currentPrice;
                    const key = holding.ticker || 'Unknown Ticker';
                    allocationMap.set(key, (allocationMap.get(key) || 0) + value);
                });
            } else if (asset.value) {
                const key = asset.name;
                allocationMap.set(key, (allocationMap.get(key) || 0) + asset.value);
            }
        });

        const assetAllocationData = Array.from(allocationMap.entries()).map(([name, value]) => ({
            name,
            value
        })).filter(d => d.value > 0);

        const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
        const netWorth = totalAssets - totalLiabilities;
        const netWorthChartData = [
            { name: 'Assets', value: totalAssets },
            { name: 'Liabilities', value: totalLiabilities }
        ].filter(d => d.value > 0);

        return { totalAssets, assetAllocationData, totalLiabilities, netWorth, netWorthChartData };
    }, [assets, liabilities]);
    
    const { budgetChartData, totalBudgeted, totalSpent } = useMemo(() => {
        if (!activeBudget) return { budgetChartData: [], totalBudgeted: 0, totalSpent: 0 };
        const totalBudgeted = activeBudget.categories.reduce((sum, cat) => sum + cat.budgeted, 0);
        const totalSpent = activeBudget.expenses.reduce((sum, exp) => sum + exp.amount, 0);

        const budgetChartData = [{
            name: activeBudget.name,
            Budgeted: totalBudgeted,
            Spent: totalSpent
        }];
        return { budgetChartData, totalBudgeted, totalSpent };

    }, [activeBudget]);

    const handleSaveLiability = (data: Omit<Liability, 'id'>) => {
        if (editingLiability) {
            onSaveLiabilities(liabilities.map(l => l.id === editingLiability.id ? { ...l, ...data } : l));
        } else {
            onSaveLiabilities([...liabilities, { ...data, id: `lia-${Date.now()}` }]);
        }
    };

    const handleDeleteLiability = (id: string) => {
        if (window.confirm("Are you sure you want to delete this liability?")) {
            onSaveLiabilities(liabilities.filter(l => l.id !== id));
        }
    }

    return (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800 p-6 rounded-xl shadow-lg text-center">
                    <h3 className="text-slate-400 text-lg">Total Assets</h3>
                    <p className="text-4xl font-bold text-green-400">${totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl shadow-lg text-center">
                    <h3 className="text-slate-400 text-lg">Total Liabilities</h3>
                    <p className="text-4xl font-bold text-red-400">${totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl shadow-lg text-center">
                    <h3 className="text-slate-400 text-lg">Net Worth</h3>
                    <p className={`text-4xl font-bold ${netWorth >= 0 ? 'text-purple-400' : 'text-orange-500'}`}>${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-bold text-white mb-4">Net Worth Breakdown</h3>
                    {netWorthChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                {/* FIX: The `percent` prop from recharts can be undefined. Use nullish coalescing to provide a default value of 0 to prevent type errors during arithmetic operations. */}
                                <Pie data={netWorthChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} >
                                    <Cell key="cell-0" fill="#82ca9d" />
                                    <Cell key="cell-1" fill="#f87171" />
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <p className="text-center h-[300px] flex items-center justify-center text-slate-500">Add assets and liabilities to see your net worth.</p>}
                </div>

                <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-bold text-white mb-4">Portfolio Allocation</h3>
                     {assetAllocationData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={assetAllocationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                                    {assetAllocationData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}/>
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                     ) : <p className="text-center h-[300px] flex items-center justify-center text-slate-500">Add assets to see your portfolio allocation.</p>}
                </div>
                
                {/* Liabilities List */}
                <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white">Liabilities</h3>
                        <Button onClick={() => { setEditingLiability(null); setLiabilityModalOpen(true); }}>Add Liability</Button>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                        {liabilities.length > 0 ? liabilities.map(l => (
                            <LiabilityRow 
                                key={l.id} 
                                liability={l}
                                onEdit={() => { setEditingLiability(l); setLiabilityModalOpen(true); }}
                                onDelete={() => handleDeleteLiability(l.id)}
                            />
                        )) : <p className="text-center text-slate-500 py-10">No liabilities added yet.</p>}
                    </div>
                </div>

                <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-bold text-white mb-4">Budget vs. Actual Spending (Annual)</h3>
                    {activeBudget ? (
                         <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={budgetChartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis type="number" stroke="#94a3b8" />
                                <YAxis type="category" dataKey="name" stroke="#94a3b8" width={120} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}/>
                                <Legend />
                                <Bar dataKey="Budgeted" fill="#8b5cf6" />
                                <Bar dataKey="Spent" fill="#F56565" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-center h-[300px] flex items-center justify-center text-slate-500">Set an active budget to see spending analysis.</p>}
                </div>
            </div>

            <AddLiabilityModal
                isOpen={liabilityModalOpen}
                onClose={() => setLiabilityModalOpen(false)}
                onSave={handleSaveLiability}
                initialData={editingLiability}
            />
        </div>
    );
};