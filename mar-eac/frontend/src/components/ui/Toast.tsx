import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 end-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in max-w-sm ${
      type === 'success'
        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-300'
        : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/40 dark:border-red-700 dark:text-red-300'
    }`}>
      {type === 'success' ? <CheckCircle size={18} className="flex-shrink-0" /> : <XCircle size={18} className="flex-shrink-0" />}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  );
};
