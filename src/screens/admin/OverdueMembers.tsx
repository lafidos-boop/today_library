// 관리자 — 연체자 목록 (실 대출에서 isOverdue=true 항목 추출).
import React from 'react';
import { AlertCircle, Phone, Trash2 } from 'lucide-react';
import { ScreenWrapper, SubPageHeader } from '../../components/Layout';

type OverdueRow = { loanId?: number; name: string; bookTitle: string; loanDate: string; overdueDays: number; phone?: string };

export const OverdueMembers = ({
  overdueMembers,
  onBack,
  onDeleteLoan,
}: {
  overdueMembers: OverdueRow[];
  onBack: () => void;
  onDeleteLoan?: (loanId: number, bookTitle: string) => void;
}) => (
  <ScreenWrapper>
    <SubPageHeader
      icon={AlertCircle}
      title="연체자 리스트"
      extraTitle={<span className="text-lg text-error font-bold ml-2">(총 {overdueMembers.length}명)</span>}
      onBack={onBack}
    />

    <div className="space-y-2 pb-8">
      {overdueMembers.map((item, idx) => (
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
                  onClick={() => onDeleteLoan(item.loanId!, item.bookTitle)}
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
      ))}
    </div>
  </ScreenWrapper>
);
