// 도서 업로드 — 제목/저자/ISBN 검색 → 카카오 Books API로 도서 정보 조회 → 서가 배치 입력 → 구글 시트에 저장.
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, BookOpen, MapPin, Check, ChevronRight, Camera } from 'lucide-react';
import { ScreenWrapper, SubPageHeader } from '../../components/Layout';
import { toastApi } from '../../toast';

type BookResult = {
  title: string;
  author: string;
  publisher: string;
  cover: string;
  isbn: string;
  description?: string;
};

const ROOMS = ['새벽도서관', '별빛책방'];
const SHELF_OPTIONS: Record<string, string[]> = {
  '새벽도서관': ['A', 'B'],
  '별빛책방': ['D', 'E', 'F', 'G'],
};
const ROW_OPTIONS: Record<string, number[]> = {
  '새벽도서관': [1, 2, 3, 4, 5, 6, 7],
  '별빛책방': [1, 2, 3],
};
const COL_OPTIONS: Record<string, number[]> = {
  '새벽도서관': [1, 2, 3, 4, 5],
  '별빛책방': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
};

export const BookSearchUpload = ({ onBack }: { onBack: () => void }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<BookResult[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // 서가 배치 폼
  const [room, setRoom] = useState(ROOMS[0]);
  const [shelf, setShelf] = useState('');
  const [row, setRow] = useState('');
  const [col, setCol] = useState('');
  const [genre, setGenre] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setShelf('');
    setRow('');
    setCol('');
  }, [room]);

  const searchKakao = async () => {
    const apiKey = import.meta.env.VITE_KAKAO_API_KEY;
    const q = query.trim();
    if (!q) return;

    if (!apiKey || apiKey === 'YOUR_KAKAO_API_KEY') {
      toastApi.error('카카오 API 키가 설정되지 않았습니다. (VITE_KAKAO_API_KEY)');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setResults([]);
    try {
      const isIsbn = /^\d[\d-]{8,}$/.test(q);
      const target = isIsbn ? 'isbn' : 'title';
      const cleanQuery = isIsbn ? q.replace(/-/g, '') : q;
      const res = await fetch(
        `https://dapi.kakao.com/v3/search/book?target=${target}&query=${encodeURIComponent(cleanQuery)}&size=10`,
        { headers: { Authorization: `KakaoAK ${apiKey}` } },
      );
      const data = await res.json();
      if (data.documents?.length > 0) {
        setResults(
          data.documents.map((doc: any) => ({
            title: doc.title,
            author: doc.authors.join(', '),
            publisher: doc.publisher,
            cover: doc.thumbnail,
            isbn: doc.isbn.split(' ')[0],
            description: doc.contents,
          })),
        );
      }
    } catch {
      toastApi.error('검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async () => {
    if (!selectedBook || !shelf || !row || !col) {
      toastApi.error('서가, 행, 열을 모두 선택해 주세요.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/books/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedBook.title,
          author: selectedBook.author,
          publisher: selectedBook.publisher,
          genre: genre.trim() || '일반',
          isbn: selectedBook.isbn,
          cover: selectedBook.cover,
          room,
          shelf: shelf.trim(),
          row: row.trim(),
          col: col.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toastApi.success(`'${selectedBook.title}' 도서가 추가되었습니다. (${data.bookId})`);
        // 검색 화면으로 돌아가 연속 업로드 가능하게
        setSelectedBook(null);
        setQuery('');
        setResults([]);
        setHasSearched(false);
        setShelf('');
        setRow('');
        setCol('');
        setGenre('');
      } else {
        toastApi.error(data.error || '저장 중 오류가 발생했습니다.');
      }
    } catch {
      toastApi.error('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── 2단계: 서가 배치 폼 ──
  if (selectedBook) {
    return (
      <ScreenWrapper>
        <SubPageHeader icon={MapPin} title="서가 배치" onBack={() => setSelectedBook(null)} />

        {/* 선택한 도서 미리보기 */}
        <div className="flex gap-3 bg-white p-4 rounded-2xl mb-6 border border-[#e2e3d6]/30 shadow-sm">
          {selectedBook.cover ? (
            <img src={selectedBook.cover} className="w-14 h-[72px] rounded-xl object-cover flex-shrink-0" alt={selectedBook.title} />
          ) : (
            <div className="w-14 h-[72px] rounded-xl bg-[#e6eacb] flex items-center justify-center flex-shrink-0">
              <BookOpen size={20} className="text-primary/40" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-black text-onSurface text-sm leading-snug">{selectedBook.title}</p>
            <p className="text-xs text-onSurfaceVariant mt-0.5">{selectedBook.author}</p>
            <p className="text-[11px] text-onSurfaceVariant/60">{selectedBook.publisher}</p>
            {selectedBook.isbn && (
              <p className="text-[10px] text-primary/60 font-bold mt-1">ISBN {selectedBook.isbn}</p>
            )}
          </div>
        </div>

        {/* 배치 폼 */}
        <div className="space-y-4">
          {/* 열람실 선택 */}
          <div>
            <label className="text-xs font-bold text-onSurfaceVariant px-1 block mb-2">열람실</label>
            <div className="flex gap-2">
              {ROOMS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRoom(r)}
                  className={`flex-1 py-3 rounded-xl text-sm font-black transition-all active:scale-95 ${
                    room === r
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'bg-[#e6eacb] text-primary'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* 서가/행/열 */}
          <div>
            <label className="text-xs font-bold text-onSurfaceVariant px-1 block mb-2">서가 (책장)</label>
            <select
              value={shelf}
              onChange={(e) => setShelf(e.target.value)}
              className="w-full bg-white border border-[#e2e3d6]/60 rounded-xl py-3.5 px-4 text-sm font-medium font-mono focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
            >
              <option value="">서가 선택</option>
              {SHELF_OPTIONS[room].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-onSurfaceVariant px-1 block mb-2">행</label>
              <select
                value={row}
                onChange={(e) => setRow(e.target.value)}
                className="w-full bg-white border border-[#e2e3d6]/60 rounded-xl py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
              >
                <option value="">행 선택</option>
                {ROW_OPTIONS[room].map((n) => (
                  <option key={n} value={String(n)}>{n}행</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-onSurfaceVariant px-1 block mb-2">열</label>
              <select
                value={col}
                onChange={(e) => setCol(e.target.value)}
                className="w-full bg-white border border-[#e2e3d6]/60 rounded-xl py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
              >
                <option value="">열 선택</option>
                {COL_OPTIONS[room].map((n) => (
                  <option key={n} value={String(n)}>{n}열</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-onSurfaceVariant px-1 block mb-2">장르 (선택)</label>
            <input
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="예: 소설, 자연과학, 에세이 …"
              className="w-full bg-white border border-[#e2e3d6]/60 rounded-xl py-3.5 px-4 text-sm font-medium font-korean focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={isSaving}
          className="w-full mt-8 bg-primary text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:opacity-90 transition-all disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Check size={18} />
              구글 시트에 저장
            </>
          )}
        </motion.button>
      </ScreenWrapper>
    );
  }

  // ── 1단계: 도서 검색 ──
  return (
    <ScreenWrapper>
      <SubPageHeader icon={BookOpen} title="도서 업로드" onBack={onBack} />

      {/* 검색 입력 */}
      <div className="relative mb-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchKakao()}
          placeholder="제목, 저자 또는 ISBN으로 검색"
          className="w-full bg-white border border-[#e2e3d6]/60 rounded-2xl py-4 pl-5 pr-24 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1.5">
          <label className="w-9 h-9 flex items-center justify-center bg-[#e6eacb] text-primary rounded-xl cursor-pointer active:scale-90 transition-all" title="카메라로 촬영">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) toastApi.info('사진 촬영 후 제목을 직접 입력해 주세요.');
              }}
            />
            <Camera size={16} />
          </label>
          <button
            onClick={searchKakao}
            disabled={isSearching}
            className="w-9 h-9 flex items-center justify-center bg-primary text-white rounded-xl shadow-md shadow-primary/20 active:scale-90 transition-all disabled:opacity-50"
          >
            {isSearching ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Search size={16} />
            )}
          </button>
        </div>
      </div>
      <p className="text-[11px] text-onSurfaceVariant/50 font-medium px-1 mb-5">카카오 Books API로 도서 정보를 자동으로 불러옵니다.</p>

      {/* 검색 결과 */}
      {hasSearched && !isSearching && results.length === 0 && (
        <div className="text-center py-12">
          <BookOpen size={36} className="text-onSurfaceVariant/20 mx-auto mb-3" />
          <p className="text-sm font-bold text-onSurfaceVariant/50">검색 결과가 없습니다.</p>
          <p className="text-xs text-onSurfaceVariant/40 mt-1">다른 제목이나 ISBN을 입력해 보세요.</p>
        </div>
      )}

      <div className="space-y-2.5">
        {results.map((book, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => setSelectedBook(book)}
            className="w-full flex items-center gap-3 bg-white p-4 rounded-2xl border border-[#e2e3d6]/30 shadow-sm text-left active:scale-[0.98] transition-all"
          >
            {book.cover ? (
              <img src={book.cover} className="w-12 h-[60px] rounded-lg object-cover flex-shrink-0" alt={book.title} />
            ) : (
              <div className="w-12 h-[60px] rounded-lg bg-[#e6eacb] flex items-center justify-center flex-shrink-0">
                <BookOpen size={18} className="text-primary/30" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-black text-onSurface text-sm leading-snug line-clamp-2">{book.title}</p>
              <p className="text-xs text-onSurfaceVariant mt-0.5 truncate">{book.author}</p>
              <p className="text-[11px] text-onSurfaceVariant/60 truncate">{book.publisher}</p>
            </div>
            <ChevronRight size={16} className="text-onSurfaceVariant/30 flex-shrink-0" />
          </motion.button>
        ))}
      </div>
    </ScreenWrapper>
  );
};
