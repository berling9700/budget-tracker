
import React, { useState, useEffect, useRef } from 'react';

interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({ children, className = '', ...props }) => {
    return (
        <button
            className={`block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

interface DropdownProps {
    trigger: React.ReactNode;
    children: React.ReactNode;
}

export const Dropdown: React.FC<DropdownProps> = ({ trigger, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleToggle = () => setIsOpen(prev => !prev);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <div onClick={handleToggle}>
                {trigger}
            </div>

            {isOpen && (
                <div
                    className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                    onClick={() => setIsOpen(false)} // Close when an item is clicked
                >
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};
