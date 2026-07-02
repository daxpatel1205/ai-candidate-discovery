import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  exiting?: boolean;
}

interface ToastContextType {
  toast: (opts: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

function ToastItem({ t, onDismiss }: { t: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const d = t.duration ?? 3500;
    const timer = setTimeout(() => onDismiss(t.id), d);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, onDismiss]);

  return (
    <div
      className={`toast ${t.type}${t.exiting ? ' exiting' : ''}`}
      role="alert"
      aria-live="polite"
      style={{ '--toast-duration': `${t.duration ?? 3500}ms` } as React.CSSProperties}
    >
      <span className="toast-icon" aria-hidden="true">{ICONS[t.type]}</span>
      <div className="toast-body">
        <p className="toast-title">{t.title}</p>
        {t.message && <p className="toast-message">{t.message}</p>}
      </div>
      <button
        className="toast-close"
        onClick={() => onDismiss(t.id)}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  }, []);

  const addToast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-4), { ...opts, id }]);
  }, []);

  const ctx: ToastContextType = {
    toast: addToast,
    success: (title, message) => addToast({ type: 'success', title, message }),
    error:   (title, message) => addToast({ type: 'error',   title, message }),
    warning: (title, message) => addToast({ type: 'warning', title, message }),
    info:    (title, message) => addToast({ type: 'info',    title, message }),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {createPortal(
        <div className="toast-portal" aria-label="Notifications">
          {toasts.map((t) => (
            <ToastItem key={t.id} t={t} onDismiss={dismiss} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
