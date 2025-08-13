
import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isFullScreen?: boolean;
  headerActions?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', isFullScreen = false, headerActions }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl'
  }

  const overlayClasses = `fixed inset-0 bg-black bg-opacity-70 z-50 flex ${isFullScreen ? '' : 'justify-center items-center p-4'}`;
  const containerClasses = `bg-slate-800 flex flex-col ${isFullScreen ? 'w-screen h-screen' : `rounded-xl shadow-2xl w-full ${sizeClasses[size]}`}`;
  const contentWrapperClasses = ` ${isFullScreen ? 'flex-grow overflow-y-auto' : 'overflow-y-auto max-h-[80vh]'}`;

  return (
    <div className={overlayClasses} onClick={onClose}>
      <div className={containerClasses} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <div className="flex items-center space-x-2">
            {headerActions}
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className={contentWrapperClasses}>
            <div className="p-6 h-full">
                {children}
            </div>
        </div>
      </div>
    </div>
  );
};