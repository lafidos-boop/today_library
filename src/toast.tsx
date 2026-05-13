// 가벼운 토스트 시스템 — Provider + useToast() 훅 + window.toast() 호환 헬퍼.
import React, { createContext, useCallback, useContext, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
type Toast = { id: number; kind: ToastKind; message: string; kakaoText?: string };

type ToastApi = {
  show: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  loanSuccess: (info: { bookTitle: string; userName: string; borrowDate: string; returnDate: string }) => void;
  returnSuccess: (info: { bookTitle: string; userName: string }) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

let externalToast: ToastApi | null = null;
export const toastApi: ToastApi = {
  show: (k, m) => externalToast?.show(k, m),
  success: (m) => externalToast?.success(m),
  error: (m) => externalToast?.error(m),
  info: (m) => externalToast?.info(m),
  loanSuccess: (i) => externalToast?.loanSuccess(i),
  returnSuccess: (i) => externalToast?.returnSuccess(i),
};

const KIND_CONFIG = {
  success: { icon: CheckCircle2, bg: 'bg-[#5d7f13]', text: 'text-white' },
  error: { icon: AlertCircle, bg: 'bg-[#ba1a1a]', text: 'text-white' },
  info: { icon: Info, bg: 'bg-[#476500]', text: 'text-white' },
} as const;

const KakaoIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="black">
    <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.74 3.813 6.063l-.938 3.5 4.063-2.688A11.4 11.4 0 0 0 12 17.5c5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
  </svg>
);

function KakaoButton({ kakaoText, onCopied }: { kakaoText: string; onCopied: () => void }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(kakaoText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = kakaoText;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    onCopied();
  };

  return (
    <button
      onClick={handleCopy}
      className="flex-shrink-0 w-7 h-7 bg-[#FEE500] rounded-lg flex items-center justify-center active:scale-95 transition-all shadow-sm"
      aria-label="카카오톡 메세지 복사"
    >
      <KakaoIcon />
    </button>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((kind: ToastKind, message: string, kakaoText?: string) => {
    const id = ++idRef.current;
    setToasts((cur) => [...cur, { id, kind, message, kakaoText }]);
    setTimeout(() => remove(id), 3500);
  }, [remove]);

  const api: ToastApi = {
    show,
    success: (m) => show('success', m),
    error: (m) => show('error', m),
    info: (m) => show('info', m),
    loanSuccess: ({ bookTitle, userName, borrowDate, returnDate }) =>
      show(
        'success',
        '도서 대출이 완료되었습니다.',
        `[대출합니다]\n1. 책제목: ${bookTitle}\n2. 대출자이름: ${userName}\n3. 대출기간: ${borrowDate} ~ ${returnDate}`,
      ),
    returnSuccess: ({ bookTitle, userName }) => {
      const today = new Date();
      const dateStr = today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
      show(
        'success',
        '반납 처리가 완료되었습니다.',
        `[반납합니다]\n1. 책제목: ${bookTitle}\n2. 반납자이름: ${userName}\n3. 반납날짜: ${dateStr}`,
      );
    },
  };

  externalToast = api;

  return (
    <ToastCtx.Provider value={api}>
      {children}
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
                <span className="text-sm font-bold flex-1 leading-snug">
                  {copiedId === t.id ? '카카오톡 메세지가 복사되었습니다.' : t.message}
                </span>
                {t.kakaoText && copiedId !== t.id && (
                  <KakaoButton
                    kakaoText={t.kakaoText}
                    onCopied={() => {
                      setCopiedId(t.id);
                      setTimeout(() => setCopiedId(null), 1800);
                    }}
                  />
                )}
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
