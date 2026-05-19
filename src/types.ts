// 앱 전역에서 공유하는 타입 정의.
// App.tsx 분할의 첫 단계 — 다른 모듈이 의존할 수 있도록 가장 먼저 추출.

export type Screen =
  | 'login'
  | 'signup'
  | 'home'
  | 'book-detail'
  | 'my-loans'
  | 'profile'
  | 'admin'
  | 'search-results';

export interface Book {
  id: string;
  title: string;
  author: string;
  publisher: string;
  genre: string;
  cover: string;
  isbn?: string;
  addedAt?: string;
  location: {
    shelf: string;
    row: string;
    col: string;
    room: string;
  };
  status: 'available' | 'borrowed' | 'overdue';
}

export interface Loan {
  bookId: string;
  borrowDate: string;
  returnDate: string;
  isOverdue: boolean;
  dDay: number;
  progress: number;
}

// 대출 + 도서 정보 결합
export type LoanWithBook = Loan & { book: Book; id?: number };
