// 도서 상세 화면 — 검색에서 진입 시 "대출하기", 내 대출에서 진입 시 "반납/연장" 버튼.
import React from 'react';
import { Map as MapIcon, RotateCcw, RefreshCw } from 'lucide-react';
import { ScreenWrapper } from '../components/Layout';
import type { Book, LoanWithBook } from '../types';

export const BookDetailScreen = ({
  book,
  onBack,
  onLoan,
  currentLoan,
  onReturn,
  onExtend,
}: {
  book: Book;
  onBack: () => void;
  onLoan: (b: Book) => void;
  currentLoan?: LoanWithBook;
  onReturn?: (loanId: number, bookTitle: string) => void;
  onExtend?: (loan: LoanWithBook) => void;
}) => {
  const isMyLoan = !!currentLoan;
  return (
    <ScreenWrapper>
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span
            className={`px-2.5 py-1 text-white text-[10px] font-black rounded-lg uppercase tracking-wider ${
              isMyLoan ? (currentLoan!.isOverdue ? 'bg-error' : 'bg-primaryContainer') : 'bg-primary'
            }`}
          >
            {isMyLoan ? (currentLoan!.isOverdue ? '연체 중' : '대출 중') : '보관 중'}
          </span>
          <span className="px-2.5 py-1 bg-surfaceContainerHigh text-onSurfaceVariant text-xs font-bold rounded-lg uppercase tracking-widest">
            {book.id}
          </span>
        </div>
        <h2 className="text-2xl font-black text-onSurface leading-tight">{book.title}</h2>
      </div>

      <div className="flex gap-6 mb-6">
        <div className="w-[32%] shrink-0">
          <div className="relative">
            <div className="absolute -right-1.5 -bottom-1.5 w-full h-full bg-primary/10 rounded-xl -z-10" />
            <div className="aspect-[3/4.5] rounded-xl overflow-hidden shadow-lg border border-white/20">
              <img src={book.cover} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-3.5">
          <div>
            <p className="text-[10px] font-bold text-onSurfaceVariant uppercase tracking-widest mb-0.5 opacity-50">저자</p>
            <p className="text-sm font-black text-onSurface">{book.author}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-onSurfaceVariant uppercase tracking-widest mb-0.5 opacity-50">출판사</p>
            <p className="text-sm font-black text-onSurface">{book.publisher}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-onSurfaceVariant uppercase tracking-widest mb-0.5 opacity-50">장르</p>
            <p className="text-sm font-black text-onSurface">{book.genre}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 relative overflow-hidden shadow-sm border border-[#e2e3d6]/30 mb-6">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#add461]" />
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-black text-onSurface">도서 위치 정보</h3>
          <div className="p-1.5 bg-primary/5 rounded-lg text-primary">
            <MapIcon size={18} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-lg font-black text-primary leading-tight">{book.location.room}</p>
          <p className="text-sm font-bold text-onSurfaceVariant">
            {book.location.shelf}, {book.location.row}, {book.location.col}
          </p>
        </div>
      </div>

      {/* 내 대출 화면에서 진입한 경우: 대출기간 정보 + 반납/연장 버튼 */}
      {isMyLoan ? (
        <>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e3d6]/30 mb-6">
            <h3 className="text-sm font-black text-onSurface mb-3">대출 기간</h3>
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-onSurfaceVariant/40 uppercase">대출일</span>
                <span className="text-sm font-black text-onSurface">{currentLoan!.borrowDate}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-onSurfaceVariant/40 uppercase">반납 예정</span>
                <span className={`text-sm font-black ${currentLoan!.isOverdue ? 'text-error' : 'text-onSurface'}`}>
                  {currentLoan!.returnDate}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-onSurfaceVariant/40 uppercase">D-Day</span>
                <span className={`text-lg font-black tracking-tighter ${currentLoan!.isOverdue ? 'text-error' : 'text-primary'}`}>
                  {currentLoan!.isOverdue ? `D+${currentLoan!.dDay}` : `D${currentLoan!.dDay}`}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onReturn && onReturn((currentLoan as any).id, book.title)}
              className="py-4 rounded-xl font-black text-base bg-[#af7c73] text-white shadow-lg shadow-[#af7c73]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              반납하기
            </button>
            <button
              onClick={() => onExtend && onExtend(currentLoan!)}
              disabled={currentLoan!.isOverdue}
              className="py-4 rounded-xl font-black text-base bg-primary text-white shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              대출 연장
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={() => onLoan(book)}
          disabled={book.status === 'borrowed'}
          className={`w-full py-4 rounded-xl font-black text-base shadow-xl transition-all active:scale-95 ${
            book.status === 'borrowed'
              ? 'bg-onSurfaceVariant/10 text-onSurfaceVariant/40 cursor-not-allowed shadow-none'
              : 'bg-primary text-white shadow-primary/20'
          }`}
        >
          {book.status === 'borrowed' ? '대출 중' : '대출하기'}
        </button>
      )}
    </ScreenWrapper>
  );
};
