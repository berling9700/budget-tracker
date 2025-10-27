
import React, { useState, useMemo } from 'react';
import { Asset, Holding } from '../../types';
import { Button } from './ui/Button';
import { AddHoldingModal } from './modals/AddHoldingModal';
import { Spinner } from './ui/Spinner';
import { fetchMultipleQuotes } from '../services/marketDataService';

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

const AssetAccountCard: React.FC<{
    asset: Asset,
    onEditAsset: () => void,
    onDeleteAsset: () => void,
    onAddHolding: () => void,
    onEditHolding: (holding: Holding) => void,
    onDeleteHolding: (holdingId: string) => void,
}> = (props) => {
    const { asset, onEditAsset, onDeleteAsset, onAddHolding, onEditHolding, onDeleteHolding } = props;
    const totalValue = asset.holdings?.reduce((sum, h) => sum + h.shares * h.currentPrice, 0) || 0;

    return (
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 bg-slate-800/80 flex justify-between items-center flex-wrap gap-2">
                <div>
                    <h3 className="text-xl font-bold text-white">{asset.name} <span className="text-sm font-normal text-slate-400 ml-2">{asset.type}</span></h3>
                    <p className="text-2xl font-mono text-purple-400">${totalValue.toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon-md" onClick={onEditAsset} aria-label="Edit Asset">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                        </svg>
                    </Button>
                    <Button variant="danger" size="icon-md" onClick={onDeleteAsset} aria-label="Delete Asset">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                        </svg>
                    </Button>
                    <Button size="icon-md" onClick={onAddHolding} aria-label="Add Holding">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                       </svg>
                    </Button>
                </div>
            </div>
            {asset.holdings && asset.holdings.length > 0 ? (
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
                            {asset.holdings.map(h => (
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

const AssetValueCard: React.FC<{
    asset: Asset,
    onEdit: () => void,
    onDelete: () => void,
}> = ({ asset, onEdit, onDelete }) => {
    return (
        <div className="bg-slate-800 rounded-xl shadow-lg p-4 flex justify-between items-center">
            <div>
                <h3 className="text-xl font-bold text-white">{asset.name} <span className="text-sm font-normal text-slate-400 ml-2">{asset.type}</span></h3>
                <p className="text-2xl font-mono text-purple-400">${(asset.value || 0).toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
                 <Button variant="ghost" size="icon-md" onClick={onEdit} aria-label="Edit Asset">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                    </svg>
                 </Button>
                 <Button variant="danger" size="icon-md" onClick={onDelete} aria-label="Delete Asset">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                    </svg>
                 </Button>
            </div>
        </div>
    );
};

interface AssetsDashboardProps {
  assets: Asset[];
  onSaveAssets: (assets: Asset[]) => void;
  onEditAsset: (asset: Asset | null) => void;
}

export const AssetsDashboard: React.FC<AssetsDashboardProps> = ({ assets, onSaveAssets, onEditAsset }) => {
    const [holdingModalOpen, setHoldingModalOpen] = useState(false);
    const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
    const [assetForNewHolding, setAssetForNewHolding] = useState<Asset | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshProgress, setRefreshProgress] = useState(0);
    const [refreshStatus, setRefreshStatus] = useState('');

    const totalValue = useMemo(() => {
        return assets.reduce((total, asset) => {
            if (asset.holdings) {
                return total + asset.holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
            }
            return total + (asset.value || 0);
        }, 0);
    }, [assets]);

    const handleDeleteAsset = (assetId: string) => {
        if (window.confirm("Are you sure you want to delete this asset? This cannot be undone.")) {
            onSaveAssets(assets.filter(acc => acc.id !== assetId));
        }
    };

    const handleSaveHolding = (holdingData: Omit<Holding, 'id'>) => {
        const assetToUpdateId = editingHolding ? assets.find(a => a.holdings?.some(h => h.id === editingHolding.id))?.id : assetForNewHolding?.id;
        if (!assetToUpdateId) return;

        const updatedAssets = assets.map(asset => {
            if (asset.id === assetToUpdateId) {
                let updatedHoldings;
                if (editingHolding) {
                    updatedHoldings = asset.holdings?.map(h => h.id === editingHolding.id ? { ...h, ...holdingData } : h);
                } else {
                    const newHolding: Holding = { ...holdingData, id: `hold-${Date.now()}`};
                    updatedHoldings = [...(asset.holdings || []), newHolding];
                }
                return { ...asset, holdings: updatedHoldings };
            }
            return asset;
        });
        onSaveAssets(updatedAssets);
        setEditingHolding(null);
        setAssetForNewHolding(null);
    };

    const handleDeleteHolding = (assetId: string, holdingId: string) => {
         const updatedAssets = assets.map(asset => {
            if (asset.id === assetId) {
                return { ...asset, holdings: asset.holdings?.filter(h => h.id !== holdingId) };
            }
            return asset;
        });
        onSaveAssets(updatedAssets);
    }
    
    const handleRefreshAllPrices = async () => {
        const allTickers = assets.flatMap(a => a.holdings?.map(h => h.ticker) || []);
        const uniqueTickers = [...new Set(allTickers)].filter(Boolean) as string[];

        if (uniqueTickers.length === 0) {
            alert("No holdings with ticker symbols found to refresh.");
            return;
        }
        
        setIsRefreshing(true);
        setRefreshProgress(0);
        setRefreshStatus(`Found ${uniqueTickers.length} unique ticker(s). Starting refresh...`);

        try {
            const quotes = await fetchMultipleQuotes(uniqueTickers, (progress) => {
                setRefreshProgress(progress);
                setRefreshStatus(''); // Clear status message once progress starts
            });

            if (quotes.size > 0) {
                const updatedAssets = assets.map(asset => {
                    if (!asset.holdings) return asset;
                    const updatedHoldings = asset.holdings.map(holding => {
                        const quote = quotes.get(holding.ticker.toUpperCase());
                        if (quote) {
                            return { ...holding, currentPrice: quote.price };
                        }
                        return holding;
                    });
                    return { ...asset, holdings: updatedHoldings };
                });
                onSaveAssets(updatedAssets);
                setRefreshStatus(`Successfully updated prices for ${quotes.size} ticker(s)!`);
            } else {
                setRefreshStatus("Could not fetch new price data. Check API key, connection, and daily limit.");
            }

        } catch (error: any) {
            setRefreshStatus(`Error: ${error.message}`);
        } finally {
            setTimeout(() => {
                setIsRefreshing(false);
                setRefreshStatus('');
            }, 4000); // Keep status message for a few seconds
        }
    };

    if (!assets) {
        return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }

    return (
    <div className="space-y-8">
      <div className="bg-slate-800 p-6 rounded-xl shadow-lg relative">
        <div className="text-center">
            <h3 className="text-slate-400 text-lg">Total Asset Value</h3>
            <p className="text-4xl font-bold text-purple-400">${totalValue.toFixed(2)}</p>
        </div>
        <Button 
            variant="secondary" 
            onClick={handleRefreshAllPrices} 
            disabled={isRefreshing}
            className="absolute top-4 right-4"
            aria-label="Refresh All Prices"
            size="icon-md"
        >
            {isRefreshing ? <Spinner size="sm" /> : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
            )}
        </Button>
        {isRefreshing && (
            <div className="absolute bottom-4 left-4 right-4">
                <p className="text-xs text-center text-slate-400 mb-1">{refreshStatus || `Refreshing prices... (${Math.round(refreshProgress)}%)`}</p>
                <div className="w-full bg-slate-600 rounded-full h-1.5">
                    <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${refreshProgress}%` }}></div>
                </div>
            </div>
        )}
      </div>
        
        {assets.length > 0 ? (
            <div className="space-y-6">
                {assets.map(asset => {
                    if (asset.holdings !== undefined) {
                        return (
                            <AssetAccountCard
                                key={asset.id}
                                asset={asset}
                                onEditAsset={() => onEditAsset(asset)}
                                onDeleteAsset={() => handleDeleteAsset(asset.id)}
                                onAddHolding={() => { setAssetForNewHolding(asset); setHoldingModalOpen(true); }}
                                onEditHolding={(holding) => { setEditingHolding(holding); setHoldingModalOpen(true); }}
                                onDeleteHolding={(holdingId) => handleDeleteHolding(asset.id, holdingId)}
                            />
                        )
                    } else {
                        return (
                           <AssetValueCard
                                key={asset.id}
                                asset={asset}
                                onEdit={() => onEditAsset(asset)}
                                onDelete={() => handleDeleteAsset(asset.id)}
                           />
                        )
                    }
                })}
            </div>
        ) : (
            <div className="text-center py-20 bg-slate-800 rounded-xl">
              <h2 className="text-2xl font-semibold text-white">No assets found.</h2>
              <p className="text-slate-400 mt-2 mb-6">Add an asset to start tracking your net worth.</p>
              <Button onClick={() => onEditAsset(null)}>Get Started</Button>
            </div>
        )}

       <AddHoldingModal
        isOpen={holdingModalOpen}
        onClose={() => { setHoldingModalOpen(false); setEditingHolding(null); setAssetForNewHolding(null); }}
        onSave={handleSaveHolding}
        initialData={editingHolding}
      />
    </div>
    )
};