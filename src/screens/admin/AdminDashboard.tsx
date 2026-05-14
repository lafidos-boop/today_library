// 관리자 대시보드 — 운영 현황 요약 + 빠른 실행 + sub-view 디스패치.
import React, { useEffect, useState } from 'react';
import { ChevronRight, FileSpreadsheet, Users, Clock, RefreshCw } from 'lucide-react';
import { ScreenWrapper } from '../../components/Layout';
import { toastApi } from '../../toast';
import type { Screen, Book } from '../../types';
import { PendingMembers } from './PendingMembers';
import { AllMembers } from './AllMembers';
import { OverdueMembers } from './OverdueMembers';
import { UploadStatus } from './UploadStatus';
import { ActivityLog, type ActivityFilter } from './ActivityLog';
import { BookSearchUpload } from './BookSearchUpload';

type SubView = 'main' | 'members' | 'all-members' | 'overdue-members' | 'upload-status' | 'activities' | 'book-search';

export const AdminDashboard = ({
  setScreen,
  setBooks,
}: {
  setScreen: (s: Screen) => void;
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
}) => {
  const [subView, setSubView] = useState<SubView>('main');
  const [applicants, setApplicants] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [allLoans, setAllLoans] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [lastUploaded, setLastUploaded] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Google Sheets 강제 동기화 (5분 디바운스 무시)
  const forceSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const r = await fetch('/api/books/sync', { method: 'POST' });
      const data = await r.json();
      if (r.ok) {
        toastApi.success(`도서 동기화 완료 (총 ${data.booksCount}권)`);
      } else {
        toastApi.error(data.error || '동기화에 실패했습니다.');
      }
    } catch (e) {
      console.error('Force sync failed:', e);
      toastApi.error('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchData = async () => {
    try {
      const appsRes = await fetch('/api/applications');
      setApplicants(await appsRes.json());

      const usersRes = await fetch('/api/users');
      setAllMembers(await usersRes.json());

      const loansRes = await fetch('/api/admin/loans');
      setAllLoans(await loansRes.json());

      const actRes = await fetch('/api/activities');
      const actData = await actRes.json();

      // 최근 7일 이내 활동만 필터링
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const filteredActs = actData
        .filter((a: any) => new Date(a.time) >= oneWeekAgo)
        .map((a: any) => ({
          ...a,
          time: new Date(a.time).toLocaleDateString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
        }));

      setRecentActivities(filteredActs);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 연체자 리스트는 실 대출(allLoans)에서 isOverdue=true인 항목을 추출 (백엔드에서 동적 계산됨)
  const overdueMembers = allLoans
    .filter((l: any) => l.isOverdue)
    .map((l: any) => {
      const member = allMembers.find((m: any) => m.id === l.userId);
      return {
        name: l.userName || '회원',
        bookTitle: l.bookTitle || '도서',
        loanDate: l.borrowDate || '-',
        overdueDays: l.dDay || 0,
        phone: member?.phone || '',
      };
    });

  const approveMember = async (id: number, role: '일반' | '관리자') => {
    const applicant = applicants.find((a) => a.id === id);
    if (!applicant) return;

    // 중복 이름 확인
    const isDuplicate = allMembers.some((m) => m.name === applicant.name);
    if (isDuplicate) {
      const confirmDelete = window.confirm(`"${applicant.name}" 회원은 이미 존재합니다. 중복 가입을 방지하기 위해 신청 내역을 삭제할까요?`);
      if (confirmDelete) {
        try {
          await fetch(`/api/applications/${id}`, { method: 'DELETE' });
          fetchData();
          toastApi.success('중복 신청 내역을 삭제했습니다.');
        } catch (e) {
          toastApi.error('삭제 중 오류가 발생했습니다.');
        }
      }
      return;
    }

    try {
      // (이전 버그: password 누락으로 승인된 회원이 로그인 못 함 → applicant.password 함께 전송)
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: applicant.name,
          email: applicant.email,
          phone: applicant.phone,
          password: applicant.password,
          level: role,
        }),
      });
      await fetch(`/api/applications/${id}`, { method: 'DELETE' });
      await fetchData();
      toastApi.success(`"${applicant.name}" 회원의 승인이 완료되었습니다.`);
    } catch (error) {
      console.error('Approval failed:', error);
      toastApi.error('승인 처리 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateMember = async (memberId: string, updateData: any) => {
    try {
      const res = await fetch(`/api/users/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (res.ok) {
        toastApi.success('회원 정보가 수정되었습니다.');
        await fetchData();
        setSelectedMember(null);
      }
    } catch (e) {
      toastApi.error('수정 중 오류가 발생했습니다.');
    }
  };

  const deleteDuplicateMember = async (memberId: string) => {
    if (!window.confirm('회원 정보를 영구적으로 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/users/${memberId}`, { method: 'DELETE' });
      if (res.ok) {
        toastApi.success('회원 정보가 삭제되었습니다.');
        await fetchData();
        setSelectedMember(null);
      }
    } catch (e) {
      toastApi.error('삭제 중 오류가 발생했습니다.');
    }
  };

  // === Sub-view 디스패치 ===
  if (subView === 'members')
    return <PendingMembers applicants={applicants} approveMember={approveMember} onBack={() => setSubView('main')} />;
  if (subView === 'all-members')
    return (
      <AllMembers
        allMembers={allMembers}
        allLoans={allLoans}
        memberSearch={memberSearch}
        setMemberSearch={setMemberSearch}
        selectedMember={selectedMember}
        setSelectedMember={setSelectedMember}
        handleUpdateMember={handleUpdateMember}
        deleteDuplicateMember={deleteDuplicateMember}
        onBack={() => setSubView('main')}
      />
    );
  if (subView === 'overdue-members')
    return <OverdueMembers overdueMembers={overdueMembers} onBack={() => setSubView('main')} />;
  if (subView === 'upload-status')
    return <UploadStatus lastUploaded={lastUploaded} onBack={() => setSubView('main')} />;
  if (subView === 'activities')
    return (
      <ActivityLog
        recentActivities={recentActivities}
        applicants={applicants}
        activityFilter={activityFilter}
        setActivityFilter={setActivityFilter}
        onBack={() => setSubView('main')}
        onGotoApprovals={() => setSubView('members')}
      />
    );
  if (subView === 'book-search')
    return <BookSearchUpload onBack={() => setSubView('main')} />;

  // === 메인 화면 ===
  return (
    <ScreenWrapper>
      <div className="mb-6 mt-1">
        <h2 className="text-2xl font-black text-onSurface tracking-tight">운영 현황 요약</h2>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-8">
        <div className="bg-white p-3.5 rounded-2xl border-l-4 border-[#add461] shadow-sm flex flex-col">
          <span className="text-[11px] font-bold text-onSurfaceVariant uppercase tracking-widest block mb-1.5 opacity-50">총 회원</span>
          <h3 className="text-xl font-black text-primary tracking-tight">{allMembers.length}</h3>
          <span className="text-[10px] font-bold text-[#5d7f13] mt-0.5">명</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border-l-4 border-primary/20 shadow-sm flex flex-col">
          <span className="text-[11px] font-bold text-onSurfaceVariant uppercase tracking-widest block mb-1.5 opacity-50">대출 중</span>
          <h3 className="text-xl font-black text-onSurface tracking-tight">{allLoans.length}</h3>
          <span className="text-[10px] font-bold text-onSurfaceVariant mt-0.5 opacity-0">-</span>
        </div>
        <button
          onClick={() => setSubView('overdue-members')}
          className="bg-[#fcf8f7] p-3.5 rounded-2xl border-l-4 border-[#e2c1bb] shadow-sm text-left active:scale-95 transition-all flex flex-col relative"
        >
          <span className="text-[11px] font-bold text-onSurfaceVariant uppercase tracking-widest block mb-1.5 opacity-50">연체</span>
          <h3 className="text-xl font-black text-[#af7c73] tracking-tight">{overdueMembers.length}</h3>
          <span className="text-[10px] font-bold text-[#af7c73] mt-0.5 opacity-0">-</span>
          <ChevronRight size={16} className="text-[#af7c73] opacity-40 absolute bottom-3.5 right-3" />
        </button>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-onSurface">최근 활동</h3>
          <button
            onClick={() => setSubView('activities')}
            className="text-primary font-bold text-xs underline underline-offset-4"
          >
            전체보기
          </button>
        </div>
        <div className="space-y-2.5">
          {recentActivities.slice(0, 3).map((item, i) => (
            <div key={i} className="bg-white p-4 rounded-xl flex items-center gap-3 border border-[#e2e3d6]/30">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-onSurface truncate">
                  <span className="font-black">{item.user}</span> 님이 <span className="text-primary font-bold">"{item.book}"</span> {item.action}
                </p>
                <span className="text-[10px] text-onSurfaceVariant font-bold opacity-50">{item.time}</span>
              </div>
              <span
                className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                  item.type === 'return' ? 'bg-[#add461]/20 text-primary' : item.type === 'borrow' ? 'bg-[#eeefe2] text-[#444939]' : 'bg-error/10 text-error'
                }`}
              >
                {item.action}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4 px-1 gap-2">
          <h3 className="text-[10px] font-black text-onSurfaceVariant uppercase tracking-widest opacity-50">빠른 실행</h3>
          <button
            onClick={forceSync}
            disabled={isSyncing}
            className="text-primary font-bold text-[10px] flex items-center gap-1.5 bg-primary/8 px-2.5 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-40"
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? '동기화 중...' : '도서 동기화'}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <button
            onClick={() => setSubView('book-search')}
            className="flex flex-col items-center justify-center gap-2 bg-[#e6eacb] text-primary py-3 px-1 rounded-xl transition-all active:scale-95"
          >
            <div className="p-2 bg-primary/15 rounded-lg">
              <FileSpreadsheet size={18} />
            </div>
            <span className="text-[10px] font-black leading-tight">
              도서 <br /> 업로드
            </span>
          </button>
          <button
            onClick={() => setSubView('members')}
            className="flex flex-col items-center justify-center gap-2 bg-[#e6eacb] text-primary py-3 px-1 rounded-xl transition-all active:scale-95 relative"
          >
            <div className="p-2 bg-primary/15 rounded-lg">
              <FileSpreadsheet size={18} />
            </div>
            <span className="text-[10px] font-black leading-tight">
              승인 <br /> 대기
            </span>
            {applicants.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                {applicants.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setSubView('all-members')}
            className="flex flex-col items-center justify-center gap-2 bg-[#e6eacb] text-primary py-3 px-1 rounded-xl transition-all active:scale-95"
          >
            <div className="p-2 bg-primary/15 rounded-lg">
              <Users size={18} />
            </div>
            <span className="text-[10px] font-black leading-tight">
              전체 <br /> 회원
            </span>
          </button>
          <button
            onClick={() => setSubView('activities')}
            className="flex flex-col items-center justify-center gap-2 bg-[#e6eacb] text-primary py-3 px-1 rounded-xl transition-all active:scale-95"
          >
            <div className="p-2 bg-primary/15 rounded-lg">
              <Clock size={18} />
            </div>
            <span className="text-[10px] font-black leading-tight">
              기록 <br /> 확인
            </span>
          </button>
        </div>
      </div>
    </ScreenWrapper>
  );
};
