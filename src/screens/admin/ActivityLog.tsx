// 관리자 — 전체 활동 기록 (대출/반납/연체/회원/도서 탭).
// '회원' 탭은 가입 신청 대기 + 승인 기록 두 섹션으로 표시.
import React from 'react';
import { ClipboardList, Clock, UserCheck, CheckCircle2, BookPlus } from 'lucide-react';
import { ScreenWrapper, SubPageHeader } from '../../components/Layout';

export type ActivityFilter = 'all' | 'borrow' | 'return' | 'overdue' | 'signup' | 'book_add';

export const ActivityLog = ({
  recentActivities,
  applicants,
  activityFilter,
  setActivityFilter,
  onBack,
  onGotoApprovals,
}: {
  recentActivities: any[];
  applicants: any[];
  activityFilter: ActivityFilter;
  setActivityFilter: (f: ActivityFilter) => void;
  onBack: () => void;
  onGotoApprovals: () => void;
}) => {
  const filteredActivities =
    activityFilter === 'all' ? recentActivities : recentActivities.filter((a) => a.type === activityFilter);

  const pendingApps = applicants.filter((a: any) => a.status !== 'approved');
  const signupActivities = recentActivities.filter((a: any) => a.type === 'signup');
  const bookAddActivities = recentActivities.filter((a: any) => a.type === 'book_add');

  return (
    <ScreenWrapper>
      <SubPageHeader icon={ClipboardList} title="전체 활동 기록" onBack={onBack} />

      {/* 필터 탭 */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { id: 'all', label: '전체' },
          { id: 'borrow', label: '대출' },
          { id: 'return', label: '반납' },
          { id: 'overdue', label: '연체' },
          { id: 'signup', label: '회원' },
          { id: 'book_add', label: '도서' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivityFilter(tab.id as ActivityFilter)}
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

      {/* '도서' 탭: 업로드된 도서 목록 */}
      {activityFilter === 'book_add' ? (
        <div className="space-y-3 pb-8">
          <div className="flex items-center gap-2 mb-3 px-1">
            <BookPlus size={14} className="text-primary" />
            <h3 className="text-xs font-black text-onSurface uppercase tracking-widest">도서 추가 기록</h3>
            <span className="text-[10px] font-bold text-onSurfaceVariant/60">· {bookAddActivities.length}건</span>
          </div>
          {bookAddActivities.length > 0 ? (
            bookAddActivities.map((item: any, i: number) => (
              <div key={i} className="bg-white p-5 rounded-3xl border border-[#e2e3d6]/30 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#7bb661]" />
                    <span className="text-[10px] font-black text-onSurfaceVariant uppercase tracking-widest">BOOK ADD</span>
                  </div>
                  <span className="text-[10px] text-onSurfaceVariant font-bold opacity-40">{item.time}</span>
                </div>
                <p className="text-sm font-medium text-onSurface leading-relaxed">
                  <span className="text-primary font-black mx-1">"{item.book}"</span> 도서가
                  <span className="font-black text-primary ml-1">추가</span>되었습니다.
                </p>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
              <BookPlus size={40} className="mb-4" />
              <p className="font-bold">도서 추가 기록이 없습니다.</p>
            </div>
          )}
        </div>
      ) : activityFilter === 'signup' ? (
        <div className="space-y-6 pb-8">
          {/* 1) 가입 신청 (대기 중) */}
          <section>
            <div className="flex items-center gap-2 mb-3 px-1">
              <UserCheck size={14} className="text-primary" />
              <h3 className="text-xs font-black text-onSurface uppercase tracking-widest">가입 신청 (대기 중)</h3>
              <span className="text-[10px] font-bold text-onSurfaceVariant/60">· {pendingApps.length}건</span>
            </div>
            {pendingApps.length > 0 ? (
              <div className="space-y-2">
                {pendingApps.map((app: any) => (
                  <div key={app.id} className="bg-white p-4 rounded-2xl border border-[#e2e3d6]/30 shadow-sm flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-black text-onSurface text-sm">{app.name}</span>
                        <span className="text-[10px] font-bold text-onSurfaceVariant/50">{app.email}</span>
                      </div>
                      <p className="text-[10px] font-bold text-onSurfaceVariant opacity-50">신청일: {app.date}</p>
                    </div>
                    <button
                      onClick={onGotoApprovals}
                      className="text-[10px] font-black text-primary bg-primary/5 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                    >
                      승인 처리
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#f4f5e7]/50 rounded-2xl py-6 text-center text-xs text-onSurfaceVariant/40 font-bold">
                대기 중인 가입 신청이 없습니다.
              </div>
            )}
          </section>

          {/* 2) 승인 기록 */}
          <section>
            <div className="flex items-center gap-2 mb-3 px-1">
              <CheckCircle2 size={14} className="text-primary" />
              <h3 className="text-xs font-black text-onSurface uppercase tracking-widest">승인 기록</h3>
              <span className="text-[10px] font-bold text-onSurfaceVariant/60">· {signupActivities.length}건 (최근 7일)</span>
            </div>
            {signupActivities.length > 0 ? (
              <div className="space-y-2">
                {signupActivities.map((item: any, i: number) => (
                  <div key={i} className="bg-white p-4 rounded-2xl border border-[#e2e3d6]/30 shadow-sm flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-[10px] font-black text-onSurfaceVariant uppercase tracking-widest">SIGNUP</span>
                      </div>
                      <span className="text-[10px] text-onSurfaceVariant font-bold opacity-40">{item.time}</span>
                    </div>
                    <p className="text-sm font-medium text-onSurface leading-relaxed">
                      <span className="font-black">{item.user}</span> 님이
                      <span className="text-primary font-black mx-1">{item.book}</span>
                      으로 <span className="font-black text-primary">{item.action}</span>되었습니다.
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#f4f5e7]/50 rounded-2xl py-6 text-center text-xs text-onSurfaceVariant/40 font-bold">
                최근 7일 내 승인 기록이 없습니다.
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-3 pb-8">
          {filteredActivities.length > 0 ? (
            filteredActivities.map((item, i) => (
              <div key={i} className="bg-white p-5 rounded-3xl border border-[#e2e3d6]/30 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        item.type === 'return' ? 'bg-[#add461]'
                        : item.type === 'borrow' ? 'bg-primary'
                        : item.type === 'book_add' ? 'bg-[#7bb661]'
                        : 'bg-error'
                      }`}
                    />
                    <span className="text-[10px] font-black text-onSurfaceVariant uppercase tracking-widest">{item.type}</span>
                  </div>
                  <span className="text-[10px] text-onSurfaceVariant font-bold opacity-40">{item.time}</span>
                </div>
                <p className="text-sm font-medium text-onSurface leading-relaxed">
                  <span className="font-black text-lg">{item.user}</span> 님이
                  <span className="text-primary font-black mx-1">"{item.book}"</span> 도서를
                  <span
                    className={`font-black ml-1 ${
                      item.type === 'return' ? 'text-primary' : item.type === 'borrow' ? 'text-onSurface' : 'text-error'
                    }`}
                  >
                    {item.action}
                  </span>
                  하였습니다.
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
      )}
    </ScreenWrapper>
  );
};
