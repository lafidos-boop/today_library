// 내 대출 화면 — 대출 중인 도서 목록, 반납/연장 액션.
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, BookMarked, X } from 'lucide-react';
import { ScreenWrapper } from '../components/Layout';
import { toastApi } from '../toast';
import type { Book, Loan, LoanWithBook } from '../types';

export const MyLoansScreen = ({
  loans,
  setLoans,
  selectBook,
  refreshLoans,
  userName,
}: {
  loans: LoanWithBook[];
  setLoans: React.Dispatch<React.SetStateAction<LoanWithBook[]>>;
  selectBook: (b: Book) => void;
  refreshLoans: () => void;
  userName: string;
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!userName) return;
    setHistoryLoading(true);
    fetch(`/api/history?name=${encodeURIComponent(userName)}`)
      .then((r) => r.json())
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [userName]);

  const borrowHistory = history;
  const returnCount = history.length;

  const formatHistoryTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const [activeAction, setActiveAction] = useState<{
    type: 'return' | 'extend';
    loanId: number;
    bookId: string;
    bookTitle: string;
    room?: string;
    borrowDate?: string;
    newDate?: string;
    newDDay?: number;
  } | null>(null);
  const [actionCopied, setActionCopied] = useState(false);

  const handleReturnRequest = (loan: any) => {
    setActiveAction({
      type: 'return',
      loanId: loan.id,
      bookId: loan.bookId,
      bookTitle: loan.book.title,
      room: loan.book.location?.room || '',
    });
  };

  const handleExtendRequest = (loan: any) => {
    // MM.DD format — 2주(14일) 연장
    const [m, d] = loan.returnDate.split('.').map(Number);
    let nm = m;
    let nd = d + 14;
    if (nd > 30) {
      nm += 1;
      nd -= 30;
    }
    const newDate = `${String(nm).padStart(2, '0')}.${String(nd).padStart(2, '0')}`;

    setActiveAction({
      type: 'extend',
      loanId: loan.id,
      bookId: loan.bookId,
      bookTitle: loan.book.title,
      borrowDate: loan.borrowDate,
      newDate,
      newDDay: (loan.dDay || 0) - 14,
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const handleReturnWithCopy = async () => {
    if (!activeAction) return;
    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    const text = `[반납합니다] "${activeAction.room}"\n1. 책제목: "${activeAction.bookTitle}"\n2. 대출자이름: "${userName}"\n3. 반납날짜: "${today}"`;
    await copyToClipboard(text);
    setActionCopied(true);
    setTimeout(() => {
      setActionCopied(false);
      handleActionConfirm();
    }, 1400);
  };

  const handleExtendWithCopy = async () => {
    if (!activeAction) return;
    const text = `[연장합니다]\n1. 책제목: ${activeAction.bookTitle}\n2. 연장자이름: ${userName}\n3. 대출기간: ${activeAction.borrowDate} ~ ${activeAction.newDate}`;
    await copyToClipboard(text);
    setActionCopied(true);
    setTimeout(() => {
      setActionCopied(false);
      handleActionConfirm();
    }, 1400);
  };

  const handleActionConfirm = async () => {
    if (!activeAction) return;

    try {
      if (activeAction.type === 'return') {
        await fetch(`/api/loans/${activeAction.loanId}`, { method: 'DELETE' });
      } else {
        await fetch(`/api/loans/${activeAction.loanId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            returnDate: activeAction.newDate,
            dDay: activeAction.newDDay,
          }),
        });
      }
      await refreshLoans();
    } catch (error) {
      console.error('Action failed:', error);
      toastApi.error('처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
    setActiveAction(null);
  };

  return (
    <ScreenWrapper>
      <div className="flex items-center justify-between mb-6 mt-1">
        <h1 className="text-2xl font-black text-onSurface tracking-tight">내 대출 현황</h1>
        <button className="text-primary font-bold text-xs underline underline-offset-4">전체 기록</button>
      </div>

      {/* 전체 요약 */}
      <div className="bg-white rounded-2xl p-4 flex items-center justify-around shadow-sm border border-[#e2e3d6]/30 mb-6">
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-onSurfaceVariant/40 uppercase tracking-widest mb-1">대출 중</span>
          <span className="text-2xl font-black text-primary">{loans.filter((l) => !l.isOverdue).length}</span>
        </div>
        <div className="w-px h-8 bg-[#e2e3d6]/50" />
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-onSurfaceVariant/40 uppercase tracking-widest mb-1">연체</span>
          <span className="text-2xl font-black text-error">{loans.filter((l) => l.isOverdue).length}</span>
        </div>
        <div className="w-px h-8 bg-[#e2e3d6]/50" />
        <button
          onClick={() => setShowHistory(true)}
          className="flex flex-col items-center active:scale-95 transition-all"
        >
          <span className="text-[10px] font-black text-onSurfaceVariant/40 uppercase tracking-widest mb-1">내 대출 기록</span>
          <span className="text-2xl font-black text-primary">
            {historyLoading ? <span className="text-base">…</span> : returnCount}
          </span>
        </button>
      </div>

      {/* 내 대출 기록 모달 */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface w-full max-w-md rounded-t-3xl p-6 max-h-[75vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <BookMarked size={20} className="text-primary" />
                  <h2 className="text-lg font-black text-onSurface">내 대출 기록</h2>
                </div>
                <button onClick={() => setShowHistory(false)} className="p-1 text-onSurfaceVariant/50">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                {historyLoading ? (
                  <p className="text-center text-sm text-onSurfaceVariant/50 py-10">불러오는 중…</p>
                ) : history.length === 0 ? (
                  <p className="text-center text-sm text-onSurfaceVariant/50 py-10">대출 기록이 없습니다.</p>
                ) : (
                  borrowHistory.map((h, i) => (
                    <div key={i} className="bg-white rounded-2xl px-4 py-3 border border-[#e2e3d6]/30">
                      <p className="font-black text-sm text-onSurface truncate mb-1.5">{h.book}</p>
                      <div className="flex gap-4 text-[11px] text-onSurfaceVariant/60">
                        <span>대출 {formatHistoryTime(h.borrowTime)}</span>
                        <span>반납 {h.returnTime ? formatHistoryTime(h.returnTime) : '대출 중'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 결과/확인 섹션 */}
      <AnimatePresence mode="wait">
        {activeAction && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className={`rounded-2xl p-5 border-2 ${activeAction.type === 'return' ? 'bg-[#fcf8f7] border-[#e2c1bb]/30' : 'bg-primary/5 border-primary/20'}`}>
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-2.5 rounded-xl ${activeAction.type === 'return' ? 'bg-[#af7c73]/10 text-[#af7c73]' : 'bg-primary/10 text-primary'}`}>
                  {activeAction.type === 'return' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                </div>
                <div className="flex-1">
                  {activeAction.type === 'return' ? (
                    <p className="text-sm font-bold text-onSurface leading-relaxed">
                      <span className="font-black">'{activeAction.bookTitle}'</span>을 반납하려고 합니다.<br />
                      책의 위치를 확인하고 꽂아 두셨을까요?
                    </p>
                  ) : (
                    <p className="text-sm font-bold text-onSurface leading-relaxed">
                      <span className="font-black">'{activeAction.bookTitle}'</span>의 대출기간이<br />
                      <span className="text-primary font-black underline underline-offset-2">{activeAction.newDate}</span>까지 연장되었습니다.
                    </p>
                  )}
                </div>
              </div>
              {activeAction.type === 'extend' ? (
                <button
                  onClick={handleExtendWithCopy}
                  disabled={actionCopied}
                  className="w-full py-3.5 rounded-xl font-black text-sm shadow-lg transition-all active:scale-95 bg-[#FEE500] text-black shadow-yellow-200/50 flex items-center justify-center gap-2 disabled:opacity-80"
                >
                  {actionCopied ? (
                    '카카오톡 메세지가 복사되었습니다.'
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="black">
                        <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.74 3.813 6.063l-.938 3.5 4.063-2.688A11.4 11.4 0 0 0 12 17.5c5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
                      </svg>
                      카카오톡 메세지 복사 및 확인
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleReturnWithCopy}
                  disabled={actionCopied}
                  className="w-full py-3.5 rounded-xl font-black text-sm shadow-lg transition-all active:scale-95 bg-[#FEE500] text-black shadow-yellow-200/50 flex items-center justify-center gap-2 disabled:opacity-80"
                >
                  {actionCopied ? (
                    '카카오톡 메세지가 복사되었습니다.'
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="black">
                        <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.74 3.813 6.063l-.938 3.5 4.063-2.688A11.4 11.4 0 0 0 12 17.5c5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
                      </svg>
                      카카오톡 메세지 복사 및 확인
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 대출 리스트 */}
      <div className="space-y-3">
        {loans.length > 0 ? (
          loans.map((loan) => (
            <motion.div
              key={loan.bookId}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-2xl p-4 flex flex-col shadow-sm border border-[#e2e3d6]/30 overflow-hidden relative ${loan.isOverdue ? 'border-l-4 border-l-error' : ''}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 pr-4" onClick={() => selectBook(loan.book)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${loan.isOverdue ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
                      {loan.isOverdue ? '연체' : '대출 중'}
                    </span>
                    <span className="text-[10px] font-bold text-onSurfaceVariant/40">{loan.book.id}</span>
                  </div>
                  <h3 className="font-black text-base text-onSurface truncate leading-tight">{loan.book.title}</h3>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-black tracking-tighter ${loan.isOverdue ? 'text-error' : 'text-primary'}`}>
                    {loan.isOverdue ? `D+${loan.dDay}` : `D${loan.dDay}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-onSurfaceVariant/40 uppercase">대출</span>
                    <span className="text-xs font-black text-onSurface">{loan.borrowDate}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-onSurfaceVariant/40 uppercase">반납</span>
                    <span className={`text-xs font-black ${loan.isOverdue ? 'text-error' : 'text-onSurface'}`}>{loan.returnDate}</span>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleReturnRequest(loan)}
                    disabled={!!activeAction}
                    className="h-9 px-3.5 bg-surfaceContainerLow text-onSurfaceVariant text-[11px] font-black rounded-xl border border-[#e2e3d6]/50 active:scale-95 transition-all disabled:opacity-30"
                  >
                    반납하기
                  </button>
                  <button
                    onClick={() => handleExtendRequest(loan)}
                    disabled={!!activeAction || loan.isOverdue}
                    className="h-9 px-3.5 bg-primary text-white text-[11px] font-black rounded-xl shadow-md shadow-primary/10 active:scale-95 transition-all disabled:opacity-30"
                  >
                    연장하기
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-20 text-center bg-[#f4f5e7]/50 rounded-[40px] border-2 border-dashed border-[#e2e3d6]">
            <p className="text-onSurfaceVariant font-bold opacity-30">대출 중인 도서가 없습니다.</p>
          </div>
        )}
      </div>
    </ScreenWrapper>
  );
};
