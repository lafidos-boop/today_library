// 페이지 전반에서 재사용되는 레이아웃 컴포넌트들.
// - ScreenWrapper: 본문 컨테이너 (스크롤 영역, 상하단 padding)
// - Header: 상단 고정 헤더 (앱명/뒤로가기)
// - BottomNav: 하단 탭 (홈/내 대출/프로필)
// - SubPageHeader: 관리자 하위 페이지 제목 + 뒤로가기 라운드 버튼
import React from 'react';
import {
  ArrowLeft,
  Home,
  Book as BookIcon,
  User,
  Leaf,
} from 'lucide-react';
import type { Screen } from '../types';

export const ScreenWrapper = ({ children }: { children: React.ReactNode }) => (
  // AnimatePresence가 화면 전환 애니메이션을 이미 처리하므로 여기서는 정적 div 사용.
  // (이전엔 motion.div + opacity 0→1 fade를 했지만 외부 motion.div와 중첩되어
  // 애니메이션이 도중에 멈춰 화면이 반투명하게 보이는 버그가 있었음.)
  <div className="flex-1 overflow-y-auto pb-24 px-6 pt-16">
    {children}
  </div>
);

// 관리자 하위 페이지 헤더 — 페이지명 옆 데코레이션 아이콘 + 우측 라운드 박스 "뒤로가기" 버튼
export const SubPageHeader = ({
  icon: Icon,
  title,
  extraTitle,
  onBack,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  extraTitle?: React.ReactNode;
  onBack: () => void;
}) => (
  <div className="flex items-center justify-between mb-6 mt-2 gap-3">
    <div className="flex items-center gap-3 min-w-0">
      <div className="p-2 bg-primary/10 rounded-xl text-primary flex-shrink-0">
        <Icon size={18} />
      </div>
      <h2 className="text-2xl font-black text-onSurface tracking-tight truncate">
        {title}
        {extraTitle}
      </h2>
    </div>
    <button
      onClick={onBack}
      className="flex-shrink-0 px-4 py-2 bg-white border border-[#e2e3d6]/60 rounded-full text-xs font-black text-primary shadow-sm active:scale-95 transition-all"
    >
      뒤로가기
    </button>
  </div>
);

export const BottomNav = ({
  active,
  setScreen,
}: {
  active: Screen;
  setScreen: (s: Screen) => void;
}) => (
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

export const Header = ({
  title,
  showBack,
  onBack,
}: {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}) => (
  <header className="fixed top-0 left-0 w-full z-50 bg-[#fafaed]/80 backdrop-blur-xl border-b border-[#e2e3d6]/20">
    <div className="flex items-center px-5 h-12 w-full max-w-md mx-auto gap-2">
      {showBack && (
        <button
          onClick={onBack}
          className="-ml-1 p-1.5 text-primary/70 rounded-lg active:bg-primary/10 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      <Leaf size={18} className="text-primary/60 flex-shrink-0" />
      <span className="text-xl font-black text-primary tracking-tight">{title}</span>
    </div>
  </header>
);
