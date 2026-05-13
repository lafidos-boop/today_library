// 프로필 화면 — 회원 정보 수정, 프로필 이미지 변경, 로그아웃, 관리자 모드 진입.
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Image as ImageIcon, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ScreenWrapper } from '../components/Layout';
import { toastApi } from '../toast';

export const ProfileScreen = ({
  currentUser,
  setCurrentUser,
  onLogout,
  onAdmin,
  profileImage,
  setProfileImage,
}: {
  currentUser: any;
  setCurrentUser: (u: any) => void;
  onLogout: () => void;
  onAdmin: () => void;
  profileImage: string;
  setProfileImage: (img: string) => void;
}) => {
  const [showOptions, setShowOptions] = useState(false);
  // 보안: currentUser에 password가 더 이상 포함되지 않음 (로그인 응답에서 마스킹).
  // 비밀번호는 입력 시에만 갱신되도록 빈 값으로 시작.
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    password: '',
  });
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        if (evt.target?.result) {
          const base64 = evt.target.result as string;
          setProfileImage(base64);
          // Persist to server (백엔드에서 base64 → 파일로 변환 후 URL 반환)
          try {
            const res = await fetch(`/api/users/${currentUser.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ profileImage: base64 }),
            });
            if (res.ok) {
              const data = await res.json();
              const finalImage = data.profileImage || base64;
              setProfileImage(finalImage);
              setCurrentUser({ ...currentUser, profileImage: finalImage });
            }
          } catch (err) {
            console.error('Failed to save profile image:', err);
          }
        }
      };
      reader.readAsDataURL(file);
      setShowOptions(false);
    }
  };

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      // password는 입력했을 때만 전송 (빈 값 PUT으로 기존 비밀번호 지워지는 사고 방지)
      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      };
      if (formData.password.trim()) {
        payload.password = formData.password;
      }

      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        // currentUser엔 password를 다시 넣지 않음 (보안)
        const updatedUser = { ...currentUser, name: formData.name, email: formData.email, phone: formData.phone };
        setCurrentUser(updatedUser);
        setFormData({ ...formData, password: '' });
        setUpdateMessage('회원 정보가 성공적으로 수정되었습니다.');
        setTimeout(() => setUpdateMessage(''), 3000);
      }
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // 프로필 이미지 업로드는 Vercel 환경(서버리스 디스크 없음)에서 곧바로 작동하지 않음.
  // 추후 Supabase Storage 등으로 연동 예정. 지금은 표시만, 클릭 시 안내 토스트.
  const UPLOAD_ENABLED = false;

  return (
    <ScreenWrapper>
      <div className="flex flex-col items-center mt-2 mb-4">
        <button
          onClick={() => {
            if (UPLOAD_ENABLED) setShowOptions(true);
            else toastApi.info('프로필 사진 변경은 곧 추가될 예정입니다.');
          }}
          className="relative group active:scale-95 transition-all"
        >
          <div className="w-20 h-20 rounded-[28px] bg-[#eeefe2] overflow-hidden border-[3px] border-white shadow-lg p-1">
            <img
              src={profileImage}
              className="w-full h-full object-cover rounded-[20px]"
              referrerPolicy="no-referrer"
            />
          </div>
          {UPLOAD_ENABLED && (
            <div className="absolute bottom-0 right-0 w-7 h-7 bg-primary text-white rounded-lg border-2 border-white flex items-center justify-center shadow-md">
              <Camera size={12} />
            </div>
          )}
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
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-surfaceContainerLow border-none rounded-xl py-3 px-5 text-base focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-onSurfaceVariant px-1 uppercase tracking-wider opacity-60">휴대전화번호</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full bg-surfaceContainerLow border-none rounded-xl py-3 px-5 text-base focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-onSurfaceVariant px-1 uppercase tracking-wider opacity-60">비밀번호</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
        {currentUser?.level === '관리자' && (
          <button
            onClick={onAdmin}
            className="w-full py-2 px-6 flex items-center justify-center gap-2 text-onSurfaceVariant/40 hover:text-primary transition-colors text-[10px] font-bold"
          >
            <AlertCircle size={12} />
            <span>도서관 운영 관리 (관리자 전용)</span>
          </button>
        )}

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
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
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
