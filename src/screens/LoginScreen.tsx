// 로그인 화면 — POST /api/login으로 인증, 일반/관리자 모드 분기.
import React, { useState } from 'react';
import { Sprout, User, Clock } from 'lucide-react';
import { toastApi } from '../toast';

export const LoginScreen = ({
  onLogin,
  onAdmin,
  onSignup,
}: {
  onLogin: (user: any) => void;
  onAdmin: (user: any) => void;
  onSignup: () => void;
}) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (type: 'user' | 'admin') => {
    if (!name || !password) {
      toastApi.error('이름과 비밀번호를 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    try {
      // 보안: password를 클라이언트로 흘리지 않도록 서버 측 인증 엔드포인트 사용
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toastApi.error('이름 또는 비밀번호가 일치하지 않거나 승인된 회원이 아닙니다.');
        } else {
          toastApi.error('로그인 처리 중 오류가 발생했습니다.');
        }
        return;
      }

      const user = await response.json();

      if (type === 'admin' && user.level !== '관리자') {
        toastApi.error('관리자 권한이 없습니다.');
        return;
      }

      if (type === 'admin') {
        onAdmin(user);
      } else {
        onLogin(user);
      }
    } catch (error) {
      console.error('Login error:', error);
      toastApi.error('로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-8 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-72 h-72 rounded-full bg-[#add461]/10 blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-5%] w-64 h-64 rounded-full bg-[#86fab0]/10 blur-3xl" />

      <div className="flex flex-col items-center mb-10 text-center z-10">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-primary to-[#3a5c10] flex items-center justify-center shadow-2xl shadow-primary/40">
            <Sprout size={42} className="text-white" strokeWidth={1.5} />
          </div>
          <div className="absolute inset-0 rounded-[28px] bg-primary/20 blur-2xl -z-10 scale-125" />
        </div>
        <h1 className="text-5xl font-black text-primary tracking-tight leading-none mb-3">오늘책방</h1>
        <p className="text-xs text-onSurfaceVariant/50 font-semibold tracking-[0.18em]">오늘의 지혜를 내일의 빛으로</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl shadow-primary/5 z-10 border border-[#e2e3d6]/30">
        <form onSubmit={(e) => { e.preventDefault(); handleLogin('user'); }} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-onSurfaceVariant px-1">이름</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-onSurfaceVariant" size={18} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                // 한글 IME 기본 활성화 힌트:
                //   - lang="ko" : 브라우저에 한국어 입력임을 알림
                //   - autoFocus : 페이지 로드 시 즉시 포커스 → IME가 한국어로 전환되기 쉬움
                //   - imeMode="active" : Firefox 등 일부 브라우저에서 한글 입력 활성화
                //   ※ Chrome 등은 OS의 마지막 IME 상태를 따르므로 한글 강제 보장은 불가
                lang="ko"
                inputMode="text"
                autoFocus
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                style={{ imeMode: 'active' } as React.CSSProperties}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surfaceContainerLow border-none rounded-2xl py-4 pl-12 pr-4 text-base focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-lg flex items-center justify-center gap-2"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '로그인'}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-4 text-[11px] text-onSurfaceVariant font-medium border-t border-surfaceContainer/50 pt-6">
          <button onClick={onSignup} className="text-primary font-bold">회원가입</button>
          <div className="w-px h-3 bg-surfaceContainer" />
          <button onClick={() => handleLogin('admin')} className="hover:text-primary transition-colors">관리자 모드</button>
        </div>
      </div>

      <p className="mt-12 text-[10px] text-onSurfaceVariant opacity-40 font-medium">© 오늘책방. All rights reserved.</p>
    </div>
  );
};
