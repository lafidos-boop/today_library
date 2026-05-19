/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Sprout } from 'lucide-react';
import { toastApi } from './toast';
import { motion, AnimatePresence } from 'motion/react';
import type { Screen, Book, Loan } from './types';
import { BottomNav, Header } from './components/Layout';
import { LoginScreen } from './screens/LoginScreen';
import { SignupScreen } from './screens/SignupScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SearchResultsScreen } from './screens/SearchResultsScreen';
import { BookDetailScreen } from './screens/BookDetailScreen';
import { MyLoansScreen } from './screens/MyLoansScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AdminDashboard } from './screens/admin/AdminDashboard';

// --- Main App Component ---

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAutoLogging, setIsAutoLogging] = useState(true);

  // 앱 시작 시 저장된 인증 정보로 자동 로그인 시도
  useEffect(() => {
    const tryAutoLogin = async () => {
      // 이전 방식으로 저장된 캐시 정리
      localStorage.removeItem('currentUser');

      const stored = localStorage.getItem('autologin_creds');
      if (!stored) { setIsAutoLogging(false); return; }

      try {
        const { name, password } = JSON.parse(stored);
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, password }),
        });
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
          setScreen('home');
        } else {
          // 인증 실패 시 저장된 정보 삭제
          localStorage.removeItem('autologin_creds');
        }
      } catch {
        // 네트워크 오류 시 로그인 화면으로
      } finally {
        setIsAutoLogging(false);
      }
    };
    tryAutoLogin();
  }, []);

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<(Loan & { book: Book })[]>([]);
  const [profileImage, setProfileImage] = useState("https://picsum.photos/seed/reader/200/200");

  React.useEffect(() => {
    if (currentUser?.profileImage) {
      setProfileImage(currentUser.profileImage);
    }
  }, [currentUser]);

  const fetchLoans = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/loans/${currentUser.id}`);
      const data = await res.json();
      // Join with book data (assuming books are already loaded)
      const joinedLoans = data.map((l: any) => {
        const foundBook = books.find((b: Book) => b.id === l.bookId);
        return {
          ...l,
          book: foundBook || {
            id: l.bookId,
            title: l.bookTitle || '정보 없음',
            author: '알 수 없음',
            cover: 'https://picsum.photos/seed/unknown/400/600',
            publisher: '-',
            genre: '-',
            status: 'borrowed',
            location: { room: '대출 중', shelf: '-', row: '-', col: '-' }
          }
        };
      });
      setLoans(joinedLoans);
    } catch (err) {
      console.error('Failed to fetch loans:', err);
    }
  };

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/books');
      const data = await res.json();
      if (data && data.length > 0) {
        setBooks(data);
      }
    } catch (err) {
      console.error('Failed to load books:', err);
    }
  };

  // 데이터 불러오기
  React.useEffect(() => {
    fetchBooks();
  }, []);

  // 인증 가드 - currentUser 변경 시에만 실행
  React.useEffect(() => {
    if (currentUser && (screen === 'login' || screen === 'signup')) {
      setScreen('home');
    }
    if (!currentUser && screen !== 'login' && screen !== 'signup') {
      setScreen('login');
    }
  }, [currentUser]);

  // 초기 데이터 로드 (사용자 변경 시에만)
  React.useEffect(() => {
    if (currentUser) {
      fetchLoans();
    }
  }, [currentUser]);

  // 데이터 저장 함수
  const saveBooksToServer = async (newBooks: Book[]) => {
    try {
      await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooks)
      });
    } catch (err) {
      console.error('Failed to save books:', err);
    }
  };

  // === 위치(서가/행/열) 쿼리 파서 ===
  const parseLocationQuery = (raw: string): { shelf: string; row: string | null; col: string | null } | null => {
    const t = raw.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!t) return null;
    let m;
    m = t.match(/^(?:서가\s*)?([a-g])(?:\s*서가)?$/);
    if (m) return { shelf: m[1].toUpperCase(), row: null, col: null };
    m = t.match(/^(?:서가\s*)?([a-g])\s*(\d+)\s*행(?:\s*(\d+)\s*열)?$/);
    if (m) return { shelf: m[1].toUpperCase(), row: m[2], col: m[3] || null };
    m = t.match(/^(?:서가\s*)?([a-g])\s*[-_\s]\s*(\d+)(?:\s*[-_\s]\s*(\d+))?$/);
    if (m) return { shelf: m[1].toUpperCase(), row: m[2], col: m[3] || null };
    m = t.match(/^([a-g])(\d)$/);
    if (m) return { shelf: m[1].toUpperCase(), row: m[2], col: null };
    return null;
  };

  // === 장르 쿼리 파서 ===
  const parseGenreQuery = (raw: string): string | null => {
    const m = raw.trim().match(/^(?:장르|genre)\s*[,:]?\s*(.+)$/i);
    if (!m) return null;
    const g = m[1].trim();
    return g.length > 0 ? g.toLowerCase() : null;
  };

  const handleNewBooks = () => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const parseDate = (s: string): Date | null => {
      if (!s) return null;
      const d = new Date(s.replace(/\./g, '-'));
      return isNaN(d.getTime()) ? null : d;
    };

    const newBooks = books.filter(b => {
      const d = parseDate(b.addedAt || '');
      return d !== null && d >= oneMonthAgo;
    });
    setSearchQuery('__NEW_BOOKS__');
    setSearchResults(newBooks);
    setScreen('search-results');
  };

  const handleSearch = (query: string) => {
    const term = query.toLowerCase().trim();
    const loc = parseLocationQuery(query);
    const genreQuery = parseGenreQuery(query);

    const filtered = books.filter(book => {
      const shelf = book.location.shelf.toLowerCase();
      const row = String(book.location.row).trim();
      const col = String(book.location.col).trim();

      if (loc) {
        if (shelf !== loc.shelf.toLowerCase()) return false;
        if (loc.row !== null && row !== loc.row) return false;
        if (loc.col !== null && col !== loc.col) return false;
        return true;
      }

      if (genreQuery) {
        return book.genre.toLowerCase().includes(genreQuery);
      }

      const title = book.title.toLowerCase();
      const author = book.author.toLowerCase();
      const publisher = book.publisher.toLowerCase();
      const room = book.location.room.toLowerCase();
      const genre = book.genre.toLowerCase();

      return title.includes(term) ||
             author.includes(term) ||
             publisher.includes(term) ||
             room.includes(term) ||
             genre.includes(term);
    });
    setSearchQuery(query);
    setSearchResults(filtered);
    setScreen('search-results');
  };

  const handleLoan = async (book: Book) => {
    if (!currentUser) return;

    if (book.status === 'borrowed') {
      toastApi.error('이미 다른 회원이 대출 중인 도서입니다.');
      return;
    }

    const newLoan = {
      userId: currentUser.id,
      userName: currentUser.name,
      bookId: book.id,
      bookTitle: book.title,
      borrowDate: new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace('.', '').replace(' ', '.'),
      returnDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace('.', '').replace(' ', '.'),
      dDay: -14,
      progress: 0
    };

    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLoan)
      });

      if (res.ok) {
        await fetchBooks();
        await fetchLoans();
        setScreen('my-loans');
      } else if (res.status === 400) {
        toastApi.info('이미 대출 중인 도서입니다. 최신 상태를 확인해 주세요.');
        fetchBooks();
      } else {
        toastApi.error('대출 처리 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Loan failed:', err);
      toastApi.error('서버와의 통신에 실패했습니다.');
    }
  };

  // book-detail 진입 시 어느 화면에서 왔는지 추적 → handleBack 정확히 복귀
  const [bookDetailSource, setBookDetailSource] = useState<'home' | 'search-results' | 'my-loans'>('home');

  const navigateToBook = (book: Book, source: 'home' | 'search-results' | 'my-loans' = 'home') => {
    setSelectedBook(book);
    setBookDetailSource(source);
    setScreen('book-detail');
  };

  const handleBack = () => {
    if (screen === 'book-detail') {
      if (bookDetailSource === 'my-loans') {
        setScreen('my-loans');
      } else if (bookDetailSource === 'search-results' && searchQuery) {
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

  const handleReturnFromDetail = async (loanId: number, bookTitle: string) => {
    if (!window.confirm(`'${bookTitle}'을(를) 반납하시겠어요?`)) return;
    try {
      const res = await fetch(`/api/loans/${loanId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchBooks();
        await fetchLoans();
        setScreen('my-loans');
        setSelectedBook(null);
      } else {
        toastApi.error('반납 처리 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Return failed:', err);
      toastApi.error('서버와의 통신에 실패했습니다.');
    }
  };

  const handleExtendFromDetail = async (loan: any) => {
    const [m, d] = loan.returnDate.split('.').map(Number);
    let nm = m;
    let nd = d + 14;
    if (nd > 30) { nm += 1; nd -= 30; }
    const newDate = `${String(nm).padStart(2, '0')}.${String(nd).padStart(2, '0')}`;
    const newDDay = (loan.dDay || 0) - 14;

    if (!window.confirm(`'${loan.book.title}'의 대출 기간을 ${newDate}까지 연장할까요?`)) return;
    try {
      const res = await fetch(`/api/loans/${loan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnDate: newDate, dDay: newDDay }),
      });
      if (res.ok) {
        await fetchLoans();
        toastApi.success(`대출 기간이 ${newDate}까지 연장되었습니다.`);
      } else {
        toastApi.error('연장 처리 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Extend failed:', err);
      toastApi.error('서버와의 통신에 실패했습니다.');
    }
  };

  const getHeaderTitle = () => {
    switch (screen) {
      case 'home': return '오늘책방';
      case 'book-detail': return '오늘책방';
      case 'my-loans': return '오늘책방';
      case 'profile': return '내 정보';
      case 'admin': return '운영 관리';
      case 'search-results': return '검색 결과';
      default: return '오늘책방';
    }
  };

  // 자동 로그인 확인 중 스플래시 화면
  if (isAutoLogging) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-5">
        <div className="w-[72px] h-[72px] rounded-[20px] bg-[#eef2e0] flex items-center justify-center shadow-md">
          <Sprout size={32} className="text-primary" strokeWidth={1.8} />
        </div>
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (screen === 'login') {
    return (
      <LoginScreen
        onLogin={(user) => {
          setCurrentUser(user);
          setScreen('home');
        }}
        onAdmin={(user) => {
          setCurrentUser(user);
          setScreen('admin');
        }}
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
        showBack={false}
        exitLabel={screen === 'admin' ? '밖으로' : (screen === 'book-detail' || screen === 'search-results') ? '뒤로' : undefined}
        onBack={handleBack}
      />

      <main className="flex flex-col min-h-screen">
        <AnimatePresence mode="wait">
          {screen === 'home' && (
            <motion.div key="home" className="contents">
              <HomeScreen userName={currentUser?.name || '독서가'} loans={loans} selectBook={(b) => navigateToBook(b, 'home')} onSearch={handleSearch} onNewBooks={handleNewBooks} setScreen={setScreen} />
            </motion.div>
          )}
          {screen === 'search-results' && (
            <motion.div key="results" className="contents">
              <SearchResultsScreen
                query={searchQuery}
                results={searchResults}
                selectBook={(b) => navigateToBook(b, 'search-results')}
                onSearch={handleSearch}
              />
            </motion.div>
          )}
          {screen === 'book-detail' && selectedBook && (
            <motion.div key="detail" className="contents">
              <BookDetailScreen
                book={selectedBook}
                onBack={handleBack}
                onLoan={handleLoan}
                currentLoan={
                  bookDetailSource === 'my-loans'
                    ? loans.find((l) => l.bookId === selectedBook.id)
                    : undefined
                }
                onReturn={handleReturnFromDetail}
                onExtend={handleExtendFromDetail}
                userName={currentUser?.name}
              />
            </motion.div>
          )}
          {screen === 'my-loans' && (
            <motion.div key="loans" className="contents">
               <MyLoansScreen
                loans={loans}
                setLoans={setLoans}
                selectBook={(b) => navigateToBook(b, 'my-loans')}
                refreshLoans={async () => {
                  await fetchLoans();
                  await fetchBooks();
                }}
                userName={currentUser?.name || ''}
              />
            </motion.div>
          )}
          {screen === 'profile' && (
            <motion.div key="profile" className="contents">
              <ProfileScreen
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                onLogout={() => {
                  localStorage.removeItem('autologin_creds');
                  setCurrentUser(null);
                  setScreen('login');
                }}
                onAdmin={() => setScreen('admin')}
                profileImage={profileImage}
                setProfileImage={setProfileImage}
              />
            </motion.div>
          )}
          {screen === 'admin' && currentUser?.level === '관리자' && (
            <motion.div key="admin" className="contents">
              <AdminDashboard
                setScreen={setScreen}
                setBooks={(newBooks) => {
                  if (typeof newBooks === 'function') {
                    setBooks(prev => {
                      const updated = newBooks(prev);
                      saveBooksToServer(updated);
                      return updated;
                    });
                  } else {
                    setBooks(newBooks);
                    saveBooksToServer(newBooks);
                  }
                }}
              />
            </motion.div>
          )}
          {screen === 'admin' && currentUser?.level !== '관리자' && (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              <AlertCircle size={48} className="text-error mb-4" />
              <h2 className="text-xl font-black text-onSurface">접근 권한이 없습니다.</h2>
              <p className="text-sm text-onSurfaceVariant mt-2">관리자만 이용 가능한 페이지입니다.</p>
              <button onClick={() => setScreen('home')} className="mt-8 bg-primary text-white px-8 py-3 rounded-xl font-bold active:scale-95 transition-all">홈으로 이동</button>
            </div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav
        active={
          screen === 'book-detail'
            ? (bookDetailSource === 'my-loans' ? 'my-loans' : 'home')
            : (screen === 'admin' || screen === 'search-results' ? 'home' : screen)
        }
        setScreen={setScreen}
      />
    </div>
  );
}
