
import React from 'react';

type Page = 'dashboard' | 'budgets' | 'assets';

interface NavProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

export const Nav: React.FC<NavProps> = ({ currentPage, onPageChange }) => {
  const navItems: { id: Page, label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'budgets', label: 'Budgets' },
    { id: 'assets', label: 'Assets' },
  ];
  
  return (
    <div className="flex space-x-2 border-b-2 border-slate-700 mb-8">
      {navItems.map(item => (
        <button
          key={item.id}
          onClick={() => onPageChange(item.id)}
          className={`px-4 py-2 text-lg font-semibold transition-colors focus:outline-none -mb-0.5 ${currentPage === item.id ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white'}`}
          aria-current={currentPage === item.id ? 'page' : undefined}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};