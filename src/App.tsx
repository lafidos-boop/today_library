/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
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
  // 앱 실행 시 항상 로그인 화면부터 시작 (자동 로그인 비활성화).
  // 이전엔 localStorage에서 currentUser를 복원해 새로고침 시 로그인 상태가 유지됐었음.
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 이전 세션에 남아있던 currentUser 캐시 정리 (보안: 비밀번호 평문 저장 이슈도 함께 제거)
  React.useEffect(() => {
    localStorage.removeItem('currentUser');
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
  // 지원하는 패턴:
  //   "A"            → 서가 A
  //   "서가 A"        → 서가 A
  //   "A1"           → 서가 A, 1행
  //   "A 1행"         → 서가 A, 1행
  //   "A 1 1"        → 서가 A, 1행 1열
  //   "A-1-1"        → 서가 A, 1행 1열
  //   "A 1행 1열"     → 서가 A, 1행 1열
  //   "A1행1열"       → 서가 A, 1행 1열
  // 위치 쿼리가 아니면 null 반환 → 일반 검색(제목/저자/출판사/열람실)으로 처리
  const parseLocationQuery = (raw: string): { shelf: string; row: string | null; col: string | null } | null => {
    const t = raw.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!t) return null;
    let m;
    // 1) "서가 X" 또는 단일 글자 "X"
    m = t.match(/^(?:서가\s*)?([a-g])(?:\s*서가)?$/);
    if (m) return { shelf: m[1].toUpperCase(), row: null, col: null };
    // 2) 한국어 명시: "X N행 M열", "X N행"
    m = t.match(/^(?:서가\s*)?([a-g])\s*(\d+)\s*행(?:\s*(\d+)\s*열)?$/);
    if (m) return { shelf: m[1].toUpperCase(), row: m[2], col: m[3] || null };
    // 3) 구분자(-, _, 공백): "X-N-M", "X N M", "X-N", "X N"
    m = t.match(/^(?:서가\s*)?([a-g])\s*[-_\s]\s*(\d+)(?:\s*[-_\s]\s*(\d+))?$/);
    if (m) return { shelf: m[1].toUpperCase(), row: m[2], col: m[3] || null };
    // 4) 구분자 없는 짧은 형태: "A1" → 서가 A, 1행 (한 자리 숫자만)
    m = t.match(/^([a-g])(\d)$/);
    if (m) return { shelf: m[1].toUpperCase(), row: m[2], col: null };
    return null;
  };

  // === 장르 쿼리 파서 ===
  // 지원 패턴 (대소문자/공백 무시):
  //   "장르, 사회비평"
  //   "장르: 사회비평"
  //   "장르 사회비평"
  //   "genre: 에세이"
  // 매칭은 부분 일치(substring) → "사회비평" 검색 시 "정치/사회비평", "사회비평/에세이"도 결과에 포함
  const parseGenreQuery = (raw: string): string | null => {
    const m = raw.trim().match(/^(?:장르|genre)\s*[,:]?\s*(.+)$/i);
    if (!m) return null;
    const g = m[1].trim();
    return g.length > 0 ? g.toLowerCase() : null;
  };

  const handleSearch = (query: string) => {
    const term = query.toLowerCase().trim();
    const loc = parseLocationQuery(query);
    const genreQuery = parseGenreQuery(query);

    const filtered = books.filter(book => {
      const shelf = book.location.shelf.toLowerCase();
      const row = String(book.location.row).trim();
      const col = String(book.location.col).trim();

      // 1) 위치 쿼리: 정확히 매칭 (다른 검색 미실행)
      if (loc) {
        if (shelf !== loc.shelf.toLowerCase()) return false;
        if (loc.row !== null && row !== loc.row) return false;
        if (loc.col !== null && col !== loc.col) return false;
        return true;
      }

      // 2) 장르 쿼리: 장르 필드만 부분 매칭 (제목/저자 미실행)
      if (genreQuery) {
        return book.genre.toLowerCase().includes(genreQuery);
      }

      // 3) 일반 텍스트 검색 (제목/저자/출판사/열람실/장르)
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
        toastApi.loanSuccess({
          bookTitle: book.title,
          userName: currentUser.name,
          borrowDate: newLoan.borrowDate,
          returnDate: newLoan.returnDate,
        });
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

  // book-detail에서 직접 반납/연장 처리 (내 대출 화면에서 진입한 경우)
  const handleReturnFromDetail = async (loanId: number, bookTitle: string) => {
    if (!window.confirm(`'${bookTitle}'을(를) 반납하시겠어요?`)) return;
    try {
      const res = await fetch(`/api/loans/${loanId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchBooks();
        await fetchLoans();
        toastApi.returnSuccess({ bookTitle, userName: currentUser?.name || '' });
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
    // 7일 연장 — MyLoansScreen.handleExtendRequest와 동일한 날짜 계산
    const [m, d] = loan.returnDate.split('.').map(Number);
    let nm = m;
    let nd = d + 7;
    if (nd > 30) { nm += 1; nd -= 30; }
    const newDate = `${String(nm).padStart(2, '0')}.${String(nd).padStart(2, '0')}`;
    const newDDay = (loan.dDay || 0) - 7;

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
        showBack={screen === 'book-detail' || screen === 'admin' || screen === 'search-results'}
        onBack={handleBack}
      />
      
      <main className="flex flex-col min-h-screen">
        <AnimatePresence mode="wait">
          {screen === 'home' && (
            <motion.div key="home" className="contents">
              <HomeScreen userName={currentUser?.name || '독서가'} loans={loans} selectBook={(b) => navigateToBook(b, 'home')} onSearch={handleSearch} setScreen={setScreen} />
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
