/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, 
  Menu, 
  BookOpen, 
  QrCode, 
  Home, 
  Book as BookIcon, 
  User, 
  ArrowLeft, 
  Map as MapIcon,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Users,
  Camera,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

// --- Types ---
type Screen = 'login' | 'signup' | 'home' | 'book-detail' | 'my-loans' | 'profile' | 'admin' | 'search-results';

interface Book {
  id: string;
  title: string;
  author: string;
  publisher: string;
  genre: string;
  cover: string;
  location: {
    shelf: string;
    row: string;
    col: string;
    room: string;
  };
  status: 'available' | 'borrowed' | 'overdue';
}

interface Loan {
  bookId: string;
  borrowDate: string;
  returnDate: string;
  isOverdue: boolean;
  dDay: number;
  progress: number;
}

// --- Mock Data ---
const MOCK_BOOKS: Book[] = [
  {
    id: 'BD-0001',
    title: '숲의 목소리: 식물의 언어를 듣다',
    author: '한지수',
    publisher: '오늘출판사',
    genre: '자연과학 / 에세이',
    cover: 'https://picsum.photos/seed/forest/400/600',
    location: {
      shelf: 'A책장',
      row: '2행',
      col: '3열',
      room: '오늘도서관 제1열람실'
    },
    status: 'available'
  },
  {
    id: 'BD-0002',
    title: '식물학자의 일기',
    author: '김오늘',
    publisher: '그린북스',
    genre: '자연과학',
    cover: 'https://picsum.photos/seed/botany/400/600',
    location: {
      shelf: 'B책장',
      row: '1행',
      col: '5열',
      room: '오늘도서관 제1열람실'
    },
    status: 'overdue'
  }
];

const MOCK_LOANS: (Loan & { book: Book })[] = [
  {
    bookId: 'BD-0002',
    book: MOCK_BOOKS[1],
    borrowDate: '04.10',
    returnDate: '05.01',
    isOverdue: true,
    dDay: 2,
    progress: 100
  },
  {
    bookId: 'BD-0003',
    book: {
      ...MOCK_BOOKS[0],
      title: '숲의 기억을 걷다',
      author: '이연두',
      cover: 'https://picsum.photos/seed/walk/400/600'
    },
    borrowDate: '04.15',
    returnDate: '05.22',
    isOverdue: false,
    dDay: -12,
    progress: 60
  },
  {
    bookId: 'BD-0004',
    book: {
      ...MOCK_BOOKS[0],
      title: '고전의 향기',
      author: '박문학',
      cover: 'https://picsum.photos/seed/classic/400/600'
    },
    borrowDate: '04.20',
    returnDate: '05.28',
    isOverdue: false,
    dDay: -18,
    progress: 30
  }
];

// --- Theme Constants ---
const COLORS = {
  primary: '#476500',
  primaryContainer: '#5d7f13',
  onPrimary: '#ffffff',
  surface: '#fafaed',
  surfaceContainer: '#eeefe2',
  surfaceContainerLow: '#f4f5e7',
  error: '#ba1a1a',
  onSurface: '#1a1c15',
  onSurfaceVariant: '#444939',
};

// --- Components ---

const ScreenWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    className="flex-1 overflow-y-auto pb-24 px-6 pt-20"
  >
    {children}
  </motion.div>
);

const BottomNav = ({ active, setScreen }: { active: Screen, setScreen: (s: Screen) => void }) => (
  <nav className="fixed bottom-0 left-0 w-full z-50 bg-[#fafaed]/80 backdrop-blur-xl border-t border-[#e2e3d6]/30 pb-safe">
    <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
      <button 
        onClick={() => setScreen('home')}
        className={`flex flex-col items-center justify-center transition-all ${active === 'home' ? 'text-primary scale-110' : 'text-[#44483d]'}`}
      >
        <div className={`p-1 rounded-xl transition-all ${active === 'home' ? 'bg-[#c8f17a] scale-105' : ''}`}>
          <Home size={22} fill={active === 'home' ? 'currentColor' : 'none'} />
        </div>
        <span className="text-[10px] font-bold mt-1">홈</span>
      </button>

      <button 
        onClick={() => setScreen('my-loans')}
        className={`flex flex-col items-center justify-center transition-all ${active === 'my-loans' ? 'text-primary scale-110' : 'text-[#44483d]'}`}
      >
        <div className={`p-1 rounded-xl transition-all ${active === 'my-loans' ? 'bg-[#c8f17a] scale-105' : ''}`}>
          <BookIcon size={22} fill={active === 'my-loans' ? 'currentColor' : 'none'} />
        </div>
        <span className="text-[10px] font-bold mt-1">내 대출</span>
      </button>

      <button 
        onClick={() => setScreen('profile')}
        className={`flex flex-col items-center justify-center transition-all ${active === 'profile' ? 'text-primary scale-110' : 'text-[#44483d]'}`}
      >
        <div className={`p-1 rounded-xl transition-all ${active === 'profile' ? 'bg-[#c8f17a] scale-105' : ''}`}>
          <User size={22} fill={active === 'profile' ? 'currentColor' : 'none'} />
        </div>
        <span className="text-[10px] font-bold mt-1">프로필</span>
      </button>
    </div>
  </nav>
);

