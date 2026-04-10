import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { useLanguage } from '../../contexts/LanguageContext';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  variant?: 'danger' | 'warning';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, onClose, onConfirm, title, message, variant = 'danger', loading,
}) => {
  const { t } = useLanguage();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
          variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
        }`}>
          {variant === 'danger'
            ? <Trash2 size={24} className="text-red-600 dark:text-red-400" />
            : <AlertTriangle size={24} className="text-yellow-600 dark:text-yellow-400" />
          }
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">{message}</p>
        <div className="flex gap-3 w-full">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">{t('common.cancel')}</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 justify-center ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
          >
            {loading ? t('common.loading') : t('common.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
