import React from 'react';

interface NavProps {
  currentPage: 'budgets' | 'investments';
  onPageChange: (page: 'budgets' | 'investments') => void;
}

export const Nav: React.FC<NavProps> = ({ currentPage, onPageChange }) => {
  return (
    <div className="flex space-x-2 border-b-2 border-slate-700 mb-8">
      <button
        onClick={() => onPageChange('budgets')}
        className={`px-4 py-2 text-lg font-semibold transition-colors focus:outline-none -mb-0.5 ${currentPage === 'budgets' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white'}`}
        aria-current={currentPage === 'budgets' ? 'page' : undefined}
      >
        Budgets
      </button>
      <button
        onClick={() => onPageChange('investments')}
        className={`px-4 py-2 text-lg font-semibold transition-colors focus:outline-none -mb-0.5 ${currentPage === 'investments' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white'}`}
        aria-current={currentPage === 'investments' ? 'page' : undefined}
      >
        Investments
      </button>
    </div>
  );
};