import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { card } from '../lib/ui';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`${card} w-[90%] max-w-[400px] p-6 text-center`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex justify-center">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full ${
              variant === 'danger'
                ? 'bg-red-500/15 text-red-500'
                : 'bg-emerald-500/15 text-emerald-600'
            }`}
          >
            <AlertTriangle size={32} />
          </div>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">{message}</p>
        <div className="flex justify-center gap-3">
          <button
            className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            className={`inline-flex items-center rounded-lg px-4 py-2 font-semibold text-white transition-colors ${
              variant === 'danger' ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
