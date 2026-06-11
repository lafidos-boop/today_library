// 관리자 — 전체 회원 목록 + 회원 정보 관리 모달.
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronRight, Users, X } from 'lucide-react';
import { toastApi } from '../../toast';

export const AllMembers = ({
  allMembers,
  allLoans,
  memberSearch,
  setMemberSearch,
  selectedMember,
  setSelectedMember,
  handleUpdateMember,
  deleteDuplicateMember,
  onBack,
}: {
  allMembers: any[];
  allLoans: any[];
  memberSearch: string;
  setMemberSearch: (s: string) => void;
  selectedMember: any | null;
  setSelectedMember: (m: any | null) => void;
  handleUpdateMember: (memberId: string, updateData: any) => void;
  deleteDuplicateMember: (memberId: string) => void;
  onBack: () => void;
}) => {
  const filteredMembers = allMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(memberSearch.toLowerCase()),
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden pt-12">
      {/* ── 고정 헤더: 제목 + 검색창 ── */}
      <div className="shrink-0 px-6 pt-3 pb-3 bg-[#fafaed] border-b border-[#e2e3d6]/30">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-primary/10 rounded-xl text-primary flex-shrink-0">
            <Users size={15} />
          </div>
          <h2 className="text-base font-black text-onSurface tracking-tight">
            전체 회원
            <span className="text-sm text-onSurfaceVariant/40 font-bold ml-2">{allMembers.length}명</span>
          </h2>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-onSurfaceVariant/40" size={16} />
          <input
            type="text"
            placeholder="이름 또는 회원번호 검색"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            className="w-full bg-white border border-[#e2e3d6]/60 rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary/10 transition-all font-medium"
          />
        </div>
      </div>

      {/* ── 스크롤 영역: 회원 목록 ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-24 pt-3">
        <div className="space-y-2">
          {filteredMembers.length > 0 ? (
            filteredMembers.map((member) => (
              <div
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-[#e2e3d6]/30 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#eeefe2] overflow-hidden border border-[#c4c9b4]/20 flex-shrink-0">
                    <img
                      src={member.profileImage || `https://picsum.photos/seed/${member.id}/100/100`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-onSurface text-sm truncate">
                      {member.name}
                      <span className="text-[10px] text-onSurfaceVariant/40 font-bold ml-1.5">{member.id}</span>
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-onSurfaceVariant font-bold opacity-40 uppercase tracking-widest">{member.joined} 가입</span>
                      <div className="w-0.5 h-0.5 bg-onSurfaceVariant/20 rounded-full" />
                      <span className="text-[10px] text-primary font-black">
                        대출 {allLoans.filter((l) => l.userId === member.id).length}권
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black flex-shrink-0 ${
                      member.level === '관리자' ? 'bg-primary/10 text-primary' : 'bg-surfaceContainerLow text-onSurfaceVariant opacity-60'
                    }`}
                  >
                    {member.level}
                  </span>
                  <ChevronRight size={14} className="text-onSurfaceVariant opacity-20" />
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center opacity-30 flex flex-col items-center">
              <Users size={40} className="mb-4" />
              <p className="font-black text-sm">해당 회원을 찾을 수 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* Member Detail Modal */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-10 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl relative"
            >
              <button
                onClick={() => setSelectedMember(null)}
                className="absolute right-6 top-6 p-2 bg-surfaceContainerLow rounded-full text-onSurfaceVariant"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-black text-onSurface mb-6">회원 정보 관리</h3>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-2 border-b border-surfaceVariant/10">
                  <span className="text-xs font-bold text-onSurfaceVariant">이름</span>
                  <span className="font-black text-onSurface">{selectedMember.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-surfaceVariant/10">
                  <span className="text-xs font-bold text-onSurfaceVariant">이메일</span>
                  <span className="font-bold text-onSurface">{selectedMember.email}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-surfaceVariant/10">
                  <span className="text-xs font-bold text-onSurfaceVariant">연락처</span>
                  <span className="font-black text-primary">{selectedMember.phone || '-'}</span>
                </div>
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold text-onSurfaceVariant px-1">비밀번호 변경</label>
                  <input
                    type="password"
                    placeholder="새 비밀번호 (변경 시에만 입력)"
                    id="member-password-input"
                    className="w-full bg-surfaceContainerLow border-none rounded-xl py-3 px-4 text-sm font-black focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const newPw = (document.getElementById('member-password-input') as HTMLInputElement).value;
                    if (!newPw) {
                      toastApi.info('변경할 비밀번호를 입력해 주세요.');
                      return;
                    }
                    handleUpdateMember(selectedMember.id, { password: newPw });
                  }}
                  className="flex-1 bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/10 active:scale-95 transition-all"
                >
                  수정 완료
                </button>
                <button
                  onClick={() => deleteDuplicateMember(selectedMember.id)}
                  className="px-6 bg-error/10 text-error font-black py-4 rounded-2xl active:scale-95 transition-all"
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
