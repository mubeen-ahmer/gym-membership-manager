import { createContext, useCallback, useContext, useState } from 'react';
import { IconCheckCircle, IconWarning, IconX } from '../components/Icons';

const ToastCtx = createContext({ success: () => {}, error: () => {}, warning: () => {} });

let _uid = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (msg, type, duration = 4000) => {
      const id = ++_uid;
      setToasts((p) => [...p.slice(-4), { id, msg, type }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const toast = {
    success: (m, d) => push(m, 'success', d),
    error: (m, d) => push(m, 'error', d),
    warning: (m, d) => push(m, 'warning', d),
  };

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastItem({ t, onDismiss }) {
  const cfg = {
    success: { cls: 'bg-emerald-600 border-emerald-500', icon: <IconCheckCircle className="w-4 h-4 shrink-0" /> },
    error:   { cls: 'bg-red-700 border-red-600',         icon: <IconWarning    className="w-4 h-4 shrink-0" /> },
    warning: { cls: 'bg-amber-600 border-amber-500',     icon: <IconWarning    className="w-4 h-4 shrink-0" /> },
  };
  const { cls, icon } = cfg[t.type] || cfg.success;
  return (
    <div className={`${cls} border flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl text-white w-80 animate-slide-in pointer-events-auto`}>
      {icon}
      <span className="text-sm font-medium flex-1 leading-snug">{t.msg}</span>
      <button
        onClick={() => onDismiss(t.id)}
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity mt-0.5"
      >
        <IconX className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export const useToast = () => useContext(ToastCtx);
