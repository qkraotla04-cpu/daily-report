// Editorial Print 톤 — 일일 취합본 인쇄용 페이지
// FT / NYT 편집 지면 풍 — 미색 종이 + 세리프 헤드라인 + 두꺼운 룰선

import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { aggregationApi, type AggregationRow, type AggregationTask } from '../api/aggregation'

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'DONE',
  IN_PROGRESS: 'WIP',
  ON_HOLD: 'HOLD',
}

const STATUS_KOR: Record<string, string> = {
  COMPLETED: '완료',
  IN_PROGRESS: '진행중',
  ON_HOLD: '보류',
}

const STATUS_BORDER: Record<string, string> = {
  COMPLETED: 'border-emerald-700 text-emerald-800',
  IN_PROGRESS: 'border-rose-700 text-rose-700',
  ON_HOLD: 'border-slate-500 text-slate-700',
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

function dateLabel(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return {
    long: `${d.getFullYear()} · ${String(d.getMonth() + 1).padStart(2, '0')} · ${String(d.getDate()).padStart(2, '0')}`,
    weekday: `${WEEKDAY[d.getDay()]}요일`,
    iso,
  }
}

export default function PrintAggregation() {
  const { date } = useParams<{ date: string }>()
  const isoDate = date ?? new Date().toISOString().slice(0, 10)

  const aggQuery = useQuery({
    queryKey: ['aggregation', 'print', isoDate],
    queryFn: () => aggregationApi.getDaily(isoDate),
  })

  // 페이지 진입 시 인쇄 단축키 안내, 인쇄 후 닫기
  useEffect(() => {
    document.title = `업무일지 취합본 ${isoDate}`
  }, [isoDate])

  const rows = aggQuery.data?.rows ?? []
  const submitted = rows.filter((r) => r.report)
  const missing = rows.filter((r) => !r.report)
  const totalTasks = submitted.reduce((s, r) => s + (r.report?.tasks.length ?? 0), 0)
  const dl = dateLabel(isoDate)

  return (
    <div className="bg-[#FAFAF5] text-slate-900 min-h-screen print:bg-white">
      {/* 인쇄 버튼 (인쇄 시 숨김) */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 rounded-lg bg-slate-900 text-white text-[13px] font-semibold shadow-lg hover:bg-slate-800"
        >
          🖨 인쇄
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-[13px] font-medium hover:bg-slate-50"
        >
          닫기
        </button>
      </div>

      <div className="mx-auto print:mx-0 max-w-[210mm] min-h-[297mm] print:min-h-0 px-12 py-10 print:py-6 print:px-8 paper-bg">
        {/* Masthead */}
        <header className="border-b-2 border-slate-900 pb-5 mb-7">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] tracking-[0.32em] uppercase text-rose-700 font-bold mb-2 print-serif-display">
                Vol. {String(new Date(isoDate).getMonth() + 1).padStart(2, '0')} · Issue{' '}
                {String(new Date(isoDate).getDate()).padStart(2, '0')}
              </div>
              <h1 className="print-serif-display text-[44px] print:text-[36px] font-bold leading-[0.92] tracking-tight">
                일일 업무일지 취합본
              </h1>
              <div className="print-serif italic text-[14px] text-slate-700 mt-2">
                A daily ledger of production operations.
              </div>
            </div>
            <div className="text-right print-serif">
              <div className="text-[10px] tracking-[0.2em] uppercase text-slate-500">Edition</div>
              <div className="text-[20px] font-semibold num-mono">{dl.long}</div>
              <div className="text-[12px] text-slate-600 italic mt-0.5">
                {dl.weekday} · Korea Standard Time
              </div>
            </div>
          </div>
          <div className="rule-thick mt-5" style={{ background: '#1E3A8A', height: '4px' }} />
          <div className="border-t border-slate-900 mt-0.5 pt-2 flex items-center justify-between text-[10.5px] tracking-[0.18em] uppercase text-slate-700 font-medium">
            <span>L&K Biomed · Production Dept.</span>
            <span>· Daily Operations Ledger ·</span>
            <span>{aggQuery.data?.rows.length ? `${rows.length} Engineers` : '—'}</span>
          </div>
        </header>

        {/* Summary stats */}
        {aggQuery.data && (
          <div className="grid grid-cols-4 gap-0 mb-7 border border-slate-900 divide-x divide-slate-900">
            <Stat label="Total" value={rows.length} unit="명" />
            <Stat label="Submitted" value={submitted.length} unit="명" />
            <Stat label="Missing" value={missing.length} unit="명" highlight={missing.length > 0} />
            <Stat label="Tasks" value={totalTasks} unit="건" />
          </div>
        )}

        {/* Body */}
        {aggQuery.isLoading ? (
          <p className="print-serif italic text-center py-16 text-slate-500">불러오는 중...</p>
        ) : rows.length === 0 ? (
          <p className="print-serif italic text-center py-16 text-slate-500">대상 사용자가 없습니다.</p>
        ) : (
          <>
            {submitted.map((row) => (
              <UserSection key={row.user.id} row={row} />
            ))}

            {missing.length > 0 && (
              <section className="mt-7">
                <div className="flex items-baseline gap-3 border-b-2 border-slate-900 pb-2 mb-3">
                  <h2 className="print-serif-display text-[22px] font-bold">미제출자</h2>
                  <span className="print-serif italic text-[12px] text-slate-600">
                    Engineers without entries today.
                  </span>
                </div>
                <ul className="print-serif text-[14px] grid grid-cols-2 gap-x-6 gap-y-1 text-rose-800">
                  {missing.map((m) => (
                    <li key={m.user.id} className="flex items-baseline gap-2">
                      <span className="num-mono text-slate-500 text-[12px]">·</span>
                      <span className="font-semibold">{m.user.name}</span>
                      <span className="text-[11px] num-mono text-slate-500">({m.user.employeeNo})</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {/* Footer */}
        <footer className="mt-10 border-t-2 border-slate-900 pt-3 flex items-center justify-between text-[10px] tracking-[0.18em] uppercase text-slate-600">
          <span>L&K Biomed Daily Operations Ledger</span>
          <span className="print-serif italic normal-case tracking-normal">
            — Daily Operations Ledger —
          </span>
          <span className="num-mono">{isoDate}</span>
        </footer>
      </div>
    </div>
  )
}

function UserSection({ row }: { row: AggregationRow }) {
  if (!row.report) return null
  const tasks = row.report.tasks
  return (
    <article className="mb-6 break-inside-avoid">
      <header className="flex items-baseline justify-between border-b-2 border-slate-900 pb-1.5 mb-0">
        <div className="flex items-baseline gap-3">
          <h2 className="print-serif-display text-[22px] font-bold leading-none">{row.user.name}</h2>
          <span className="num-mono text-[11.5px] text-slate-500">({row.user.employeeNo})</span>
          <span className="print-serif italic text-[12px] text-slate-600">{row.user.team}</span>
        </div>
        <div className="text-[10.5px] tracking-[0.18em] uppercase text-slate-700 font-semibold num-mono">
          Hours · {row.report.workHours ?? '—'}
        </div>
      </header>
      <table className="w-full text-[13px] print-serif">
        <thead className="text-[9.5px] tracking-[0.2em] uppercase text-slate-500">
          <tr className="border-b border-slate-300">
            <th className="text-left font-semibold py-1.5 w-12">No.</th>
            <th className="text-left font-semibold py-1.5 w-40">Category</th>
            <th className="text-left font-semibold py-1.5 w-16">Status</th>
            <th className="text-left font-semibold py-1.5">Detail</th>
            <th className="text-left font-semibold py-1.5 w-44">Note</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {tasks.map((t) => (
            <PrintTaskRow key={t.id} t={t} />
          ))}
        </tbody>
      </table>
    </article>
  )
}

function PrintTaskRow({ t }: { t: AggregationTask }) {
  const statusCls = STATUS_BORDER[t.status] ?? 'border-slate-500 text-slate-700'
  return (
    <tr className="align-top">
      <td className="py-2 num-mono text-slate-500">{t.taskNo}</td>
      <td className="py-2 font-semibold text-slate-800">{t.category ?? '—'}</td>
      <td className="py-2">
        <span className={`text-[10.5px] num-mono px-1.5 py-0.5 border ${statusCls}`}>
          {STATUS_LABEL[t.status] ?? t.status} <span className="ml-0.5 text-[9.5px] opacity-70">{STATUS_KOR[t.status] ?? ''}</span>
        </span>
      </td>
      <td className="py-2 leading-relaxed whitespace-pre-line">{t.content}</td>
      <td className="py-2 italic text-rose-800 text-[12px] whitespace-pre-line">
        {t.taskIssue || <span className="not-italic text-slate-400">—</span>}
      </td>
    </tr>
  )
}

function Stat({
  label,
  value,
  unit,
  highlight,
}: {
  label: string
  value: number
  unit?: string
  highlight?: boolean
}) {
  return (
    <div className={`px-5 py-3 ${highlight ? 'bg-rose-50/60' : ''}`}>
      <div className="text-[10px] tracking-[0.2em] uppercase text-slate-500 font-semibold">{label}</div>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <div
          className={`text-[28px] font-bold num-mono leading-none print-serif-display ${
            highlight ? 'text-rose-700' : 'text-slate-900'
          }`}
        >
          {value}
        </div>
        {unit && <div className="text-[11px] text-slate-500 num-mono">{unit}</div>}
      </div>
    </div>
  )
}
