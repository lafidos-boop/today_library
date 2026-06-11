// 관리자 — 전체 활동 기록 (대출/반납/연체/회원/도서 탭).
// '회원' 탭은 가입 신청 대기 + 승인 기록 두 섹션으로 표시.
import React from 'react';
import { ClipboardList, Clock, UserCheck, CheckCircle2, BookPlus, AlertCircle, Phone, Trash2 } from 'lucide-react';

export type ActivityFilter = 'all' | 'borrow' | 'return' | 'overdue' | 'signup' | 'book_add';

export const ActivityLog = ({
  recentActivities,
  applicants,
  overdueMembers,
  activityFilter,
  setActivityFilter,
  onBack,
  onGotoApprovals,
  onDeleteLoan,
}: {
  recentActivities: any[];
  applicants: any[];
  overdueMembers: any[];
  activityFilter: ActivityFilter;
  setActivityFilter: (f: ActivityFilter) => void;
  onBack: () => void;
  onGotoApprovals: () => void;
  onDeleteLoan?: (loanId: number, bookTitle: string) => void;
}) => {
  const filteredActivities =
    activityFilter === 'all' ? recentActivities : recentActivities.filter((a) => a.type === activityFilter);

  const pendingApps = applicants.filter((a: any) => a.status !== 'approved');
  const signupActivities = recentActivities.filter((a: any) => a.type === 'signup');
  const bookAddActivities = recentActivities.filter((a: any) => a.type === 'book_add');

  return (
    // flex 레이아웃: 제목+탭은 shrink-0 고정, 리스트만 스크롤
    <div className="flex flex-col flex-1 overflow-hidden pt-12">
      {/* ── 고정 헤더: 제목 + 탭 ── */}
      <div className="shrink-0 px-6 pt-3 pb-0 bg-[#fafaed]">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-primary/10 rounded-xl text-primary flex-shrink-0">
            <ClipboardList size={15} />
          </div>
          <h2 className="text-base font-black text-onSurface tracking-tight">전체 활동 기록</h2>
        </div>
        <div className="flex gap-0.5 border-b-2 border-[#cdd0b8]">
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
              className={`flex-1 py-1.5 text-[11px] font-black whitespace-nowrap rounded-t-md transition-all relative ${
                activityFilter === tab.id
                  ? 'bg-white text-primary border-2 border-[#cdd0b8] border-b-white translate-y-[2px] z-10 shadow-sm'
                  : 'bg-[#eceedd] text-onSurfaceVariant/60 hover:bg-[#e2e3d6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 스크롤 영역: 리스트 ── */}
      <div className="flex-1 min-h-0 overflow-y-scroll px-6 pb-24 pt-4">

      {/* '연체' 탭: 현재 연체 중인 대출 목록 (loans 시트 기준) */}
      {activityFilter === 'overdue' ? (
        <div className="space-y-2 pb-8">
          <div className="flex items-center gap-2 mb-3 px-1">
            <AlertCircle size={14} className="text-error" />
            <h3 className="text-xs font-black text-onSurface uppercase tracking-widest">현재 연체 중</h3>
            <span className="text-[10px] font-bold text-onSurfaceVariant/60">· {overdueMembers.length}건</span>
          </div>
          {overdueMembers.length > 0 ? (
            overdueMembers.map((item: any, idx: number) => (
              <div key={idx} className="bg-white px-4 py-3.5 rounded-2xl shadow-sm border border-error/5 flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-onSurface text-sm inline-block">{item.name}</h3>
                    <span className="text-[10px] text-error font-black ml-2 bg-error/10 px-1.5 py-0.5 rounded">+{item.overdueDays}일</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-onSurfaceVariant font-bold opacity-40 uppercase tracking-widest">OVERDUE</span>
                    {onDeleteLoan && item.loanId != null && (
                      <button
                        onClick={() => onDeleteLoan(item.loanId, item.bookTitle)}
                        className="p-1.5 rounded-lg bg-error/10 text-error active:scale-95 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-[#e2e3d6]/20 pt-2 px-0.5">
                  <span className="font-black text-onSurfaceVariant text-[13px] truncate max-w-[200px]">{item.bookTitle}</span>
                  <span className="font-black text-onSurface/50 text-xs">{item.loanDate}</span>
                </div>
                {item.phone && (
                  <div className="flex items-center gap-1.5 border-t border-[#e2e3d6]/20 pt-2 px-0.5 text-[12px] text-onSurfaceVariant font-bold">
                    <Phone size={11} className="opacity-50 shrink-0" />
                    <span>{item.phone}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
              <AlertCircle size={40} className="mb-4" />
              <p className="font-bold">연체 중인 대출이 없습니다.</p>
            </div>
          )}
        </div>
      ) : /* '도서' 탭: 업로드된 도서 목록 */
      activityFilter === 'book_add' ? (
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
                  <span className="font-black text-primary">"{item.book}"</span> 도서가{' '}
                  <span className="font-black text-onSurface">'{item.action}'</span>에 추가되었습니다.
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
                  {item.type === 'book_add' ? (
                    <>
                      <span className="font-black text-primary">"{item.book}"</span> 도서가{' '}
                      <span className="font-black text-onSurface">'{item.action}'</span>에 추가되었습니다.
                    </>
                  ) : (
                    <>
                      <span className="font-black text-lg">{item.user}</span> 님이
                      <span className="text-primary font-black mx-1">"{item.book}"</span> 도서를
                      <span
                        className={`font-black ml-1 ${
                          item.type === 'return' ? 'text-primary' : item.type === 'borrow' ? 'text-onSurface' : 'text-error'
                        }`}
                      >
                        {item.action}
                      </span>
                    </>
                  )}
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
      </div>
    </div>
  );
};
