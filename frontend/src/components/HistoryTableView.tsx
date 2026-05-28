// History table view — shows monthly reports in Excel-like table format
import type { DailyReportFromServer } from '../api/reports'

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  COMPLETED:   { label: '완료',   bg: 'rgba(52,211,153,0.22)', color: 'var(--v2-state-done)' },
  IN_PROGRESS: { label: '진행중', bg: 'rgba(251,191,36,0.28)',  color: 'var(--v2-state-wait)' },
  ON_HOLD:     { label: '보류',   bg: 'rgba(232,241,255,0.10)', color: 'var(--v2-ink-muted)'  },
}

const TH: React.CSSProperties = {
  background: 'var(--v2-paper-warm)',
  border: '1px solid var(--v2-line)',
  padding: '9px 12px',
  fontFamily: 'var(--v2-font-mono)',
  fontSize: '10px',
  letterSpacing: '0.12em',
  color: 'var(--v2-ink-muted)',
  fontWeight: 700,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  textAlign: 'center',
  position: 'sticky',
  top: 0,
  zIndex: 1,
}

const TD: React.CSSProperties = {
  border: '1px solid var(--v2-line)',
  padding: '8px 12px',
  color: 'var(--v2-ink)',
  verticalAlign: 'middle',
  fontSize: '13px',
}

interface Props {
  reports: DailyReportFromServer[]
  cursor: Date
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  submitCount: number
}

export default function HistoryTableView({ reports, cursor, onPrev, onNext, onToday, submitCount }: Props) {
  const sorted = [...reports].sort(
    (a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()
  )

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1.5px solid var(--v2-line)' }}>
        <button
          onClick={onPrev}
          className="px-3 py-1.5 text-[13px] rounded-lg"
          style={{ color: 'var(--v2-ink-muted)' }}
        >← 이전달</button>
        <div className="flex items-center gap-3">
          <h3 className="text-[18px] font-bold tracking-tight num-mono" style={{ color: 'var(--v2-ink)' }}>
            {cursor.getFullYear()}.{String(cursor.getMonth() + 1).padStart(2, '0')}
          </h3>
          <button
            onClick={onToday}
            className="text-[11px] px-2.5 py-0.5 rounded-md font-medium"
            style={{ background: 'var(--v2-accent-soft)', color: 'var(--v2-accent)', border: '1px solid transparent' }}
          >오늘</button>
          <span className="font-mono text-[11px]" style={{ color: 'var(--v2-ink-faint)' }}>
            {submitCount}일 제출
          </span>
        </div>
        <button
          onClick={onNext}
          className="px-3 py-1.5 text-[13px] rounded-lg"
          style={{ color: 'var(--v2-ink-muted)' }}
        >다음달 →</button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 font-mono text-[13px]" style={{ color: 'var(--v2-ink-faint)' }}>
          이 달에 제출된 일지가 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['작성일', '근무시간', '업무명', 'No.', '업무진행상태', '상세업무내용', '이슈/특이사항'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.flatMap(report => {
                const tasks = report.tasks
                if (!tasks.length) return []
                return tasks.map((task, i) => (
                  <tr key={`${report.id}-${task.id}`} style={{ background: i % 2 === 0 ? 'var(--v2-paper)' : 'var(--v2-cream)' }}>
                    {i === 0 && (
                      <td rowSpan={tasks.length} style={{ ...TD, textAlign: 'center', fontFamily: 'var(--v2-font-mono)', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {report.reportDate.slice(0, 10)}
                      </td>
                    )}
                    {i === 0 && (
                      <td rowSpan={tasks.length} style={{ ...TD, textAlign: 'center', fontFamily: 'var(--v2-font-mono)', fontSize: '11px', color: 'var(--v2-ink-muted)', whiteSpace: 'nowrap' }}>
                        {report.workHours ?? '—'}
                      </td>
                    )}
                    <td style={{ ...TD }}>{task.category ?? '—'}</td>
                    <td style={{ ...TD, textAlign: 'center', fontFamily: 'var(--v2-font-mono)', fontSize: '12px', color: 'var(--v2-ink-muted)' }}>{task.taskNo}</td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      {task.status && (
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: '2px',
                          background: STATUS_STYLE[task.status]?.bg ?? 'transparent',
                          color: STATUS_STYLE[task.status]?.color ?? 'var(--v2-ink)',
                          fontFamily: 'var(--v2-font-mono)', fontSize: '11px', fontWeight: 700,
                        }}>
                          {STATUS_STYLE[task.status]?.label ?? task.status}
                        </span>
                      )}
                    </td>
                    <td style={{ ...TD, whiteSpace: 'pre-wrap', minWidth: '180px', maxWidth: '340px' }}>{task.content}</td>
                    <td style={{ ...TD, fontSize: '12px', minWidth: '100px',
                      color: task.taskIssue ? 'var(--v2-state-danger)' : 'var(--v2-ink-faint)' }}>
                      {task.taskIssue || '—'}
                    </td>
                  </tr>
                ))
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