const Header = ({ title, showBack, onBack, setScreen, profileImage }: { title: string, showBack?: boolean, onBack?: () => void, setScreen: (s: Screen) => void, profileImage: string }) => (
  <header className="fixed top-0 left-0 w-full z-50 bg-[#fafaed]/80 backdrop-blur-xl border-b border-[#e2e3d6]/20">
    <div className="flex justify-between items-center px-4 h-16 w-full max-w-md mx-auto">
      <div className="flex items-center gap-3">
        {showBack ? (
          <button onClick={onBack} className="p-2 -ml-2 text-primary">
            <ArrowLeft size={24} />
          </button>
        ) : (
          <button className="p-2 -ml-2 text-primary">
            <Menu size={24} />
          </button>
        )}
        <span className="text-xl font-black text-primary tracking-tight">{title}</span>
      </div>
      <button onClick={() => setScreen('profile')} className="w-9 h-9 rounded-full bg-[#eeefe2] overflow-hidden border border-[#c4c9b4]/30">
        <img 
          alt="Profile" 
          src={profileImage} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </button>
    </div>
  </header>
);

// --- Screen Components ---

const LoginScreen = ({ onLogin, onAdmin, onSignup }: { onLogin: () => void, onAdmin: () => void, onSignup: () => void }) => (
  <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-8 relative overflow-hidden">
    <div className="absolute top-[-10%] right-[-5%] w-72 h-72 rounded-full bg-[#add461]/10 blur-3xl" />
    <div className="absolute bottom-[-10%] left-[-5%] w-64 h-64 rounded-full bg-[#86fab0]/10 blur-3xl" />
    
      <div className="flex flex-col items-center mb-10 text-center z-10">
        <div className="w-16 h-16 mb-4 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#476500] to-[#5d7f13] shadow-lg text-white">
          <BookIcon size={32} />
        </div>
        <h1 className="text-4xl font-black text-primary mb-2">오늘도서관</h1>
        <p className="text-onSurfaceVariant font-medium">오늘의 지혜를 내일의 빛으로</p>
      </div>

    <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl shadow-primary/5 z-10 border border-[#e2e3d6]/30">
      <form onSubmit={(e) => { e.preventDefault(); onLogin(); }} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-onSurfaceVariant px-1">아이디 또는 이메일</label>
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-onSurfaceVariant" size={18} />
            <input 
              type="text" 
              placeholder="example@library.com" 
              className="w-full bg-surfaceContainerLow border-none rounded-2xl py-4 pl-12 pr-4 text-base focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-onSurfaceVariant px-1">비밀번호</label>
          <div className="relative group">
            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-onSurfaceVariant" size={18} />
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full bg-surfaceContainerLow border-none rounded-2xl py-4 pl-12 pr-4 text-base focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-lg"
        >
          로그인
        </button>
      </form>

      <div className="mt-8 flex items-center justify-center gap-4 text-[11px] text-onSurfaceVariant font-medium border-t border-surfaceContainer/50 pt-6">
        <button onClick={onSignup} className="text-primary font-bold">회원가입</button>
        <div className="w-px h-3 bg-surfaceContainer" />
        <button onClick={onAdmin} className="hover:text-primary transition-colors">관리자 모드</button>
      </div>
    </div>
    
    <p className="mt-12 text-[10px] text-onSurfaceVariant opacity-40 font-medium">© 오늘도서관. All rights reserved.</p>
  </div>
);

const SignupScreen = ({ onBack, setScreen }: { onBack: () => void, setScreen: (s: Screen) => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-8 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
      
      <header className="absolute top-0 left-0 w-full p-6 flex items-center justify-between z-20">
        <button onClick={onBack} className="p-2 bg-white rounded-xl shadow-sm text-primary">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-black text-onSurface">회원가입</h2>
        <div className="w-10" />
      </header>

      <div className="w-full max-w-sm bg-white rounded-[40px] p-8 mt-12 shadow-xl shadow-primary/5 z-10 border border-[#e2e3d6]/30">
        <div className="space-y-6">
          {!isSubmitted ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-bold text-onSurfaceVariant px-1">이름</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="이름을 입력하세요" 
                  className="w-full bg-surfaceContainerLow border-none rounded-2xl py-4 px-6 text-base focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-onSurfaceVariant px-1">아이디 또는 이메일</label>
                <input 
                  type="text" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="example@library.com" 
                  className="w-full bg-surfaceContainerLow border-none rounded-2xl py-4 px-6 text-base focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-onSurfaceVariant px-1">비밀번호</label>
                <input 
                  type="password" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="비밀번호를 입력하세요" 
                  className="w-full bg-surfaceContainerLow border-none rounded-2xl py-4 px-6 text-base focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              <button 
                onClick={() => setIsSubmitted(true)}
                className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all text-lg mt-4"
              >
                가입신청
              </button>
            </>
          ) : (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-10 text-center"
            >
              <div className="w-16 h-16 bg-[#add461]/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-lg font-black text-onSurface mb-4 leading-tight">
                입력하신 정보로 가입 신청이 되었습니다.
              </p>
              <p className="text-sm text-onSurfaceVariant font-bold opacity-60 mb-8">
                관리자의 승인을 기다려 주십시오.
              </p>
              <button 
                onClick={() => setScreen('login')}
                className="w-full bg-[#eeefe2] text-primary font-black py-4 rounded-2xl active:scale-95 transition-all"
              >
                로그인 화면으로
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

const HomeScreen = ({ loans, selectBook, onSearch, setScreen }: { loans: (Loan & { book: Book })[], selectBook: (b: Book) => void, onSearch: (query: string) => void, setScreen: (s: Screen) => void }) => {
  const [searchValue, setSearchValue] = useState('');

  const borrowingCount = loans.filter(l => !l.isOverdue).length;
  const overdueCount = loans.filter(l => l.isOverdue).length;

  return (
    <ScreenWrapper>
      <header className="mb-6 mt-2">
        <h1 className="text-3xl font-black text-onSurface mb-1">반가워요, 독서가님</h1>
        <p className="text-onSurfaceVariant font-medium">지혜의 숲에서 당신을 기다리고 있어요.</p>
      </header>

      {/* 1. 나의 대출 현황 (위로 이동) */}
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

      {/* 2. 검색 바 (아래로 이동) */}
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

      {/* 3. QR 코드로 검색 버튼 (텍스트 변경) */}
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

const SearchResultsScreen = ({ query, results, selectBook, onSearch }: { query: string, results: Book[], selectBook: (b: Book) => void, onSearch: (query: string) => void }) => {
  const [searchValue, setSearchValue] = useState(query);

  return (
    <ScreenWrapper>
      <header className="mb-8 mt-2">
        <h1 className="text-3xl font-black text-onSurface mb-1">검색 결과</h1>
        <p className="text-onSurfaceVariant font-medium">"{query}"에 대한 검색 결과입니다.</p>
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
          {results.map(book => (
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
                  <span>{book.location.shelf} {book.location.row}</span>
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
                제목이나 저자명을 다시 한번 확인하시거나,<br/>
                다른 검색어를 입력해 보세요.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </ScreenWrapper>
  );
};

const BookDetailScreen = ({ book, onBack, onLoan }: { book: Book, onBack: () => void, onLoan: (b: Book) => void }) => (
  <ScreenWrapper>
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="px-2.5 py-1 bg-primary text-white text-[10px] font-black rounded-lg uppercase tracking-wider">보관 중</span>
        <span className="px-2.5 py-1 bg-surfaceContainerHigh text-onSurfaceVariant text-xs font-bold rounded-lg uppercase tracking-widest">{book.id}</span>
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

    <div className="bg-white rounded-2xl p-4.5 relative overflow-hidden shadow-sm border border-[#e2e3d6]/30 mb-6">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#add461]" />
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-black text-onSurface">도서 위치</h3>
        <div className="p-1.5 bg-primary/5 rounded-lg text-primary">
          <MapIcon size={16} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-primary">{book.location.shelf}</span>
          <span className="text-[13px] font-bold text-onSurfaceVariant opacity-80">{book.location.row} {book.location.col}</span>
        </div>
        <p className="text-[10px] font-bold text-primaryContainer bg-primary/5 px-2 py-1 rounded-md max-w-full truncate">{book.location.room}</p>
      </div>
    </div>

    <button 
      onClick={() => onLoan(book)}
      className="w-full bg-primary text-white py-4 rounded-xl font-black text-base shadow-xl shadow-primary/20 active:scale-95 transition-all"
    >
      대출하기
    </button>
  </ScreenWrapper>
);

const MyLoansScreen = ({ loans, setLoans, selectBook }: { 
  loans: (Loan & { book: Book })[], 
  setLoans: React.Dispatch<React.SetStateAction<(Loan & { book: Book })[]>>,
  selectBook: (b: Book) => void 
}) => {
  const [activeAction, setActiveAction] = useState<{
    type: 'return' | 'extend';
    bookId: string;
    bookTitle: string;
    newDate?: string;
  } | null>(null);

  const handleReturnRequest = (loan: Loan & { book: Book }) => {
    setActiveAction({
      type: 'return',
      bookId: loan.bookId,
      bookTitle: loan.book.title
    });
  };

  const handleExtendRequest = (loan: Loan & { book: Book }) => {
    // Simple mock logic: add 7 days to return date
    // Current format is MM.DD
    const [m, d] = loan.returnDate.split('.').map(Number);
    let nm = m;
    let nd = d + 7;
    if (nd > 30) { nm += 1; nd -= 30; }
    const newDate = `${String(nm).padStart(2, '0')}.${String(nd).padStart(2, '0')}`;
    
    setActiveAction({
      type: 'extend',
      bookId: loan.bookId,
      bookTitle: loan.book.title,
      newDate
    });
  };

  const handleActionConfirm = () => {
    if (!activeAction) return;

    if (activeAction.type === 'return') {
      setLoans(prev => prev.filter(l => l.bookId !== activeAction.bookId));
    } else {
      setLoans(prev => prev.map(l => 
        l.bookId === activeAction.bookId 
          ? { ...l, returnDate: activeAction.newDate!, dDay: l.dDay - 7 } 
          : l
      ));
    }
    setActiveAction(null);
  };

  return (
    <ScreenWrapper>
      <div className="flex items-center justify-between mb-6 mt-1">
        <h1 className="text-2xl font-black text-onSurface tracking-tight">내 대출 현황</h1>
        <button className="text-primary font-bold text-xs underline underline-offset-4">전체 기록</button>
      </div>

      {/* 전체 요약 - 공간 효율적으로 재구성 */}
      <div className="bg-white rounded-2xl p-4 flex items-center justify-around shadow-sm border border-[#e2e3d6]/30 mb-6">
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-onSurfaceVariant/40 uppercase tracking-widest mb-1">대출 중</span>
          <span className="text-2xl font-black text-primary">{loans.filter(l => !l.isOverdue).length}</span>
        </div>
        <div className="w-px h-8 bg-[#e2e3d6]/50" />
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-onSurfaceVariant/40 uppercase tracking-widest mb-1">연체</span>
          <span className="text-2xl font-black text-error">{loans.filter(l => l.isOverdue).length}</span>
        </div>
        <div className="w-px h-8 bg-[#e2e3d6]/50" />
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-onSurfaceVariant/40 uppercase tracking-widest mb-1">다음에 읽을 책</span>
          <span className="text-2xl font-black text-onSurfaceVariant/20">0</span>
        </div>
      </div>

      {/* 결과/확인 섹션 (요약 밑에 표시) */}
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
                      <span className="font-black">'{activeAction.bookTitle}'</span>을 반납하려고 합니다.<br/>
                      책의 위치를 확인하고 꽂아 두셨을까요?
                    </p>
                  ) : (
                    <p className="text-sm font-bold text-onSurface leading-relaxed">
                      <span className="font-black">'{activeAction.bookTitle}'</span>의 대출기간이<br/>
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

      {/* 대출 리스트 - 더 컴팩트하게 */}
      <div className="space-y-3">
        {loans.length > 0 ? (
          loans.map((loan, idx) => (
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

const ProfileScreen = ({ onLogout, onAdmin, profileImage, setProfileImage }: { onLogout: () => void, onAdmin: () => void, profileImage: string, setProfileImage: (img: string) => void }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [formData, setFormData] = useState({
    name: '김독서',
    email: 'reader@library.com',
    password: ''
  });
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setProfileImage(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
      setShowOptions(false);
    }
  };

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  const handleUpdate = () => {
    setIsUpdating(true);
    // Simulate API call
    setTimeout(() => {
      setIsUpdating(false);
      setUpdateMessage('회원 정보가 성공적으로 수정되었습니다.');
      // Clear message after 3 seconds
      setTimeout(() => setUpdateMessage(''), 3000);
    }, 800);
  };

  return (
    <ScreenWrapper>
      <div className="flex flex-col items-center mt-2 mb-4">
        <button 
          onClick={() => setShowOptions(true)}
          className="relative group active:scale-95 transition-all"
        >
          <div className="w-20 h-20 rounded-[28px] bg-[#eeefe2] overflow-hidden border-[3px] border-white shadow-lg p-1">
            <img 
              src={profileImage} 
              className="w-full h-full object-cover rounded-[20px]" 
              referrerPolicy="no-referrer" 
            />
          </div>
          <div className="absolute bottom-0 right-0 w-7 h-7 bg-primary text-white rounded-lg border-2 border-white flex items-center justify-center shadow-md">
            <Camera size={12} />
          </div>
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#e2e3d6]/30 space-y-4 relative overflow-hidden">
        <AnimatePresence>
          {updateMessage && (
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="absolute top-2 left-6 right-6 bg-[#add461]/20 text-primary py-2 rounded-xl text-center text-[10px] font-black z-10 flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={12} />
              {updateMessage}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-1.5 pt-1">
          <label className="text-[10px] font-bold text-onSurfaceVariant px-1 uppercase tracking-wider opacity-60">이름</label>
          <input 
            type="text" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full bg-surfaceContainerLow border-none rounded-xl py-3 px-5 text-base focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-onSurfaceVariant px-1 uppercase tracking-wider opacity-60">아이디 또는 이메일</label>
          <input 
            type="text" 
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full bg-surfaceContainerLow border-none rounded-xl py-3 px-5 text-base focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-onSurfaceVariant px-1 uppercase tracking-wider opacity-60">비밀번호</label>
          <input 
            type="password" 
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            placeholder="변경할 비밀번호 입력"
            className="w-full bg-surfaceContainerLow border-none rounded-xl py-3 px-5 text-base focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>

        <div className="flex justify-end pt-1">
          <button 
            onClick={handleUpdate}
            disabled={isUpdating}
            className="bg-primary text-white font-black py-3 px-8 rounded-xl shadow-md shadow-primary/20 active:scale-95 transition-all text-sm disabled:opacity-50"
          >
            {isUpdating ? '처리 중...' : '수정'}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <button 
          onClick={onAdmin}
          className="w-full py-2 px-6 flex items-center justify-center gap-2 text-onSurfaceVariant/40 hover:text-primary transition-colors text-[10px] font-bold"
        >
          <AlertCircle size={12} />
          <span>도서관 운영 관리 (관리자 전용)</span>
        </button>

        <button 
          onClick={onLogout}
          className="w-full bg-error/5 py-3 rounded-xl flex items-center justify-center text-error font-black text-sm active:scale-[0.98] transition-transform"
        >
          로그아웃
        </button>
      </div>

      {/* Photo Options Modal */}
      <AnimatePresence>
        {showOptions && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOptions(false)}
              className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[40px] z-[101] p-8 pb-12 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-onSurface">프로필 사진 변경</h3>
                <button 
                  onClick={() => setShowOptions(false)}
                  className="p-2 bg-surfaceContainerLow rounded-full text-onSurfaceVariant"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-6 bg-surfaceContainerLow rounded-3xl active:scale-95 transition-all text-[#476500]"
                >
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <Camera size={28} />
                  </div>
                  <span className="text-sm font-black">사진 찍기</span>
                </button>

                <button 
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-6 bg-surfaceContainerLow rounded-3xl active:scale-95 transition-all text-primary"
                >
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <ImageIcon size={28} />
                  </div>
                  <span className="text-sm font-black">사진 보관함</span>
                </button>
              </div>

              {/* Hidden Inputs */}
              <input 
                type="file" 
                ref={galleryInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange}
              />
              <input 
                type="file" 
                ref={cameraInputRef} 
                accept="image/*" 
                capture="user" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ScreenWrapper>
  );
};

const AdminDashboard = ({ setScreen }: { setScreen: (s: Screen) => void }) => {
  const [subView, setSubView] = useState<'main' | 'members' | 'all-members' | 'overdue-members' | 'upload-status' | 'activities'>('main');
  const [applicants, setApplicants] = useState([
    { id: 1, name: "정은우", email: "eunwoo@gmail.com", date: "2024.04.18", status: "pending", role: "" },
    { id: 2, name: "강하다", email: "hada@naver.com", date: "2024.04.17", status: "pending", role: "" },
    { id: 3, name: "유재학", email: "hak@daum.net", date: "2024.04.17", status: "pending", role: "" }
  ]);
  const [allMembers] = useState([
    { id: 'M-101', name: "김독서", level: "관리자", joined: "2023.11.12", loans: 3 },
    { id: 'M-102', name: "이책만", level: "일반", joined: "2024.01.05", loans: 1 },
    { id: 'M-103', name: "박독서", level: "일반", joined: "2023.12.20", loans: 0 },
    { id: 'M-104', name: "최지혜", level: "관리자", joined: "2023.08.15", loans: 5 },
    { id: 'M-105', name: "정성실", level: "일반", joined: "2024.03.02", loans: 2 },
    { id: 'M-106', name: "한가람", level: "일반", joined: "2024.04.10", loans: 4 },
    { id: 'M-107', name: "서지민", level: "일반", joined: "2024.04.11", loans: 0 },
    { id: 'M-108', name: "윤하늘", level: "관리자", joined: "2024.04.12", loans: 1 },
    { id: 'M-109', name: "강바다", level: "일반", joined: "2024.04.13", loans: 2 },
    { id: 'M-110', name: "조서연", level: "일반", joined: "2024.04.14", loans: 0 }
  ]);
  const [memberSearch, setMemberSearch] = useState('');
  const [overdueMembers] = useState([
    { name: "최수민", bookTitle: "디자인의 역사", loanDate: "2024.03.01", overdueDays: 26 },
    { name: "지은이", bookTitle: "숲의 기억", loanDate: "2024.03.10", overdueDays: 17 },
    { name: "박준호", bookTitle: "식물학 개론", loanDate: "2024.03.15", overdueDays: 12 },
    { name: "성현우", bookTitle: "파이썬 마스터", loanDate: "2024.04.01", overdueDays: 5 }
  ]);
  const [recentActivities] = useState([
    { user: "김민수", action: "반납", book: "비거니즘", time: "방금 전", type: "return" },
    { user: "이지은", action: "대출", book: "오래된 정원", time: "15분 전", type: "borrow" },
    { user: "박준호", action: "연체", book: "식물학 개론", time: "2시간 전", type: "overdue" },
    { user: "한가람", action: "대출", book: "데미안", time: "3시간 전", type: "borrow" },
    { user: "서지민", action: "반납", book: "연금술사", time: "4시간 전", type: "return" },
    { user: "윤독서", action: "대출", book: "총 균 쇠", time: "5시간 전", type: "borrow" },
    { user: "정지수", action: "반납", book: "코스모스", time: "어제", type: "return" },
    { user: "최하늘", action: "대출", book: "개미", time: "어제", type: "borrow" }
  ]);
  const [lastUploaded, setLastUploaded] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<'all' | 'borrow' | 'return' | 'overdue'>('all');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(extension || '')) {
        setUploadError("File types are not supported. .xlsx, .xls, .csv 파일만 업로드 가능합니다.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          const wb = XLSX.read(data, { type: 'array' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const jsonData = XLSX.utils.sheet_to_json(ws);
          
          if (jsonData.length === 0) {
            setUploadError("파일에 데이터가 없습니다.");
            return;
          }

          console.log("Uploaded Data:", jsonData);
          setLastUploaded(file.name);
          setSubView('upload-status');
        } catch (err) {
          console.error("Excel Read Error:", err);
          setUploadError("파일을 읽는 중 오류가 발생했습니다.");
        }
      };
      reader.onerror = () => {
        setUploadError("파일을 읽지 못했습니다.");
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const approveMember = (id: number, role: '일반' | '관리자') => {
    setApplicants(prev => prev.map(a => a.id === id ? { ...a, status: 'approved', role } : a));
  };

  const downloadSampleExcel = () => {
    const sampleData = [
      {
        "도서코드": "BD-0001",
        "제목": "숲의 목소리: 식물의 언어를 듣다",
        "저자": "한지수",
        "출판사": "오늘출판사",
        "장르": "자연과학 / 에세이",
        "서가": "A책장",
        "행": "2행",
        "열": "3열",
        "위치(열람실)": "제1열람실"
      },
      {
        "도서코드": "BD-0002",
        "제목": "식물학자의 일기",
        "저자": "김오늘",
        "출판사": "그린북스",
        "장르": "자연과학",
        "서가": "B책장",
        "행": "1행",
        "열": "5열",
        "위치(열람실)": "제1열람실"
      }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "도서목록");
    XLSX.writeFile(wb, "today_library_sample.xlsx");
  };

  if (subView === 'members') {
    return (
      <ScreenWrapper>
        <div className="flex items-center gap-3 mb-6 mt-2">
          <button onClick={() => setSubView('main')} className="text-primary"><ArrowLeft size={20}/></button>
          <h2 className="text-2xl font-black text-onSurface tracking-tight">승인 대기 멤버</h2>
        </div>
        
        <div className="bg-[#eeefe2] p-4 rounded-3xl mb-6">
          <p className="text-xs font-bold text-onSurfaceVariant opacity-70">승인 대기 중인 신청자 <span className="text-primary">{applicants.filter(a => a.status === 'pending').length}</span>명</p>
        </div>

        <div className="space-y-3">
          {applicants.map(app => (
            <div key={app.id} className="bg-white p-5 rounded-3xl shadow-sm border border-[#e2e3d6]/30 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-onSurface">{app.name}</h3>
                  <p className="text-xs text-onSurfaceVariant font-medium">{app.email}</p>
                  <p className="text-[10px] text-onSurfaceVariant opacity-50 font-bold mt-1">신청일: {app.date}</p>
                </div>
                {app.status === 'approved' ? (
                  <div className="flex flex-col items-end gap-1">
                    <span className="flex items-center gap-1 text-[#5d7f13] text-[10px] font-black bg-[#add461]/20 px-3 py-1 rounded-full">
                      <CheckCircle2 size={12}/> 승인됨
                    </span>
                    <span className="text-[10px] font-bold text-onSurfaceVariant bg-surfaceContainerLow px-2 py-0.5 rounded uppercase">{app.role}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 items-center">
                    <span className="text-[10px] font-bold text-onSurfaceVariant opacity-50 uppercase tracking-tighter">승인하기</span>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => approveMember(app.id, '일반')}
                        className="bg-surfaceContainerHigh text-onSurface text-[11px] font-black px-3 py-2 rounded-xl border border-[#e2e3d6]/50 active:scale-95 transition-all"
                      >
                        일반
                      </button>
                      <button 
                        onClick={() => approveMember(app.id, '관리자')}
                        className="bg-primary text-white text-[11px] font-black px-3 py-2 rounded-xl shadow-lg shadow-primary/10 active:scale-95 transition-all"
                      >
                        관리자
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScreenWrapper>
    );
  }

  if (subView === 'all-members') {
    const filteredMembers = allMembers.filter(m => 
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
      m.id.toLowerCase().includes(memberSearch.toLowerCase())
    );

    return (
      <ScreenWrapper>
        <div className="flex items-center gap-3 mb-6 mt-2">
          <button onClick={() => setSubView('main')} className="text-primary"><ArrowLeft size={20}/></button>
          <h2 className="text-2xl font-black text-onSurface tracking-tight">전체 회원 <span className="text-sm text-onSurfaceVariant/40 font-bold ml-1">{allMembers.length}명</span></h2>
        </div>

        {/* 검색창 */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-onSurfaceVariant/40" size={18} />
          <input 
            type="text"
            placeholder="이름 또는 회원번호 검색"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            className="w-full bg-white border border-[#e2e3d6]/60 rounded-2xl py-4 pl-12 pr-4 text-base focus:ring-2 focus:ring-primary/10 transition-all font-medium"
          />
        </div>

        <div className="space-y-2 pb-8">
          {filteredMembers.length > 0 ? (
            filteredMembers.map(member => (
              <div key={member.id} className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-[#e2e3d6]/30 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#eeefe2] overflow-hidden border border-[#c4c9b4]/20 flex-shrink-0">
                    <img 
                      src={`https://picsum.photos/seed/${member.id}/100/100`} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-onSurface text-sm truncate">
                      {member.name}
                      <span className="text-[10px] text-onSurfaceVariant/40 font-bold ml-1.5">{member.id}</span>
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-onSurfaceVariant font-bold opacity-40 uppercase tracking-widest">{member.joined} 가입</span>
                      <div className="w-0.5 h-0.5 bg-onSurfaceVariant/20 rounded-full" />
                      <span className="text-[10px] text-primary font-black">대출 {member.loans}권</span>
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black flex-shrink-0 ${
                  member.level === '관리자' 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-surfaceContainerLow text-onSurfaceVariant opacity-60'
                }`}>
                  {member.level}
                </span>
              </div>
            ))
          ) : (
            <div className="py-20 text-center opacity-30 flex flex-col items-center">
              <Users size={40} className="mb-4" />
              <p className="font-black text-sm">해당 회원을 찾을 수 없습니다.</p>
            </div>
          )}
        </div>
      </ScreenWrapper>
    );
  }

  if (subView === 'overdue-members') {
    return (
      <ScreenWrapper>
        <div className="flex items-center gap-3 mb-6 mt-2">
          <button onClick={() => setSubView('main')} className="text-primary"><ArrowLeft size={20}/></button>
          <h2 className="text-2xl font-black text-onSurface tracking-tight">
            연체자 리스트 <span className="text-lg text-error font-bold ml-1">(총 {overdueMembers.length}명)</span>
          </h2>
        </div>

        <div className="space-y-2 pb-8">
          {overdueMembers.map((item, idx) => (
            <div key={idx} className="bg-white px-4 py-3.5 rounded-2xl shadow-sm border border-error/5 flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-black text-onSurface text-sm inline-block">{item.name}</h3>
                  <span className="text-[10px] text-error font-black ml-2 bg-error/10 px-1.5 py-0.5 rounded">+{item.overdueDays}일</span>
                </div>
                <span className="text-[10px] text-onSurfaceVariant font-bold opacity-40 uppercase tracking-widest">OVERDUE</span>
              </div>

              <div className="flex items-center justify-between border-t border-[#e2e3d6]/20 pt-2 px-0.5">
                <span className="font-black text-onSurfaceVariant text-[13px] truncate max-w-[200px]">{item.bookTitle}</span>
                <span className="font-black text-onSurface/50 text-xs">{item.loanDate}</span>
              </div>
            </div>
          ))}
        </div>
      </ScreenWrapper>
    );
  }

  if (subView === 'upload-status') {
    return (
      <ScreenWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 bg-[#add461]/20 rounded-full flex items-center justify-center text-primary mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-onSurface mb-2">업로드 완료!</h2>
          <p className="text-onSurfaceVariant font-medium mb-8">"{lastUploaded}" 파일의 데이터가<br/>성공적으로 시스템에 반영되었습니다.</p>
          <button 
            onClick={() => setSubView('main')}
            className="bg-primary text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-primary/10 active:scale-95 transition-all"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </ScreenWrapper>
    );
  }

  if (subView === 'activities') {
    const filteredActivities = activityFilter === 'all' 
      ? recentActivities 
      : recentActivities.filter(a => a.type === activityFilter);

    return (
      <ScreenWrapper>
        <div className="flex items-center gap-3 mb-6 mt-2">
          <button onClick={() => setSubView('main')} className="text-primary"><ArrowLeft size={20}/></button>
          <h2 className="text-2xl font-black text-onSurface tracking-tight">전체 활동 기록</h2>
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { id: 'all', label: '전체' },
            { id: 'borrow', label: '대출' },
            { id: 'return', label: '반납' },
            { id: 'overdue', label: '연체' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivityFilter(tab.id as any)}
              className={`px-5 py-2 rounded-full text-xs font-black transition-all whitespace-nowrap ${
                activityFilter === tab.id 
                  ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105' 
                  : 'bg-white text-onSurfaceVariant border border-[#e2e3d6]/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-3 pb-8">
          {filteredActivities.length > 0 ? (
            filteredActivities.map((item, i) => (
              <div key={i} className="bg-white p-5 rounded-3xl border border-[#e2e3d6]/30 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      item.type === 'return' ? 'bg-[#add461]' : 
                      item.type === 'borrow' ? 'bg-primary' : 
                      'bg-error'
                    }`} />
                    <span className="text-[10px] font-black text-onSurfaceVariant uppercase tracking-widest">{item.type}</span>
                  </div>
                  <span className="text-[10px] text-onSurfaceVariant font-bold opacity-40">{item.time}</span>
                </div>
                <p className="text-sm font-medium text-onSurface leading-relaxed">
                  <span className="font-black text-lg">{item.user}</span> 님이 
                  <span className="text-primary font-black mx-1">"{item.book}"</span> 도서를 
                  <span className={`font-black ml-1 ${
                    item.type === 'return' ? 'text-primary' : 
                    item.type === 'borrow' ? 'text-onSurface' : 
                    'text-error'
                  }`}>{item.action}</span>하였습니다.
                </p>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
              <Clock size={40} className="mb-4" />
              <p className="font-bold">해당 활동 내역이 없습니다.</p>
            </div>
          )}
        </div>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <div className="mb-6 mt-1">
        <h2 className="text-2xl font-black text-onSurface tracking-tight">운영 현황 요약</h2>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-8">
        <div className="bg-white p-3.5 rounded-2xl border-l-4 border-[#add461] shadow-sm">
          <span className="text-[11px] font-bold text-onSurfaceVariant uppercase tracking-widest block mb-1.5 opacity-50">총계</span>
          <div className="flex flex-col">
            <h3 className="text-xl font-black text-primary tracking-tight">12,482</h3>
            <div className="flex items-center gap-1 text-[#5d7f13] text-[10px] font-bold mt-0.5">
              <span>↑ +12%</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border-l-4 border-primary/20 shadow-sm">
          <span className="text-[11px] font-bold text-onSurfaceVariant uppercase tracking-widest block mb-1.5 opacity-50">대출 중</span>
          <h3 className="text-xl font-black text-onSurface tracking-tight">342</h3>
        </div>
        <button 
          onClick={() => setSubView('overdue-members')}
          className="bg-[#fcf8f7] p-3.5 rounded-2xl border-l-4 border-[#e2c1bb] shadow-sm text-left active:scale-95 transition-all"
        >
          <span className="text-[11px] font-bold text-onSurfaceVariant uppercase tracking-widest block mb-1.5 opacity-50">연체</span>
          <div className="flex items-end justify-between">
            <h3 className="text-xl font-black text-[#af7c73] tracking-tight">18</h3>
            <ChevronRight size={16} className="text-[#af7c73] opacity-40 mb-0.5" />
          </div>
        </button>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-onSurface">최근 활동</h3>
          <button 
            onClick={() => setSubView('activities')}
            className="text-primary font-bold text-xs underline underline-offset-4"
          >
            전체보기
          </button>
        </div>
        <div className="space-y-2.5">
          {recentActivities.slice(0, 3).map((item, i) => (
            <div key={i} className="bg-white p-4 rounded-xl flex items-center gap-3 border border-[#e2e3d6]/30">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-onSurface truncate">
                  <span className="font-black">{item.user}</span> 님이 <span className="text-primary font-bold">"{item.book}"</span> {item.action}
                </p>
                <span className="text-[10px] text-onSurfaceVariant font-bold opacity-50">{item.time}</span>
              </div>
              <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                item.type === 'return' ? 'bg-[#add461]/20 text-primary' : 
                item.type === 'borrow' ? 'bg-[#eeefe2] text-[#444939]' : 
                'bg-error/10 text-error'
              }`}>{item.action}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-[10px] font-black text-onSurfaceVariant uppercase tracking-widest opacity-50">빠른 실행</h3>
          <button 
            onClick={downloadSampleExcel}
            className="text-primary font-bold text-[10px] flex items-center gap-1.5 bg-primary/5 px-2.5 py-1.5 rounded-lg active:scale-95 transition-all"
          >
            <FileSpreadsheet size={12} />
            샘플 양식 다운로드
          </button>
        </div>

        {uploadError && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-error/10 border border-error/20 rounded-xl flex items-start gap-2 text-error text-[11px] font-bold"
          >
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <p>{uploadError}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-4 gap-2 text-center">
          <label className="cursor-pointer flex flex-col items-center justify-center gap-2 bg-primary text-white py-3 px-1 rounded-xl transition-all active:scale-95 shadow-lg shadow-primary/10">
            <input type="file" accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv" className="hidden" onChange={handleExcelUpload} />
            <div className="p-2 bg-white/20 rounded-lg"><FileSpreadsheet size={18} /></div>
            <span className="text-[10px] font-black leading-tight">도서 <br/> 업로드</span>
          </label>
          <button 
            onClick={() => setSubView('members')}
            className="flex flex-col items-center justify-center gap-2 bg-[#eeefe2] text-primary py-3 px-1 rounded-xl transition-all active:scale-95"
          >
            <div className="p-2 bg-primary/10 rounded-lg"><FileSpreadsheet size={18} /></div>
            <span className="text-[10px] font-black leading-tight">승인 <br/> 대기</span>
          </button>
          <button 
            onClick={() => setSubView('all-members')}
            className="flex flex-col items-center justify-center gap-2 bg-[#eeefe2] text-primary py-3 px-1 rounded-xl transition-all active:scale-95"
          >
            <div className="p-2 bg-primary/10 rounded-lg"><Users size={18} /></div>
            <span className="text-[10px] font-black leading-tight">전체 <br/> 회원</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-2 bg-[#eeefe2] text-primary py-3 px-1 rounded-xl transition-all active:scale-95">
            <div className="p-2 bg-primary/10 rounded-lg"><Clock size={18} /></div>
            <span className="text-[10px] font-black leading-tight">기록 <br/> 확인</span>
          </button>
        </div>
      </div>
    </ScreenWrapper>
  );
};


// --- Main App Component ---

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [loans, setLoans] = useState<(Loan & { book: Book })[]>(MOCK_LOANS);
  const [profileImage, setProfileImage] = useState("https://picsum.photos/seed/reader/200/200");

  const handleSearch = (query: string) => {
    const term = query.toLowerCase();
    const filtered = MOCK_BOOKS.filter(book => 
      book.title.toLowerCase().includes(term) || 
      book.author.toLowerCase().includes(term) ||
      book.publisher.toLowerCase().includes(term)
    );
    setSearchQuery(query);
    setSearchResults(filtered);
    setScreen('search-results');
  };

  const handleLoan = (book: Book) => {
    const newLoan: (Loan & { book: Book }) = {
      bookId: book.id,
      book: book,
      borrowDate: new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace('.', '').replace(' ', '.'),
      returnDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace('.', '').replace(' ', '.'),
      isOverdue: false,
      dDay: -14,
      progress: 0
    };
    setLoans(prev => [newLoan, ...prev]);
    setScreen('my-loans');
  };

  const navigateToBook = (book: Book) => {
    setSelectedBook(book);
    setScreen('book-detail');
  };

  const handleBack = () => {
    if (screen === 'book-detail') {
      if (searchQuery) {
        setScreen('search-results');
      } else {
        setScreen('home');
      }
      setSelectedBook(null);
    } else if (screen === 'search-results') {
      setScreen('home');
      setSearchQuery('');
    } else if (screen === 'admin') {
      setScreen('profile');
    }
  };

  const getHeaderTitle = () => {
    switch (screen) {
      case 'home': return '오늘도서관';
      case 'book-detail': return '오늘도서관';
      case 'my-loans': return '오늘도서관';
      case 'profile': return '내 정보';
      case 'admin': return '운영 관리';
      case 'search-results': return '검색 결과';
      default: return '오늘도서관';
    }
  };

  if (screen === 'login') {
    return (
      <LoginScreen 
        onLogin={() => setScreen('home')} 
        onAdmin={() => setScreen('admin')} 
        onSignup={() => setScreen('signup')}
      />
    );
  }

  if (screen === 'signup') {
    return (
      <SignupScreen 
        onBack={() => setScreen('login')}
        setScreen={setScreen}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface font-sans text-onSurface w-full max-w-md mx-auto relative shadow-2xl shadow-primary/10 overflow-x-hidden">
      <Header 
        title={getHeaderTitle()} 
        showBack={screen === 'book-detail' || screen === 'admin' || screen === 'search-results'} 
        onBack={handleBack}
        setScreen={setScreen}
        profileImage={profileImage}
      />
      
      <main className="flex flex-col min-h-screen">
        <AnimatePresence mode="wait">
          {screen === 'home' && (
            <motion.div key="home" className="contents">
              <HomeScreen loans={loans} selectBook={navigateToBook} onSearch={handleSearch} setScreen={setScreen} />
            </motion.div>
          )}
          {screen === 'search-results' && (
            <motion.div key="results" className="contents">
              <SearchResultsScreen 
                query={searchQuery} 
                results={searchResults} 
                selectBook={navigateToBook} 
                onSearch={handleSearch}
              />
            </motion.div>
          )}
          {screen === 'book-detail' && selectedBook && (
            <motion.div key="detail" className="contents">
              <BookDetailScreen book={selectedBook} onBack={handleBack} onLoan={handleLoan} />
            </motion.div>
          )}
          {screen === 'my-loans' && (
            <motion.div key="loans" className="contents">
              <MyLoansScreen loans={loans} setLoans={setLoans} selectBook={navigateToBook} />
            </motion.div>
          )}
          {screen === 'profile' && (
            <motion.div key="profile" className="contents">
              <ProfileScreen 
                onLogout={() => setScreen('login')} 
                onAdmin={() => setScreen('admin')} 
                profileImage={profileImage}
                setProfileImage={setProfileImage}
              />
            </motion.div>
          )}
          {screen === 'admin' && (
            <motion.div key="admin" className="contents">
              <AdminDashboard setScreen={setScreen} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav active={screen === 'book-detail' || screen === 'admin' || screen === 'search-results' ? 'home' : screen} setScreen={setScreen} />
    </div>
  );
}
