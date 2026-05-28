// Paste preview table — shows parsed days with per-day save buttons
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ParsedDay } from '../api/paste'
import { reportsApi, type WorkTaskDto, type TaskStatus } from '../api/reports'

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

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function parsedToDto(day: ParsedDay) {
  const tasks: WorkTaskDto[] = day.tasks.map(t => ({
    taskNo: t.taskNo,
    category: t.category ?? null,
    content: t.content,
    status: (t.status ?? 'COMPLETED') as TaskStatus,
    taskIssue: t.taskIssue ?? null,
    extractedLots: t.extractedLots,
    extractedQtys: t.extractedQtys,
  }))
  return {
    reportDate: day.reportDate,
    workHours: day.workHours,
    inputMethod: 'PASTE' as const,
    status: 'SUBMITTED' as const,
    tasks,
  }
}

interface Props {
  days: ParsedDay[]
}

export default function PastePreviewTable({ days }: Props) {
  const qc = useQueryClient()
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({})

  async function saveDay(day: ParsedDay) {
    setSaveStatus(s => ({ ...s, [day.reportDate]: 'saving' }))
    try {
      await reportsApi.upsert(parsedToDto(day))
      setSaveStatus(s => ({ ...s, [day.reportDate]: 'saved' }))
      qc.invalidateQueries({ queryKey: ['reports'] })
    } catch {
      setSaveStatus(s => ({ ...s, [day.reportDate]: 'error' }))
    }
  }

  const sorted = [...days].sort((a, b) => a.reportDate.localeCompare(b.reportDate))

  if (!sorted.length) return null

  return (
    <div className="overflow-x-auto">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['작성일', '근무시간', '업무명', 'No.', '업무진행상태', '상세업무내용', '이슈/특이사항', '저장'].map(h => (
              <th key={h} style={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.flatMap(day => {
            const tasks = day.tasks
            const status = saveStatus[day.reportDate] ?? 'idle'
            if (!tasks.length) return []
            return tasks.map((task, i) => (
              <tr key={`${day.reportDate}-${i}`} style={{ background: i % 2 === 0 ? 'var(--v2-paper)' : 'var(--v2-cream)' }}>
                {i === 0 && (
                  <td rowSpan={tasks.length} style={{ ...TD, textAlign: 'center', fontFamily: 'var(--v2-font-mono)', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {day.reportDate}
                  </td>
                )}
                {i === 0 && (
                  <td rowSpan={tasks.length} style={{ ...TD, textAlign: 'center', fontFamily: 'var(--v2-font-mono)', fontSize: '11px', color: 'var(--v2-ink-muted)', whiteSpace: 'nowrap' }}>
                    {day.workHours ?? '—'}
                  </td>
                )}
                <td style={TD}>{task.category ?? '—'}</td>
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
                {i === 0 && (
                  <td rowSpan={tasks.length} style={{ ...TD, textAlign: 'center', whiteSpace: 'nowrap', minWidth: '80px' }}>
                    <SaveBtn status={status} onClick={() => saveDay(day)} />
                  </td>
                )}
              </tr>
            ))
          })}
        </tbody>
      </table>
    </div>
  )
}

function SaveBtn({ status, onClick }: { status: SaveStatus; onClick: () => void }) {
  if (status === 'saved') {
    return (
      <span style={{ color: 'var(--v2-state-done)', fontFamily: 'var(--v2-font-mono)', fontSize: '11px', fontWeight: 700 }}>
        ✓ 저장됨
      </span>
    )
  }
  if (status === 'error') {
    return (
      <button
        onClick={onClick}
        style={{ color: 'var(--v2-state-danger)', fontFamily: 'var(--v2-font-mono)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none' }}
      >재시도 →</button>
    )
  }
  return (
    <button
      disabled={status === 'saving'}
      onClick={onClick}
      style={{
        padding: '4px 12px', borderRadius: '2px', cursor: status === 'saving' ? 'not-allowed' : 'pointer',
        background: status === 'saving' ? 'var(--v2-ink-faint)' : 'var(--v2-accent)',
        color: 'var(--v2-cream)', fontFamily: 'var(--v2-font-mono)', fontSize: '11px',
        fontWeight: 700, border: 'none', transition: 'background 0.15s',
      }}
    >
      {status === 'saving' ? '저장 중…' : '저장 →'}
    </button>
  )
}
