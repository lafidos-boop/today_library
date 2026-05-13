// 관리자 — 도서 엑셀 업로드 완료 화면.
import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ScreenWrapper } from '../../components/Layout';

export const UploadStatus = ({
  lastUploaded,
  onBack,
}: {
  lastUploaded: string | null;
  onBack: () => void;
}) => (
  <ScreenWrapper>
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 bg-[#add461]/20 rounded-full flex items-center justify-center text-primary mb-6">
        <CheckCircle2 size={40} />
      </div>
      <h2 className="text-2xl font-black text-onSurface mb-2">업로드 완료!</h2>
      <p className="text-onSurfaceVariant font-medium mb-8">
        "{lastUploaded}" 파일의 데이터가
        <br />
        성공적으로 시스템에 반영되었습니다.
      </p>
      <button
        onClick={onBack}
        className="bg-primary text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-primary/10 active:scale-95 transition-all"
      >
        대시보드로 돌아가기
      </button>
    </div>
  </ScreenWrapper>
);
