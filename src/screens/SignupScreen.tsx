// 회원가입 신청 화면 — 폼 입력 → POST /api/applications → 관리자 승인 대기.
import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toastApi } from '../toast';
import type { Screen } from '../types';

const formatPhoneNumber = (value: string) => {
  const numbers = value.replace(/[^\d]/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
};

export const SignupScreen = ({
  onBack,
  setScreen,
}: {
  onBack: () => void;
  setScreen: (s: Screen) => void;
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!formData.name || !formData.phone || !formData.password) {
      toastApi.error('모든 항목을 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setIsSubmitted(true);
      } else {
        const errorData = await response.json();
        toastApi.error(`신청 처리 중 오류가 발생했습니다: ${errorData.details || errorData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('Signup error:', error);
      toastApi.error(`서버와 통신 중 오류가 발생했습니다. 네트워크 연결을 확인해 주세요.`);
    } finally {
      setIsLoading(false);
    }
  };

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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="이름을 입력하세요"
                  lang="ko"
                  inputMode="text"
                  spellCheck={false}
                  autoCorrect="off"
                  className="w-full bg-surfaceContainerLow border-none rounded-2xl py-4 px-6 text-base focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-onSurfaceVariant px-1">전화번호</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                  placeholder="010-0000-0000"
                  inputMode="numeric"
                  className="w-full bg-surfaceContainerLow border-none rounded-2xl py-4 px-6 text-base focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-onSurfaceVariant px-1">비밀번호</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="new-password"
                  className="w-full bg-surfaceContainerLow border-none rounded-2xl py-4 px-6 text-base focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              <button
                onClick={handleSignup}
                disabled={isLoading}
                className={`w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all text-lg mt-4 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70' : ''}`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>처리 중...</span>
                  </>
                ) : (
                  '가입신청'
                )}
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
