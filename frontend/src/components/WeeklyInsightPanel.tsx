import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { weeklyApi, type WeeklyInsights } from '../api/weekly'

interface Props {
  weekStart: string
  team: string
}

export default function WeeklyInsightPanel({ weekStart, team }: Props) {
  const [open, setOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['weekly', 'insights', weekStart, team],
    queryFn: () => weeklyApi.getInsights(weekStart, team),
    enabled: open,
  })

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left flex items-center gap-2 px-4 py-3 bg-indigo-50/60 border border-indigo-100 rounded-xl hover:bg-indigo-50 transition-colors text-[12px] font-semibold text-indigo-700 uppercase tracking-wider"
      >
        <span className="text-[10px]">▶</span>
        신뢰도 인사이트 분석
        <span className="ml-auto text-[11px] text-indigo-400 font-normal">지난 주 대비 패턴 감지</span>
      </button>
    )
  }

  return (
    <div className="border border-indigo-100 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-indigo-50/70">
        <h3 className="text-[12px] font-bold text-indigo-800 uppercase tracking-wider">
          신뢰도 인사이트
        </h3>
        <button
          onClick={() => setOpen(false)}
          className="text-[11px] text-indigo-400 hover:text-indigo-600 font-mono"
        >
          ✕ 닫기
        </button>
      </div>

      {isLoading && (
        <div className="px-4 py-8 text-center text-[13px] text-slate-400">분석 중…</div>
      )}

      {data && <InsightContent data={data} />}
    </div>
  )
}

function InsightContent({ data }: { data: WeeklyInsights }) {
  const trendDelta = data.submissionTrend.delta
  const trendColor = trendDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'
  const trendSign = trendDelta >= 0 ? '+' : ''

  return (
    <div className="p-4 space-y-5">
      {/* Submission trend */}
      <div>
        <SectionLabel>제출률 추이</SectionLabel>
        <div className="flex items-center gap-4 mt-2">
          <StatChip label="이번 주" value={`${data.submissionTrend.thisWeek}%`} />
          <span className="text-slate-400 text-[12px]">←</span>
          <StatChip label="지난 주" value={`${data.submissionTrend.lastWeek}%`} dim />
          <span className={`text-[13px] font-bold ${trendColor} ml-auto`}>
            {trendSign}{trendDelta}%p
          </span>
        </div>
      </div>

      {/* Long-running IN_PROGRESS tasks */}
      <div>
        <SectionLabel>
          장기 진행중 업무
          {data.longRunningTasks.length > 0 && (
            <span className="ml-1.5 text-rose-500">{data.longRunningTasks.length}건</span>
          )}
        </SectionLabel>
        {data.longRunningTasks.length === 0 ? (
          <p className="text-[12px] text-slate-400 mt-2">장기 진행 중 업무 없음 ✓</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {data.longRunningTasks.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] bg-rose-50/60 border border-rose-100 rounded-lg px-3 py-2">
                <span className="text-rose-400 mt-0.5 flex-shrink-0">●</span>
                <div>
                  <span className="font-semibold text-slate-700">{t.userName}</span>
                  {t.category && <span className="text-indigo-600 ml-1.5 text-[11px] uppercase">{t.category}</span>}
                  <p className="text-slate-500 mt-0.5 text-[11px]">{t.contentPreview}</p>
                </div>
                <span className="ml-auto text-[10px] text-rose-500 font-mono flex-shrink-0">
                  {t.weeksOngoing}주+
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Repeat rate */}
      <div>
        <SectionLabel>업무 반복률</SectionLabel>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all"
              style={{ width: `${Math.round(data.repeatRate * 100)}%` }}
            />
          </div>
          <span className="text-[13px] font-bold text-amber-600 font-mono">
            {Math.round(data.repeatRate * 100)}%
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          이번 주 업무 중 지난 주와 동일한 내용 비율
        </p>
      </div>

      {/* LOT-user mapping */}
      {data.lotUserMap.length > 0 && (
        <div>
          <SectionLabel>LOT 담당 현황 (이번 주)</SectionLabel>
          <div className="mt-2 space-y-1">
            {data.lotUserMap.map((entry) => (
              <div key={entry.lot} className="flex items-center gap-2 text-[12px]">
                <span className="font-mono text-indigo-700 font-semibold min-w-[6rem] truncate">
                  {entry.lot}
                </span>
                <span className="text-slate-400 text-[10px]">×{entry.count}</span>
                <div className="flex flex-wrap gap-1 ml-auto">
                  {entry.users.map((u) => (
                    <span
                      key={u}
                      className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 rounded px-1.5 py-0.5"
                    >
                      {u}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
      {children}
    </h4>
  )
}

function StatChip({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className={`flex flex-col items-center ${dim ? 'opacity-60' : ''}`}>
      <span className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-[15px] font-bold text-slate-700 font-mono">{value}</span>
    </div>
  )
}
