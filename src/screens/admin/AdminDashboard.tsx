// 관리자 대시보드 — 운영 현황 요약 + 빠른 실행 + sub-view 디스패치.
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { ChevronRight, FileSpreadsheet, AlertCircle, Users, Clock, RefreshCw } from 'lucide-react';
import { ScreenWrapper } from '../../components/Layout';
import { toastApi } from '../../toast';
import type { Screen, Book } from '../../types';
import { PendingMembers } from './PendingMembers';
import { AllMembers } from './AllMembers';
import { OverdueMembers } from './OverdueMembers';
import { UploadStatus } from './UploadStatus';
import { ActivityLog, type ActivityFilter } from './ActivityLog';

type SubView = 'main' | 'members' | 'all-members' | 'overdue-members' | 'upload-status' | 'activities';

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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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
    .map((l: any) => ({
      name: l.userName || '회원',
      bookTitle: l.bookTitle || '도서',
      loanDate: l.borrowDate || '-',
      overdueDays: l.dDay || 0,
    }));

  // === Kakao Books API: 도서 업로드 시 ISBN/표지 자동 매칭 ===
  const fetchFromKakao = async (query: string, isIsbn: boolean = true) => {
    const apiKey = import.meta.env.VITE_KAKAO_API_KEY;
    if (!apiKey || apiKey === 'YOUR_KAKAO_API_KEY') return null;

    try {
      const target = isIsbn ? 'isbn' : 'title';
      const cleanQuery = isIsbn ? query.replace(/-/g, '').trim() : query.trim();
      const response = await fetch(
        `https://dapi.kakao.com/v3/search/book?target=${target}&query=${encodeURIComponent(cleanQuery)}`,
        { headers: { Authorization: `KakaoAK ${apiKey}` } },
      );
      const data = await response.json();
      if (data.documents && data.documents.length > 0) {
        const doc = data.documents[0];
        return {
          title: doc.title,
          author: doc.authors.join(', '),
          publisher: doc.publisher,
          cover: doc.thumbnail,
          description: doc.contents,
          isbn: doc.isbn.split(' ')[0],
        };
      }
    } catch (e) {
      console.error('Kakao API fetch failed:', e);
    }
    return null;
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(extension || '')) {
      setUploadError('File types are not supported. .xlsx, .xls, .csv 파일만 업로드 가능합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      setIsUploading(true);
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(ws);

        if (jsonData.length === 0) {
          setUploadError('파일에 데이터가 없습니다.');
          setIsUploading(false);
          return;
        }

        const transformedBooks: Book[] = [];
        for (const row of jsonData as any[]) {
          const isbn = String(row['ISBN'] || row['isbn'] || '');
          const title = String(row['제목'] || row['Title'] || '');
          let apiInfo = null;
          if (isbn && isbn.length >= 10) {
            apiInfo = await fetchFromKakao(isbn, true);
          } else if (title && title.length > 0) {
            apiInfo = await fetchFromKakao(title, false);
          }

          transformedBooks.push({
            id: String(row['도서코드'] || row['ID'] || `BD-${Math.random().toString(36).substr(2, 4).toUpperCase()}`),
            isbn: apiInfo?.isbn || isbn,
            title: apiInfo?.title || title || '제목 없음',
            author: apiInfo?.author || String(row['저자'] || row['Author'] || '저자 미상'),
            publisher: apiInfo?.publisher || String(row['출판사'] || row['Publisher'] || '출판사 미상'),
            genre: String(row['장르'] || row['Genre'] || '일반'),
            cover: apiInfo?.cover || String(row['표지'] || `https://picsum.photos/seed/${title || Math.random()}/400/600`),
            location: {
              shelf: String(row['서가'] || row['Shelf'] || '-'),
              row: String(row['행'] || row['Row'] || '-'),
              col: String(row['열'] || row['Col'] || '-'),
              room: String(row['위치(열람실)'] || row['Room'] || '새벽도서관'),
            },
            status: 'available',
          });
        }

        setBooks(transformedBooks);
        setLastUploaded(file.name);
        setSubView('upload-status');
      } catch (err) {
        console.error('Excel Read Error:', err);
        setUploadError('파일을 읽는 중 오류가 발생했습니다.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => setUploadError('파일을 읽지 못했습니다.');
    reader.readAsArrayBuffer(file);
  };

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

  const downloadSampleExcel = () => {
    const sampleData = [
      { 도서코드: 'BD-0001', 제목: '숲의 목소리: 식물의 언어를 듣다', 저자: '한지수', 출판사: '오늘출판사', 장르: '자연과학 / 에세이', 서가: 'A책장', 행: '2행', 열: '3열', '위치(열람실)': '제1열람실' },
      { 도서코드: 'BD-0002', 제목: '식물학자의 일기', 저자: '김오늘', 출판사: '그린북스', 장르: '자연과학', 서가: 'B책장', 행: '1행', 열: '5열', '위치(열람실)': '제1열람실' },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '도서목록');
    XLSX.writeFile(wb, 'today_library_sample.xlsx');
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

  // === 메인 화면 ===
  return (
    <ScreenWrapper>
      <div className="mb-6 mt-1">
        <h2 className="text-2xl font-black text-onSurface tracking-tight">운영 현황 요약</h2>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-8">
        <div className="bg-white p-3.5 rounded-2xl border-l-4 border-[#add461] shadow-sm">
          <span className="text-[11px] font-bold text-onSurfaceVariant uppercase tracking-widest block mb-1.5 opacity-50">총 회원</span>
          <div className="flex flex-col">
            <h3 className="text-xl font-black text-primary tracking-tight">{allMembers.length}</h3>
            <div className="flex items-center gap-1 text-[#5d7f13] text-[10px] font-bold mt-0.5">
              <span>명</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border-l-4 border-primary/20 shadow-sm">
          <span className="text-[11px] font-bold text-onSurfaceVariant uppercase tracking-widest block mb-1.5 opacity-50">대출 중</span>
          <h3 className="text-xl font-black text-onSurface tracking-tight">{allLoans.length}</h3>
        </div>
        <button
          onClick={() => setSubView('overdue-members')}
          className="bg-[#fcf8f7] p-3.5 rounded-2xl border-l-4 border-[#e2c1bb] shadow-sm text-left active:scale-95 transition-all"
        >
          <span className="text-[11px] font-bold text-onSurfaceVariant uppercase tracking-widest block mb-1.5 opacity-50">연체</span>
          <div className="flex items-end justify-between">
            <h3 className="text-xl font-black text-[#af7c73] tracking-tight">{overdueMembers.length}</h3>
            <ChevronRight size={16} className="text-[#af7c73] opacity-40 mb-0.5" />
          </div>
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
          <div className="flex items-center gap-2">
            <button
              onClick={forceSync}
              disabled={isSyncing}
              className="text-primary font-bold text-[10px] flex items-center gap-1.5 bg-primary/5 px-2.5 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-40"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? '동기화 중...' : '도서 동기화'}
            </button>
            <button
              onClick={downloadSampleExcel}
              className="text-primary font-bold text-[10px] flex items-center gap-1.5 bg-primary/5 px-2.5 py-1.5 rounded-lg active:scale-95 transition-all"
            >
              <FileSpreadsheet size={12} />
              샘플 양식
            </button>
          </div>
        </div>

        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-error/10 border border-error/20 rounded-xl flex items-start gap-2 text-error text-[11px] font-bold"
          >
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <p>{uploadError}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-4 gap-2 text-center">
          <label
            className={`cursor-pointer flex flex-col items-center justify-center gap-2 bg-primary text-white py-3 px-1 rounded-xl transition-all active:scale-95 shadow-lg shadow-primary/10 ${
              isUploading ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <input
              type="file"
              accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
              className="hidden"
              onChange={handleExcelUpload}
            />
            <div className="p-2 bg-white/20 rounded-lg">
              {isUploading ? (
                <div className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FileSpreadsheet size={18} />
              )}
            </div>
            <span className="text-[10px] font-black leading-tight">{isUploading ? '조회 중...' : '도서\n업로드'}</span>
          </label>
          <button
            onClick={() => setSubView('members')}
            className="flex flex-col items-center justify-center gap-2 bg-[#eeefe2] text-primary py-3 px-1 rounded-xl transition-all active:scale-95 relative"
          >
            <div className="p-2 bg-primary/10 rounded-lg">
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
            className="flex flex-col items-center justify-center gap-2 bg-[#eeefe2] text-primary py-3 px-1 rounded-xl transition-all active:scale-95"
          >
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users size={18} />
            </div>
            <span className="text-[10px] font-black leading-tight">
              전체 <br /> 회원
            </span>
          </button>
          <button
            onClick={() => setSubView('activities')}
            className="flex flex-col items-center justify-center gap-2 bg-[#eeefe2] text-primary py-3 px-1 rounded-xl transition-all active:scale-95"
          >
            <div className="p-2 bg-primary/10 rounded-lg">
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
