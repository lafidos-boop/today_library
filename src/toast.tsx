// 가벼운 토스트 시스템 — Provider + useToast() 훅 + window.toast() 호환 헬퍼.
// 사용:
//   const toast = useToast();
//   toast.success('저장되었습니다');
//   toast.error('오류 발생');
import React, { createContext, useCallback, useContext, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
type Toast = { id: number; kind: ToastKind; message: string };

type ToastApi = {
  show: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// 컴포넌트 외부(이벤트 핸들러 등)에서도 호출할 수 있도록 글로벌 fallback
let externalToast: ToastApi | null = null;
export const toastApi: ToastApi = {
  show: (k, m) => externalToast?.show(k, m),
  success: (m) => externalToast?.success(m),
  error: (m) => externalToast?.error(m),
  info: (m) => externalToast?.info(m),
};

const KIND_CONFIG = {
  success: { icon: CheckCircle2, bg: 'bg-[#5d7f13]', text: 'text-white' },
  error: { icon: AlertCircle, bg: 'bg-[#ba1a1a]', text: 'text-white' },
  info: { icon: Info, bg: 'bg-[#476500]', text: 'text-white' },
} as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((kind: ToastKind, message: string) => {
    const id = ++idRef.current;
    setToasts((cur) => [...cur, { id, kind, message }]);
    setTimeout(() => remove(id), 3500);
  }, [remove]);

  const api: ToastApi = {
    show,
    success: (m) => show('success', m),
    error: (m) => show('error', m),
    info: (m) => show('info', m),
  };

  // external (componentless) 호출용 등록
  externalToast = api;

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {/* 토스트 컨테이너: 화면 상단 가운데 (모바일 친화) */}
      <div className="fixed top-3 left-0 right-0 z-[200] flex flex-col items-center gap-2 pointer-events-none px-4">
        <AnimatePresence>
          {toasts.map((t) => {
            const cfg = KIND_CONFIG[t.kind];
            const Icon = cfg.icon;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className={`pointer-events-auto ${cfg.bg} ${cfg.text} max-w-md w-full flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl shadow-black/10`}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className="text-sm font-bold flex-1 leading-snug">{t.message}</span>
                <button
                  onClick={() => remove(t.id)}
                  className="flex-shrink-0 opacity-60 hover:opacity-100 active:scale-95 transition-all"
                  aria-label="닫기"
                >
                  <X size={16} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
