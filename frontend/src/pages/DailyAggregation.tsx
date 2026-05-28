import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { aggregationApi, type AggregationRow } from '../api/aggregation'
import { todayIso } from '../utils/date'

const STATUS_LABEL: Record<string, { ko: string; cls: string }> = {
  COMPLETED: { ko: '완료', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  IN_PROGRESS: { ko: '진행중', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
  ON_HOLD: { ko: '보류', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

function dateLine(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return {
    md: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`,
    w: `${WEEKDAY[d.getDay()]}요일`,
  }
}

type FilterMode = 'all' | 'missing' | 'in_progress' | 'has_issue'

export default function DailyAggregation() {
  const [date, setDate] = useState(todayIso())
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')

  const aggQuery = useQuery({
    queryKey: ['aggregation', 'daily', date],
    queryFn: () => aggregationApi.getDaily(date),
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  })

  const rows = aggQuery.data?.rows ?? []
  const submittedCount = rows.filter((r) => r.report).length
  const totalCount = rows.length
  const missingCount = totalCount - submittedCount
  const totalTasks = rows.reduce((s, r) => s + (r.report?.tasks.length ?? 0), 0)
  const dl = dateLine(date)

  // Filter counts (computed from full rows)
  const inProgressCount = rows.filter((r) => r.report?.tasks.some((t) => t.status === 'IN_PROGRESS')).length
  const issueCount = rows.filter((r) => r.report?.tasks.some((t) => t.taskIssue)).length

  const filteredRows = useMemo(() => {
    switch (filterMode) {
      case 'missing':     return rows.filter((r) => !r.report)
      case 'in_progress': return rows.filter((r) => r.report?.tasks.some((t) => t.status === 'IN_PROGRESS'))
      case 'has_issue':   return rows.filter((r) => r.report?.tasks.some((t) => t.taskIssue))
      default:            return rows
    }
  }, [rows, filterMode])

  const handleDownload = async () => {
    setDownloadError('')
    setDownloading(true)
    try {
      await aggregationApi.downloadExcel(date)
    } catch {
      setDownloadError('엑셀 다운로드 실패')
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => {
    window.open(`/print/aggregation/${date}`, '_blank', 'width=1024,height=768')
  }

  return (
    <div className="px-12 py-10 max-w-[1280px]">
      <header className="mb-8 flex items-end justify-between">
        <div />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-[13px] bg-slate-700 text-slate-100 border border-slate-500 rounded-lg px-3 py-2 num-mono focus:outline-none focus:ring-2 focus:ring-teal-500 [color-scheme:dark]"
          />
          <button
            onClick={handlePrint}
            disabled={rows.length === 0}
            className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-[13px] font-medium text-slate-700 disabled:opacity-40"
          >
            인쇄 미리보기
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading || rows.length === 0}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300 text-[13px] font-medium"
          >
            {downloading ? '다운로드 중...' : '엑셀 다운로드'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <SummaryCard label="대상 인원" value={totalCount} />
        <SummaryCard label="제출" value={submittedCount} accent="emerald" />
        <SummaryCard
          label="미제출"
          value={missingCount}
          accent={missingCount > 0 ? 'rose' : undefined}
        />
        <SummaryCard label="총 업무" value={totalTasks} />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {([
          { key: 'all',         label: '전체',       count: totalCount },
          { key: 'missing',     label: '미제출만',    count: missingCount },
          { key: 'in_progress', label: '진행중 있음', count: inProgressCount },
          { key: 'has_issue',   label: '이슈 있음',   count: issueCount },
        ] as { key: FilterMode; label: string; count: number }[]).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilterMode(key)}
            className={`text-[12px] px-3 py-1.5 rounded-lg border font-semibold transition-colors num-mono ${
              filterMode === key
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {label} <span className="opacity-60 ml-0.5">{count}</span>
          </button>
        ))}
        {filterMode !== 'all' && (
          <span className="text-[12px] text-slate-400 self-center num-mono">
            → {filteredRows.length}명 표시 중
          </span>
        )}
      </div>

      {downloadError && (
        <div className="mb-3 text-[13px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2.5">
          ⚠️ {downloadError}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {aggQuery.isLoading ? (
          <p className="text-[13px] text-slate-400 text-center py-16">불러오는 중...</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-[13px] text-slate-400 text-center py-16">
            {rows.length === 0 ? '대상 사용자가 없습니다.' : '조건에 맞는 항목이 없습니다.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead className="text-[12px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="text-left font-semibold py-3 px-4 w-10">#</th>
                  <th className="text-left font-semibold py-3 px-2 w-36">담당자</th>
                  <th className="text-left font-semibold py-3 px-2 w-28">근무시간</th>
                  <th className="text-left font-semibold py-3 px-2 w-16">NO.</th>
                  <th className="text-left font-semibold py-3 px-2 w-44">업무명</th>
                  <th className="text-left font-semibold py-3 px-2 w-20">상태</th>
                  <th className="text-left font-semibold py-3 px-2">상세업무내용</th>
                  <th className="text-left font-semibold py-3 px-4 w-44">이슈/특이사항</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row, idx) => (
                  <UserBlock key={row.user.id} row={row} idx={idx + 1} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function UserBlock({ row, idx }: { row: AggregationRow; idx: number }) {
  const submitted = !!row.report
  if (!submitted) {
    return (
      <tr style={{ background: 'rgba(248,113,113,0.08)', borderLeft: '3px solid var(--v2-state-danger)' }}>
        <td className="px-4 py-3 num-mono" style={{ color: 'var(--v2-ink-muted)' }}>{idx}</td>
        <td className="px-2 py-3">
          <div className="font-bold" style={{ color: 'var(--v2-ink)' }}>{row.user.name}</div>
          <div className="text-[11px] num-mono" style={{ color: 'var(--v2-ink-faint)' }}>{row.user.employeeNo}</div>
        </td>
        <td colSpan={6} className="px-2 py-3">
          <span className="font-bold text-[13px] tracking-wide" style={{ color: 'var(--v2-state-danger)', fontFamily: 'var(--v2-font-mono)' }}>
            ▲ 미제출
          </span>
        </td>
      </tr>
    )
  }
  const tasks = row.report!.tasks
  const rowSpan = Math.max(tasks.length, 1)

  return (
    <>
      {tasks.map((t, i) => {
        const status = STATUS_LABEL[t.status]
        return (
          <tr key={t.id} className="align-top hover:bg-slate-50/40">
            {i === 0 && (
              <>
                <td rowSpan={rowSpan} className="px-4 py-3 text-slate-400 num-mono border-r border-slate-100">
                  {idx}
                </td>
                <td rowSpan={rowSpan} className="px-2 py-3 border-r border-slate-100">
                  <div className="font-medium text-slate-800">{row.user.name}</div>
                  <div className="text-[11px] text-slate-400 num-mono">{row.user.employeeNo}</div>
                </td>
                <td rowSpan={rowSpan} className="px-2 py-3 text-slate-600 text-[13px] num-mono border-r border-slate-100">
                  {row.report!.workHours || '—'}
                </td>
              </>
            )}
            <td className="px-2 py-2.5 text-slate-500 num-mono text-[13px]">{t.taskNo}</td>
            <td className="px-2 py-2.5">
              {t.category ? (
                <span className="text-[12px] uppercase tracking-wider text-indigo-600 font-semibold">
                  {t.category}
                </span>
              ) : (
                <span className="text-slate-300">—</span>
              )}
            </td>
            <td className="px-2 py-2.5">
              {status && (
                <span
                  className={`text-[12px] px-2 py-0.5 rounded-md border font-medium ${status.cls}`}
                >
                  {status.ko}
                </span>
              )}
            </td>
            <td className="px-2 py-2.5 text-slate-700 whitespace-pre-line leading-relaxed">
              {t.content}
            </td>
            <td className="px-4 py-2.5 text-[13px] text-rose-700 whitespace-pre-line">
              {t.taskIssue || <span className="text-slate-300">—</span>}
            </td>
          </tr>
        )
      })}
    </>
  )
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'emerald' | 'rose'
}) {
  const accentCls =
    accent === 'emerald'
      ? 'text-emerald-700'
      : accent === 'rose'
      ? 'text-rose-700'
      : 'text-slate-900'
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="text-[12px] uppercase tracking-wider text-slate-500 font-medium">{label}</div>
      <div className={`text-[28px] font-bold mt-1 num-mono ${accentCls}`}>{value}</div>
    </div>
  )
}
