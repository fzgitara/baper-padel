import React from 'react';
import { AlertTriangle } from 'lucide-react';

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
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content glass-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '400px', width: '90%', textAlign: 'center', padding: 'var(--space-6)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
          <div
            style={{
              background: variant === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: variant === 'danger' ? 'var(--danger)' : 'var(--accent-primary)',
              padding: 'var(--space-3)',
              borderRadius: '50%',
            }}
          >
            <AlertTriangle size={32} />
          </div>
        </div>
        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
          {title}
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-5)' }}>
          {message}
        </p>
        <div className="flex gap-3 justify-center">
          <button className="btn btn-outline" onClick={onClose}>
            {cancelText}
          </button>
          <button
            className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
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
