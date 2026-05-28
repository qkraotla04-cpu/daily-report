// PersonalStats — weekly & monthly submission stats with drill-down detail
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi, type DailyReportFromServer } from '../api/reports'
import { dateToIso, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from '../utils/date'

type DetailKey = 'week-dates' | 'week-tasks' | 'month-dates' | 'month-tasks' | null

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  COMPLETED:   { label: '완료',   bg: 'rgba(52,211,153,0.22)', color: 'var(--v2-state-done)' },
  IN_PROGRESS: { label: '진행중', bg: 'rgba(251,191,36,0.28)',  color: 'var(--v2-state-wait)' },
  ON_HOLD:     { label: '보류',   bg: 'rgba(232,241,255,0.10)', color: 'var(--v2-ink-muted)'  },
}

function fmtDate(iso: string) { return iso.slice(0, 10) }

function TaskTable({ reports }: { reports: DailyReportFromServer[] }) {
  const sorted = [...reports].sort((a, b) => a.reportDate.localeCompare(b.reportDate))
  const TD: React.CSSProperties = { border: '1px solid var(--v2-line)', padding: '7px 10px', color: 'var(--v2-ink)', verticalAlign: 'middle', fontSize: '12px' }
  return (
    <div style={{ overflowX: 'auto', maxHeight: '55vh', overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['작성일', '근무시간', '업무명', 'No.', '진행상태', '상세업무내용', '이슈'].map(h => (
              <th key={h} style={{ background: 'var(--v2-paper-warm)', border: '1px solid var(--v2-line)', padding: '8px 10px', fontFamily: 'var(--v2-font-mono)', fontSize: '9px', letterSpacing: '0.12em', color: 'var(--v2-ink-muted)', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'center', position: 'sticky', top: 0, zIndex: 1 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.flatMap(r => r.tasks.map((t, i) => (
            <tr key={`${r.id}-${t.id}`}>
              {i === 0 && <td rowSpan={r.tasks.length} style={{ ...TD, textAlign: 'center', fontFamily: 'var(--v2-font-mono)', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtDate(r.reportDate)}</td>}
              {i === 0 && <td rowSpan={r.tasks.length} style={{ ...TD, textAlign: 'center', fontFamily: 'var(--v2-font-mono)', fontSize: '11px', color: 'var(--v2-ink-muted)', whiteSpace: 'nowrap' }}>{r.workHours ?? '—'}</td>}
              <td style={TD}>{t.category ?? '—'}</td>
              <td style={{ ...TD, textAlign: 'center', fontFamily: 'var(--v2-font-mono)' }}>{t.taskNo}</td>
              <td style={{ ...TD, textAlign: 'center' }}>
                {t.status && <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 2, background: STATUS_STYLE[t.status]?.bg, color: STATUS_STYLE[t.status]?.color, fontFamily: 'var(--v2-font-mono)', fontSize: '10px', fontWeight: 700 }}>{STATUS_STYLE[t.status]?.label}</span>}
              </td>
              <td style={{ ...TD, whiteSpace: 'pre-wrap', minWidth: 160, maxWidth: 300 }}>{t.content}</td>
              <td style={{ ...TD, fontSize: '11px', color: t.taskIssue ? 'var(--v2-state-danger)' : 'var(--v2-ink-faint)', minWidth: 80 }}>{t.taskIssue || '—'}</td>
            </tr>
          )))}
        </tbody>
      </table>
    </div>
  )
}

function DateList({ reports }: { reports: DailyReportFromServer[] }) {
  const sorted = [...reports].sort((a, b) => a.reportDate.localeCompare(b.reportDate))
  return (
    <div className="space-y-1.5">
      {sorted.map(r => {
        const completed = r.tasks.filter(t => t.status === 'COMPLETED').length
        const inProgress = r.tasks.filter(t => t.status === 'IN_PROGRESS').length
        return (
          <div key={r.id} className="flex items-center gap-4 px-4 py-2.5 rounded" style={{ background: 'var(--v2-paper-warm)', border: '1px solid var(--v2-line)' }}>
            <span className="font-mono text-[12px] font-bold" style={{ color: 'var(--v2-accent)', minWidth: 90 }}>{fmtDate(r.reportDate)}</span>
            <span className="font-mono text-[11px]" style={{ color: 'var(--v2-ink-muted)', minWidth: 100 }}>{r.workHours ?? '—'}</span>
            <span className="font-mono text-[11px]" style={{ color: 'var(--v2-ink)' }}>업무 <strong>{r.tasks.length}건</strong></span>
            {completed > 0 && <span className="font-mono text-[10px]" style={{ color: 'var(--v2-state-done)' }}>완료 {completed}</span>}
            {inProgress > 0 && <span className="font-mono text-[10px]" style={{ color: 'var(--v2-state-wait)' }}>진행중 {inProgress}</span>}
          </div>
        )
      })}
      {sorted.length === 0 && <p className="text-center py-6 font-mono text-[12px]" style={{ color: 'var(--v2-ink-faint)' }}>제출된 일지가 없습니다.</p>}
    </div>
  )
}

interface Props { compact?: boolean }

export default function PersonalStats({ compact }: Props) {
  const [detail, setDetail] = useState<DetailKey>(null)
  const now = new Date()

  const weekStart = dateToIso(startOfWeek(now))
  const weekEnd   = dateToIso(endOfWeek(now))
  const monthStart = dateToIso(startOfMonth(now))
  const monthEnd   = dateToIso(endOfMonth(now))

  const weekQ = useQuery({
    queryKey: ['reports', 'me', 'history', weekStart, weekEnd],
    queryFn: () => reportsApi.getMyHistory(weekStart, weekEnd),
  })
  const monthQ = useQuery({
    queryKey: ['reports', 'me', 'history', monthStart, monthEnd],
    queryFn: () => reportsApi.getMyHistory(monthStart, monthEnd),
  })

  const weekReports  = weekQ.data ?? []
  const monthReports = monthQ.data ?? []
  const weekTasks  = useMemo(() => weekReports.reduce((s, r)  => s + r.tasks.length, 0), [weekReports])
  const monthTasks = useMemo(() => monthReports.reduce((s, r) => s + r.tasks.length, 0), [monthReports])

  const toggle = (k: DetailKey) => setDetail(d => d === k ? null : k)

  const detailReports = detail?.startsWith('week') ? weekReports : monthReports
  const showTable = detail === 'week-tasks' || detail === 'month-tasks'
  const DETAIL_TITLE: Record<string, string> = {
    'week-dates': '이번 주 제출일 목록', 'week-tasks': '이번 주 전체 업무',
    'month-dates': '이번 달 제출일 목록', 'month-tasks': '이번 달 전체 업무',
  }
  const detailTitle = detail ? DETAIL_TITLE[detail] : ''

  const cols = compact ? 'grid-cols-4' : 'grid-cols-4'

  return (
    <div>
      {/* Stat boxes */}
      <div className={`relative border-[1.5px] grid ${cols}`} style={{ borderColor: 'var(--v2-ink)', background: 'var(--v2-paper)' }}>
        <div style={{ position: 'absolute', top: -8, left: 16, background: 'var(--v2-cream)', padding: '0 8px', fontFamily: 'var(--v2-font-mono)', fontSize: 8, letterSpacing: '0.22em', color: 'var(--v2-ink-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
          PERSONAL · METRICS
        </div>
        {[
          { key: 'week-dates' as DetailKey, label: '이번주 제출일', value: weekReports.length, unit: '일', color: 'var(--v2-accent)' },
          { key: 'week-tasks' as DetailKey, label: '이번주 업무',   value: weekTasks,           unit: '건', color: 'var(--v2-state-done)' },
          { key: 'month-dates' as DetailKey, label: '이번달 제출일', value: monthReports.length, unit: '일', color: 'var(--v2-accent)' },
          { key: 'month-tasks' as DetailKey, label: '이번달 업무',  value: monthTasks,          unit: '건', color: 'var(--v2-state-done)' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => toggle(s.key)}
            className="p-4 border-r border-line last:border-r-0 text-left transition-colors hover:bg-paper-warm"
            style={{ background: detail === s.key ? 'var(--v2-accent-soft)' : undefined, cursor: 'pointer', border: 'none', borderRight: '1px solid var(--v2-line)' }}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold mb-1.5" style={{ color: detail === s.key ? 'var(--v2-accent)' : 'var(--v2-ink-faint)' }}>
              {s.label} {detail === s.key ? '▲' : '▼'}
            </div>
            <div className="num-mono leading-none text-[28px]" style={{ color: s.color, fontWeight: 900, letterSpacing: '-0.03em' }}>
              {s.value}<span className="font-mono text-[11px] text-ink-faint ml-1">{s.unit}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {detail && (
        <div className="border-[1.5px] border-t-0 p-5" style={{ borderColor: 'var(--v2-ink)', background: 'var(--v2-paper)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--v2-accent)' }}>{detailTitle}</span>
            <button onClick={() => setDetail(null)} className="font-mono text-[10px]" style={{ color: 'var(--v2-ink-faint)', background: 'none', border: 'none', cursor: 'pointer' }}>닫기 ✕</button>
          </div>
          {showTable ? <TaskTable reports={detailReports} /> : <DateList reports={detailReports} />}
        </div>
      )}
    </div>
  )
}
