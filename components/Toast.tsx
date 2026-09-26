'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type?: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 p-3.5 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-800 animate-in slide-in-from-bottom-5 duration-150"
        >
          {toast.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          ) : toast.type === 'info' ? (
            <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-100">{toast.title}</p>
            {toast.description && (
              <p className="text-[11px] text-slate-400 mt-0.5">{toast.description}</p>
            )}
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            aria-label="Хаах"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
