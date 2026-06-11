// 관리자 — 승인 대기 회원 목록.
import React from 'react';
import { CheckCircle2, UserCheck } from 'lucide-react';

export const PendingMembers = ({
  applicants,
  approveMember,
  onBack,
}: {
  applicants: any[];
  approveMember: (id: number, role: '일반' | '관리자') => void;
  onBack: () => void;
}) => (
  <div className="flex flex-col flex-1 overflow-hidden pt-12">
    {/* ── 고정 헤더: 제목 ── */}
    <div className="shrink-0 px-6 pt-3 pb-3 bg-[#fafaed] border-b border-[#e2e3d6]/30">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-primary/10 rounded-xl text-primary flex-shrink-0">
          <UserCheck size={15} />
        </div>
        <h2 className="text-base font-black text-onSurface tracking-tight">
          승인 대기 멤버
          <span className="text-sm text-primary font-bold ml-2">
            {applicants.filter((a) => a.status === 'pending').length}명 대기
          </span>
        </h2>
      </div>
    </div>

    {/* ── 스크롤 영역 ── */}
    <div className="flex-1 min-h-0 overflow-y-scroll px-6 pb-24 pt-4">
      <div className="space-y-3">
        {applicants.map((app) => (
          <div key={app.id} className="bg-white p-5 rounded-3xl shadow-sm border border-[#e2e3d6]/30 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-black text-onSurface">{app.name}</h3>
                {app.phone && <p className="text-xs text-primary font-bold">{app.phone}</p>}
                <p className="text-[10px] text-onSurfaceVariant opacity-50 font-bold mt-1">신청일: {app.date}</p>
              </div>
              {app.status === 'approved' ? (
                <div className="flex flex-col items-end gap-1">
                  <span className="flex items-center gap-1 text-[#5d7f13] text-[10px] font-black bg-[#add461]/20 px-3 py-1 rounded-full">
                    <CheckCircle2 size={12} /> 승인됨
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
    </div>
  </div>
);
