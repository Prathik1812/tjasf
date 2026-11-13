import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ toast: { success, error, info } }}>
      {children}
      {/* Toast container portal */}
      <div className="fixed top-5 right-5 z-[999999] pointer-events-none flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl transition-all duration-300 animate-in slide-in-from-top-3 ${
              t.type === 'success'
                ? 'bg-[#047857] border-emerald-800 text-white'
                : t.type === 'error'
                ? 'bg-[#b91c1c] border-red-800 text-white'
                : 'bg-[#102342] border-[#1d3556] text-white'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle size={18} className="text-emerald-200" />}
              {t.type === 'error' && <AlertCircle size={18} className="text-red-200" />}
              {t.type === 'info' && <Info size={18} className="text-blue-200" />}
            </div>
            <div className="flex-1 text-xs font-semibold leading-relaxed">{t.message}</div>
            <button
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
}
