import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (opts: { type: ToastType; message: string }) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-green-500 flex-shrink-0" />,
  error:   <XCircle    size={18} className="text-red-500 flex-shrink-0" />,
  warning: <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />,
  info:    <Info       size={18} className="text-blue-500 flex-shrink-0" />,
};

const BG: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
  error:   'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
  warning: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
  info:    'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
};

const Toaster: React.FC<{ toasts: ToastItem[]; remove: (id: string) => void }> = ({ toasts, remove }) => (
  <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 max-w-sm w-full" dir="rtl">
    {toasts.map(t => (
      <div key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border shadow-lg text-sm ${BG[t.type]}`}>
        {ICONS[t.type]}
        <span className="flex-1 text-gray-800 dark:text-gray-200">{t.message}</span>
        <button onClick={() => remove(t.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    ))}
  </div>
);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback(({ type, message }: { type: ToastType; message: string }) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Toaster toasts={toasts} remove={remove} />
    </ToastContext.Provider>
  );
};
