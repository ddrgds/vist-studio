import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  onUndo?: () => void;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  /** Shows a toast with an Undo button. `onUndo` is called if user clicks Undo before timeout. */
  undoable: (message: string, onUndo: () => void, duration?: number) => void;
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─────────────────────────────────────────────
// Individual Toast component
// ─────────────────────────────────────────────

const ICONS: Record<ToastType, React.ReactNode> = {
  success: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  error: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  info: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  warning: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
};

const COLORS: Record<ToastType, string> = {
  success: 'bg-emerald-900/90 border-emerald-700/60 text-emerald-100',
  error:   'bg-red-900/90 border-red-700/60 text-red-100',
  info:    'bg-zinc-800/95 border-zinc-700/60 text-zinc-100',
  warning: 'bg-amber-900/90 border-amber-700/60 text-amber-100',
};

const ICON_COLORS: Record<ToastType, string> = {
  success: 'text-emerald-400',
  error:   'text-red-400',
  info:    'text-zinc-400',
  warning: 'text-amber-400',
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
  onUndo?: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss, onUndo }) => (
  <div
    role="status"
    aria-live="polite"
    className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm text-sm font-medium animate-in slide-in-from-bottom-4 fade-in duration-300 ${COLORS[toast.type]}`}
    style={{ minWidth: '260px', maxWidth: '420px' }}
  >
    <span className={`shrink-0 ${ICON_COLORS[toast.type]}`}>
      {ICONS[toast.type]}
    </span>
    <span className="flex-1 leading-snug">{toast.message}</span>
    {toast.onUndo && (
      <button
        onClick={() => { toast.onUndo!(); onDismiss(toast.id); }}
        className="shrink-0 px-3 py-1 rounded-lg text-xs font-bold bg-white/15 hover:bg-white/25 transition-colors"
      >
        Undo
      </button>
    )}
    <button
      onClick={() => onDismiss(toast.id)}
      aria-label="Cerrar notificación"
      className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>
);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 3500) => {
    const id = crypto.randomUUID();
    setToasts(prev => {
      const updated = [...prev, { id, message, type }];
      return updated.length > 4 ? updated.slice(updated.length - 4) : updated;
    });
    const timer = setTimeout(() => dismiss(id), duration);
    timersRef.current.set(id, timer);
  }, [dismiss]);

  const undoable = useCallback((message: string, onUndo: () => void, duration = 5000) => {
    const id = crypto.randomUUID();
    setToasts(prev => {
      const updated = [...prev, { id, message, type: 'info' as ToastType, onUndo }];
      return updated.length > 4 ? updated.slice(updated.length - 4) : updated;
    });
    const timer = setTimeout(() => dismiss(id), duration);
    timersRef.current.set(id, timer);
  }, [dismiss]);

  const success = useCallback((msg: string, duration?: number) => addToast(msg, 'success', duration), [addToast]);
  const error   = useCallback((msg: string, duration?: number) => addToast(msg, 'error', duration ?? 5000), [addToast]);
  const info    = useCallback((msg: string, duration?: number) => addToast(msg, 'info', duration), [addToast]);
  const warning = useCallback((msg: string, duration?: number) => addToast(msg, 'warning', duration), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, success, error, info, warning, undoable }}>
      {children}
      {/* Toast container — fixed, bottom-right */}
      {toasts.length > 0 && (
        <div
          aria-label="Notificaciones"
          className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 items-end pointer-events-none"
        >
          {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} onDismiss={dismiss} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};
