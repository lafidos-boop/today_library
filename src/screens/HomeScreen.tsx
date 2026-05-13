// 홈 화면 — 환영 인사, 대출 요약, 검색바, QR코드 버튼.
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, BookOpen, QrCode } from 'lucide-react';
import { ScreenWrapper } from '../components/Layout';
import type { Screen, Book, LoanWithBook } from '../types';

export const HomeScreen = ({
  userName,
  loans,
  selectBook,
  onSearch,
  setScreen,
}: {
  userName: string;
  loans: LoanWithBook[];
  selectBook: (b: Book) => void;
  onSearch: (query: string) => void;
  setScreen: (s: Screen) => void;
}) => {
  const [searchValue, setSearchValue] = useState('');

  const borrowingCount = loans.filter((l) => !l.isOverdue).length;
  const overdueCount = loans.filter((l) => l.isOverdue).length;

  return (
    <ScreenWrapper>
      <header className="mb-6 mt-2">
        <h1 className="text-3xl font-black text-onSurface mb-1">반가워요, {userName}님</h1>
        <p className="text-onSurfaceVariant font-medium">지혜의 숲에서 당신을 기다리고 있어요.</p>
      </header>

      {/* 1. 나의 대출 현황 */}
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={() => setScreen('my-loans')}
        className="p-7 bg-white rounded-3xl flex flex-col justify-between relative overflow-hidden shadow-sm border border-[#e2e3d6]/30 mb-6 cursor-pointer"
      >
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
        <div className="flex justify-between items-start z-10 mb-8">
          <div>
            <h2 className="text-xl font-black text-onSurface mb-1">나의 대출 현황</h2>
            <p className="text-sm text-onSurfaceVariant font-medium">정해진 기간 내에 지혜를 반납하세요.</p>
          </div>
          <BookOpen className="text-primaryContainer" size={28} />
        </div>
        <div className="flex gap-10 z-10">
          <div className="flex flex-col">
            <span className="text-4xl font-black text-primary">{borrowingCount}</span>
            <span className="text-[11px] font-bold text-onSurfaceVariant uppercase tracking-widest mt-1">대출 중</span>
          </div>
          <div className="flex flex-col">
            <span className="text-4xl font-black text-error">{overdueCount}</span>
            <span className="text-[11px] font-bold text-onSurfaceVariant uppercase tracking-widest mt-1">연체</span>
          </div>
        </div>
      </motion.div>

      {/* 2. 검색 바 */}
      <div className="relative mb-6 group">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchValue.trim()) {
              onSearch(searchValue.trim());
            }
          }}
          placeholder="제목, 저자, 출판사 등 검색"
          className="w-full bg-white border border-[#e2e3d6]/60 rounded-2xl py-5 pl-6 pr-16 text-base text-onSurface placeholder:text-onSurfaceVariant/40 shadow-sm focus:ring-2 focus:ring-primary/10 transition-all font-medium"
        />
        <button
          onClick={() => searchValue.trim() && onSearch(searchValue.trim())}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-primary text-white rounded-xl shadow-lg shadow-primary/20 active:scale-90 transition-all"
        >
          <Search size={18} />
        </button>
      </div>

      {/* 3. QR 코드로 검색 (미구현 — 추후 작업) */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        className="w-full p-5 bg-[#add461] text-[#1a1c15] rounded-3xl flex flex-row items-center gap-5 shadow-lg shadow-primary/5 mb-8"
      >
        <div className="p-3 bg-white/40 rounded-2xl flex-shrink-0">
          <QrCode size={24} />
        </div>
        <div className="text-left">
          <h3 className="text-lg font-black leading-tight">QR코드로 검색</h3>
          <p className="text-xs opacity-70 font-bold">도서의 QR 코드를 스캔하세요</p>
        </div>
      </motion.button>
    </ScreenWrapper>
  );
};
