import { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  confirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION = 4500;

const STYLES: Record<ToastType, { bar: string; icon: string; bg: string; border: string; text: string }> = {
  success: {
    bar:    'bg-[#1a4d2e]',
    icon:   'text-[#1a4d2e]',
    bg:     'bg-white',
    border: 'border-l-4 border-[#1a4d2e]',
    text:   'text-gray-800',
  },
  error: {
    bar:    'bg-red-600',
    icon:   'text-red-600',
    bg:     'bg-white',
    border: 'border-l-4 border-red-500',
    text:   'text-gray-800',
  },
  warning: {
    bar:    'bg-amber-500',
    icon:   'text-amber-500',
    bg:     'bg-white',
    border: 'border-l-4 border-amber-400',
    text:   'text-gray-800',
  },
  info: {
    bar:    'bg-blue-500',
    icon:   'text-blue-500',
    bg:     'bg-white',
    border: 'border-l-4 border-blue-400',
    text:   'text-gray-800',
  },
};

const ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

interface ConfirmDialogState {
  message: string;
  resolve: (value: boolean) => void;
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  const s = STYLES[toast.type];
  const Icon = ICONS[toast.type];

  return (
    <div
      className={`
        relative flex items-start gap-3 w-full max-w-sm rounded-lg shadow-lg
        ${s.bg} ${s.border} px-4 py-3
        animate-[slideIn_0.25s_ease-out]
      `}
      role="alert"
    >
      <Icon className={`mt-0.5 shrink-0 ${s.icon}`} size={18} />
      <p className={`flex-1 text-sm leading-snug ${s.text} pr-4`}>{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Fechar"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function ConfirmDialog({ state, onAnswer }: { state: ConfirmDialogState; onAnswer: (v: boolean) => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={22} />
          <p className="text-sm text-gray-700 leading-relaxed">{state.message}</p>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-4">
          <button
            onClick={() => onAnswer(false)}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={() => onAnswer(true)}
            className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

let nextId = 0;

// Permite que módulos não-React (ex: exportUtils) disparem toasts
type ToastFn = (type: ToastType, message: string) => void;
let _externalToast: ToastFn | null = null;
export function setExternalToast(fn: ToastFn) { _externalToast = fn; }
export function fireToast(type: ToastType, message: string) {
  if (_externalToast) _externalToast(type, message);
  else console.warn('[toast]', type, message);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmDialogState | null>(null);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  }, []);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = ++nextId;
    setToasts(prev => [...prev.slice(-4), { id, type, message }]);
    const timer = setTimeout(() => remove(id), TOAST_DURATION);
    timers.current.set(id, timer);
  }, [remove]);

  // Registra o toast globalmente para uso em módulos não-React
  useState(() => { setExternalToast(toast); });

  const success = useCallback((m: string) => toast('success', m), [toast]);
  const error   = useCallback((m: string) => toast('error', m),   [toast]);
  const warning = useCallback((m: string) => toast('warning', m), [toast]);
  const info    = useCallback((m: string) => toast('info', m),    [toast]);

  const confirm = useCallback((message: string): Promise<boolean> =>
    new Promise(resolve => {
      setConfirmState({ message, resolve });
    }),
  []);

  const handleConfirmAnswer = (value: boolean) => {
    if (confirmState) {
      confirmState.resolve(value);
      setConfirmState(null);
    }
  };

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info, confirm }}>
      {children}

      {/* Toast stack — canto superior direito */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[9998] flex flex-col gap-2 pointer-events-none"
        style={{ minWidth: '300px' }}
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>

      {/* Diálogo de confirmação */}
      {confirmState && (
        <ConfirmDialog state={confirmState} onAnswer={handleConfirmAnswer} />
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
