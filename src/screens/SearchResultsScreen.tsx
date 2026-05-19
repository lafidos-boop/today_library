// 검색 결과 화면 — 매칭 도서 목록 또는 "결과 없음" 메시지.
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Map as MapIcon, ChevronRight, AlertCircle } from 'lucide-react';
import { ScreenWrapper } from '../components/Layout';
import type { Book } from '../types';

export const SearchResultsScreen = ({
  query,
  results,
  selectBook,
  onSearch,
}: {
  query: string;
  results: Book[];
  selectBook: (b: Book) => void;
  onSearch: (query: string) => void;
}) => {
  const [searchValue, setSearchValue] = useState(query);

  return (
    <ScreenWrapper>
      <header className="mb-8 mt-2">
        <h1 className="text-3xl font-black text-onSurface mb-1">
          {query === '__NEW_BOOKS__' ? '새로 들어온 도서' : '검색 결과'}
        </h1>
        <p className="text-onSurfaceVariant font-medium">
          {query === '__NEW_BOOKS__'
            ? '최근 한 달 안에 새로 등록된 도서예요.'
            : `"${query}"에 대한 검색 결과입니다.`}
        </p>
      </header>

      <div className="relative mb-8 group">
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

      {results.length > 0 ? (
        <div className="space-y-4">
          {results.map((book) => (
            <motion.div
              key={book.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => selectBook(book)}
              className="bg-white p-5 rounded-3xl shadow-sm border border-[#e2e3d6]/30 flex gap-5 items-center"
            >
              <div className="w-16 h-24 rounded-xl overflow-hidden shadow-md flex-shrink-0">
                <img src={book.cover} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black rounded uppercase mb-1 inline-block">
                  {book.status === 'available' ? '대출 가능' : book.status === 'borrowed' ? '대출 중' : '연체 중'}
                </span>
                <h3 className="font-black text-onSurface text-lg leading-tight mb-1 truncate">{book.title}</h3>
                <p className="text-xs text-onSurfaceVariant font-medium mb-2">{book.author} · {book.publisher}</p>
                <div className="flex items-center gap-1 text-[10px] text-primary font-bold">
                  <MapIcon size={12} />
                  <span>{book.location.room}, {book.location.shelf}, {book.location.row}, {book.location.col}</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-onSurfaceVariant opacity-30" />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-7 bg-white rounded-3xl flex flex-col justify-between relative overflow-hidden shadow-sm border border-error/20"
          >
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-error/5 rounded-full blur-3xl" />
            <div className="flex justify-between items-start z-10 mb-6">
              <div>
                <h2 className="text-xl font-black text-onSurface mb-2">알림</h2>
                <div className="flex items-center gap-2 text-error">
                  <AlertCircle size={20} />
                  <p className="text-sm font-black">검색결과를 확인해 주세요.</p>
                </div>
              </div>
            </div>
            <div className="z-10">
              <p className="text-lg font-black text-onSurface mb-1 leading-snug">
                저희가 보유하고 있지 않은 책입니다.
              </p>
              <p className="text-sm text-onSurfaceVariant font-medium opacity-60">
                제목이나 저자명을 다시 한번 확인하시거나,<br />
                다른 검색어를 입력해 보세요.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </ScreenWrapper>
  );
};
