// 내 대출 화면 — 대출 중인 도서 목록, 반납/연장 액션.
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { ScreenWrapper } from '../components/Layout';
import { toastApi } from '../toast';
import type { Book, Loan, LoanWithBook } from '../types';

export const MyLoansScreen = ({
  loans,
  setLoans,
  selectBook,
  refreshLoans,
}: {
  loans: LoanWithBook[];
  setLoans: React.Dispatch<React.SetStateAction<LoanWithBook[]>>;
  selectBook: (b: Book) => void;
  refreshLoans: () => void;
}) => {
  const [activeAction, setActiveAction] = useState<{
    type: 'return' | 'extend';
    loanId: number;
    bookId: string;
    bookTitle: string;
    newDate?: string;
    newDDay?: number;
  } | null>(null);

  const handleReturnRequest = (loan: any) => {
    setActiveAction({
      type: 'return',
      loanId: loan.id,
      bookId: loan.bookId,
      bookTitle: loan.book.title,
    });
  };

  const handleExtendRequest = (loan: any) => {
    // MM.DD format
    const [m, d] = loan.returnDate.split('.').map(Number);
    let nm = m;
    let nd = d + 7;
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
      newDate,
      newDDay: (loan.dDay || 0) - 7,
    });
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
      toastApi.success(activeAction.type === 'return' ? '반납 처리가 완료되었습니다.' : '대출 기간이 연장되었습니다.');
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
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-onSurfaceVariant/40 uppercase tracking-widest mb-1">다음에 읽을 책</span>
          <span className="text-2xl font-black text-onSurfaceVariant/20">0</span>
        </div>
      </div>

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
              <button
                onClick={handleActionConfirm}
                className={`w-full py-3.5 rounded-xl font-black text-sm shadow-lg transition-all active:scale-95 ${
                  activeAction.type === 'return'
                    ? 'bg-[#af7c73] text-white shadow-[#af7c73]/20'
                    : 'bg-primary text-white shadow-primary/20'
                }`}
              >
                확인
              </button>
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
