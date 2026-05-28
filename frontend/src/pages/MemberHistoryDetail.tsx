import type { AdminReportRow } from '../api/admin'

const TASK_STATUS: Record<string, { ko: string; cls: string }> = {
  COMPLETED:   { ko: '완료',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  IN_PROGRESS: { ko: '진행중', cls: 'bg-amber-50  text-amber-700  border-amber-100'  },
  ON_HOLD:     { ko: '보류',  cls: 'bg-slate-100  text-slate-600  border-slate-200'  },
}

const REPORT_STATUS: Record<string, { ko: string; cls: string }> = {
  SUBMITTED: { ko: '제출됨', cls: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  DRAFT:     { ko: '임시저장', cls: 'text-amber-700 bg-amber-50 border-amber-100'     },
  APPROVED:  { ko: '승인됨', cls: 'text-indigo-700 bg-indigo-50 border-indigo-100'   },
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${days[d.getDay()]})`
}

interface Props {
  report: AdminReportRow | null
  onClose: () => void
}

export default function MemberHistoryDetail({ report, onClose }: Props) {
  if (!report) {
    return (
      <div className="h-full flex items-center justify-center text-[13px] text-slate-400 text-center leading-relaxed py-16">
        목록에서 일지를 선택하면<br />상세 내용이 표시됩니다.
      </div>
    )
  }

  const rStatus = REPORT_STATUS[report.status]

  return (
    <div className="h-full overflow-y-auto">
      {/* Detail header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[15px] font-bold text-slate-900 leading-tight">
            {formatDate(report.reportDate.slice(0, 10))}
          </div>
          <div className="text-[12px] text-slate-500 mt-1">
            {report.user.name} · {report.user.employeeNo}
            {report.user.team ? ` · ${report.user.team}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {rStatus && (
            <span className={`text-[11px] px-2 py-0.5 rounded-md border font-medium ${rStatus.cls}`}>
              {rStatus.ko}
            </span>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl leading-none ml-2"
            title="닫기"
          >×</button>
        </div>
      </div>

      {/* Work hours */}
      {report.workHours && (
        <div className="text-[13px] text-slate-500 mb-4 num-mono">
          근무시간: {report.workHours}
        </div>
      )}

      {/* Tasks */}
      <div className="mb-4">
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          업무 항목 ({report.tasks.length}건)
        </h4>
        <ul className="space-y-2">
          {report.tasks.map((t) => {
            const st = TASK_STATUS[t.status]
            return (
              <li key={t.id} className="text-[13px] bg-slate-50/40 rounded-xl p-3 border border-slate-200">
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-[12px] num-mono text-slate-400 mt-0.5">{t.taskNo}</span>
                  {t.category && (
                    <span className="text-[11px] uppercase tracking-wider text-indigo-600 font-semibold">
                      {t.category}
                    </span>
                  )}
                  {st && (
                    <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-md border font-medium ${st.cls}`}>
                      {st.ko}
                    </span>
                  )}
                </div>
                <pre className="whitespace-pre-wrap font-sans text-slate-700 text-[13px] leading-relaxed">
                  {t.content}
                </pre>
                {t.taskIssue && (
                  <div className="mt-1.5 text-[12px] text-rose-600 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-rose-500" />
                    {t.taskIssue}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* Optional fields */}
      {report.issues && (
        <FieldBlock label="이슈 및 특이사항" value={report.issues} />
      )}
      {report.tomorrowPlan && (
        <FieldBlock label="내일 계획" value={report.tomorrowPlan} />
      )}
      {report.remarks && (
        <FieldBlock label="비고" value={report.remarks} />
      )}
    </div>
  )
}

function FieldBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-4">
      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</h4>
      <p className="text-[13px] text-slate-700 whitespace-pre-wrap bg-slate-50/40 rounded-lg p-3 border border-slate-200 leading-relaxed">
        {value}
      </p>
    </div>
  )
}
