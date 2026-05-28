// DirectEntryForm — Blueprint theme, enriched direct entry
// Fields: date, workHours (presets), tasks (NO / category / status toggle / content / issue / lot / qty)

import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { reportsApi, type WorkTaskDto, type TaskStatus } from '../api/reports'
import { todayIso } from '../utils/date'

interface DraftTask extends Omit<WorkTaskDto, 'taskNo'> {
  taskNo: string
  _id: number
  lotInput: string   // comma-separated LOT numbers for manual entry
  qtyInput: string   // comma-separated quantities for manual entry
}

let _seq = 0
const nextId = () => ++_seq

const STATUS_OPTIONS: { value: TaskStatus; label: string; shortLabel: string; cls: string; activeCls: string }[] = [
  {
    value: 'COMPLETED',
    label: '완료',
    shortLabel: '완료',
    cls: 'border-[1.5px] border-line text-ink-muted',
    activeCls: 'border-[1.5px] border-[var(--v2-state-done)] bg-[rgba(52,211,153,0.14)] text-[var(--v2-state-done)] font-bold',
  },
  {
    value: 'IN_PROGRESS',
    label: '진행중',
    shortLabel: '진행',
    cls: 'border-[1.5px] border-line text-ink-muted',
    activeCls: 'border-[1.5px] border-accent bg-accent-soft text-accent font-bold',
  },
  {
    value: 'ON_HOLD',
    label: '보류',
    shortLabel: '보류',
    cls: 'border-[1.5px] border-line text-ink-muted',
    activeCls: 'border-[1.5px] border-[var(--v2-state-wait)] bg-[rgba(251,191,36,0.14)] text-[var(--v2-state-wait)] font-bold',
  },
]

const WORK_HOURS_PRESETS = ['8:00~17:00', '8:00~18:00', '8:00~19:00', '8:00~20:00']

const newDraft = (taskNo: string): DraftTask => ({
  _id: nextId(),
  taskNo,
  category: '',
  content: '',
  status: 'IN_PROGRESS',
  taskIssue: '',
  extractedLots: [],
  extractedQtys: [],
  lotInput: '',
  qtyInput: '',
})

// Parse comma/space-separated input into array
const parseTokens = (raw: string): string[] =>
  raw.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)

const inputBase =
  'w-full font-sans text-[13px] text-ink bg-paper border-[1.5px] border-line px-3 py-2 transition-colors placeholder:text-ink-faint focus:border-accent focus:outline-none'

export default function DirectEntryForm() {
  const qc = useQueryClient()
  const [reportDate, setReportDate] = useState(todayIso())
  const [workHours, setWorkHours] = useState('8:00~17:00')
  const [tasks, setTasks] = useState<DraftTask[]>([newDraft('1')])
  const [submitMsg, setSubmitMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  // Autocomplete: past categories from this month
  const recentQuery = useQuery({
    queryKey: ['reports', 'me', 'recent-categories'],
    queryFn: async () => {
      const today = new Date()
      const from = new Date(today.getFullYear(), today.getMonth(), 1)
      const fromIso = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-01`
      const reports = await reportsApi.getMyHistory(fromIso, todayIso())
      const set = new Set<string>()
      reports.forEach((r) => r.tasks.forEach((t) => t.category && set.add(t.category)))
      return Array.from(set).sort()
    },
  })
  const categorySuggestions = recentQuery.data ?? []

  const submitMutation = useMutation({
    mutationFn: () =>
      reportsApi.upsert({
        reportDate,
        workHours,
        inputMethod: 'FORM',
        status: 'SUBMITTED',
        tasks: tasks
          .filter((t) => t.content.trim())
          .map((t) => ({
            taskNo: t.taskNo,
            category: t.category || null,
            content: t.content,
            status: t.status,
            taskIssue: t.taskIssue || null,
            extractedLots: parseTokens(t.lotInput),
            extractedQtys: parseTokens(t.qtyInput),
          })),
      }),
    onSuccess: () => {
      setSubmitMsg({ kind: 'ok', text: '저장되었습니다.' })
      qc.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: (err: AxiosError<{ error: { message: string } }>) => {
      setSubmitMsg({
        kind: 'err',
        text: err.response?.data?.error?.message || '저장에 실패했습니다.',
      })
    },
  })

  const validTasks = useMemo(() => tasks.filter((t) => t.content.trim()), [tasks])
  const countByStatus = useMemo(
    () => ({
      COMPLETED: validTasks.filter((t) => t.status === 'COMPLETED').length,
      IN_PROGRESS: validTasks.filter((t) => t.status === 'IN_PROGRESS').length,
      ON_HOLD: validTasks.filter((t) => t.status === 'ON_HOLD').length,
    }),
    [validTasks]
  )

  const updateTask = (id: number, patch: Partial<DraftTask>) =>
    setTasks((prev) => prev.map((t) => (t._id === id ? { ...t, ...patch } : t)))
  const removeTask = (id: number) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t._id !== id)
      return next.map((t, i) => ({ ...t, taskNo: String(i + 1) }))
    })
  }
  const addTask = () => {
    const nextNo = String(tasks.length + 1)
    setTasks((prev) => [...prev, newDraft(nextNo)])
    setSubmitMsg(null)
  }

  return (
    <div className="space-y-4">
      <datalist id="category-suggestions">
        {categorySuggestions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {/* ── Meta: date + work hours ── */}
      <section className="bg-paper border-[1.5px] border-ink p-5" style={{ borderRadius: '3px' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Date */}
          <BpField label="작성일">
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className={`${inputBase} num-mono`}
              style={{ borderRadius: '2px' }}
            />
          </BpField>

          {/* Work hours + presets */}
          <BpField label="근무시간">
            <input
              type="text"
              value={workHours}
              onChange={(e) => setWorkHours(e.target.value)}
              placeholder="8:00~17:00"
              className={`${inputBase} num-mono mb-2`}
              style={{ borderRadius: '2px' }}
            />
            <div className="flex flex-wrap gap-1.5">
              {WORK_HOURS_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setWorkHours(p)}
                  className={`text-[10px] font-mono px-2 py-1 uppercase tracking-wider transition-colors border-[1.5px] ${
                    workHours === p
                      ? 'bg-ink text-paper border-ink'
                      : 'bg-paper-warm text-ink-muted border-line hover:border-ink hover:text-ink'
                  }`}
                  style={{ borderRadius: '2px' }}
                >
                  {p}
                </button>
              ))}
            </div>
          </BpField>
        </div>
      </section>

      {/* ── Tasks ── */}
      <section className="bg-paper border-[1.5px] border-ink overflow-hidden" style={{ borderRadius: '3px' }}>
        {/* Section header */}
        <div className="px-5 py-3 border-b-[1.5px] border-ink bg-paper-warm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink font-bold">
              업무 항목
            </span>
            <span className="font-mono text-[11px] text-ink-muted num-mono">
              {tasks.length}개 입력
            </span>
          </div>
          <button
            onClick={addTask}
            className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1.5 border-[1.5px] border-accent text-accent hover:bg-accent hover:text-white transition-colors"
            style={{ borderRadius: '2px' }}
          >
            + 업무 추가
          </button>
        </div>

        {/* Task list */}
        <div className="divide-y-[1.5px] divide-line">
          {tasks.map((t, idx) => (
            <TaskCard
              key={t._id}
              task={t}
              idx={idx}
              totalCount={tasks.length}
              onUpdate={(patch) => updateTask(t._id, patch)}
              onRemove={() => removeTask(t._id)}
            />
          ))}
        </div>
      </section>

      {/* ── Status summary bar ── */}
      <div
        className="bg-paper border-[1.5px] border-line px-5 py-3 flex items-center gap-5"
        style={{ borderRadius: '2px' }}
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint mr-1">
          Summary
        </span>
        <SummaryChip label="완료" count={countByStatus.COMPLETED} color="var(--v2-state-done)" bg="rgba(52,211,153,0.12)" />
        <SummaryChip label="진행중" count={countByStatus.IN_PROGRESS} color="var(--v2-accent)" bg="var(--v2-accent-soft)" />
        <SummaryChip label="보류" count={countByStatus.ON_HOLD} color="var(--v2-state-wait)" bg="rgba(251,191,36,0.12)" />
        <div className="ml-auto font-mono text-[11px] text-ink-muted num-mono">
          유효&nbsp;
          <span className="text-ink font-bold">{validTasks.length}</span>
          &nbsp;/&nbsp;{tasks.length}개
        </div>
      </div>

      {/* ── Submit row ── */}
      <div className="flex items-center justify-between gap-4">
        {submitMsg ? (
          <div
            className={`flex-1 text-[12.5px] px-4 py-2.5 border-[1.5px] font-mono ${
              submitMsg.kind === 'ok'
                ? 'bg-[rgba(52,211,153,0.12)] text-[var(--v2-state-done)] border-[var(--v2-state-done)]'
                : 'bg-accent-soft text-accent border-accent'
            }`}
            style={{ borderRadius: '2px' }}
          >
            {submitMsg.kind === 'ok' ? '✓ ' : '✕ '}
            {submitMsg.text}
          </div>
        ) : (
          <div />
        )}
        <button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending || validTasks.length === 0}
          className="px-6 py-2.5 bg-accent text-white hover:bg-accent-deep disabled:bg-ink-faint disabled:cursor-not-allowed font-bold text-[13px] tracking-[0.08em] uppercase border-[1.5px] border-accent hover:border-accent-deep disabled:border-ink-faint transition-colors"
          style={{ borderRadius: '2px' }}
        >
          {submitMutation.isPending ? '저장 중…' : '제출 →'}
        </button>
      </div>
    </div>
  )
}

// ── TaskCard ──────────────────────────────────────────────────────
function TaskCard({
  task,
  idx,
  totalCount,
  onUpdate,
  onRemove,
}: {
  task: DraftTask
  idx: number
  totalCount: number
  onUpdate: (patch: Partial<DraftTask>) => void
  onRemove: () => void
}) {
  const [showLot, setShowLot] = useState(!!(task.lotInput || task.qtyInput))

  return (
    <div className="px-5 py-4 bg-paper relative">
      {/* Left accent bar by status */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{
          background:
            task.status === 'COMPLETED'
              ? 'var(--v2-state-done)'
              : task.status === 'IN_PROGRESS'
              ? 'var(--v2-accent)'
              : 'var(--v2-state-wait)',
        }}
      />

      {/* Row 1: NO + category + status toggle + delete */}
      <div className="flex items-center gap-2 mb-2.5">
        {/* Task number */}
        <div
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-ink text-paper font-mono font-bold text-[12px]"
          style={{ borderRadius: '2px' }}
        >
          {String(idx + 1).padStart(2, '0')}
        </div>

        {/* Category */}
        <input
          type="text"
          value={task.category ?? ''}
          onChange={(e) => onUpdate({ category: e.target.value })}
          list="category-suggestions"
          placeholder="업무명 (예: 입·출고 관련업무)"
          className="flex-1 font-sans text-[13px] text-ink bg-paper-warm border-[1.5px] border-line px-3 py-1.5 placeholder:text-ink-faint focus:border-accent focus:outline-none transition-colors"
          style={{ borderRadius: '2px' }}
        />

        {/* Status toggle */}
        <div className="flex flex-shrink-0">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => onUpdate({ status: s.value })}
              className={`px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors -ml-[1.5px] first:ml-0 ${
                task.status === s.value ? s.activeCls : s.cls + ' bg-paper'
              }`}
              style={{ borderRadius: '0px' }}
            >
              {s.shortLabel}
            </button>
          ))}
        </div>

        {/* Delete */}
        <button
          onClick={onRemove}
          disabled={totalCount <= 1}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-ink-faint hover:text-accent disabled:opacity-20 font-bold text-[16px] transition-colors"
          title="삭제"
        >
          ×
        </button>
      </div>

      {/* Row 2: content */}
      <textarea
        value={task.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        rows={2}
        placeholder="상세 업무 내용을 입력하세요"
        className="w-full font-sans text-[13px] text-ink bg-paper border-[1.5px] border-line px-3 py-2 resize-y placeholder:text-ink-faint focus:border-accent focus:outline-none transition-colors leading-relaxed mb-2"
        style={{ borderRadius: '2px' }}
      />

      {/* Row 3: issue */}
      <input
        type="text"
        value={task.taskIssue ?? ''}
        onChange={(e) => onUpdate({ taskIssue: e.target.value })}
        placeholder="이슈 / 특이사항 (선택)"
        className="w-full font-sans text-[12px] text-ink bg-paper border-[1.5px] border-line px-3 py-1.5 placeholder:text-ink-faint focus:border-accent focus:outline-none transition-colors"
        style={{ borderRadius: '2px' }}
      />

      {/* Row 4: LOT / 수량 (expandable) */}
      <div className="mt-2">
        <button
          onClick={() => setShowLot(!showLot)}
          className="text-[10px] font-mono uppercase tracking-[0.14em] text-ink-faint hover:text-accent transition-colors flex items-center gap-1.5"
        >
          <span
            className="inline-block w-3 h-3 border-[1.5px] border-current flex items-center justify-center text-[8px] font-bold"
            style={{ borderRadius: '1px' }}
          >
            {showLot ? '−' : '+'}
          </span>
          LOT / 수량 입력
        </button>
        {showLot && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint mb-1">
                LOT 번호 (쉼표/공백 구분)
              </label>
              <input
                type="text"
                value={task.lotInput}
                onChange={(e) => onUpdate({ lotInput: e.target.value })}
                placeholder="예: 2024-001, 2024-002"
                className="w-full font-mono text-[12px] text-ink bg-paper border-[1.5px] border-line px-3 py-1.5 placeholder:text-ink-faint focus:border-accent focus:outline-none transition-colors"
                style={{ borderRadius: '2px' }}
              />
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint mb-1">
                수량 (쉼표/공백 구분)
              </label>
              <input
                type="text"
                value={task.qtyInput}
                onChange={(e) => onUpdate({ qtyInput: e.target.value })}
                placeholder="예: 100ea, 50ea"
                className="w-full font-mono text-[12px] text-ink bg-paper border-[1.5px] border-line px-3 py-1.5 placeholder:text-ink-faint focus:border-accent focus:outline-none transition-colors"
                style={{ borderRadius: '2px' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── SummaryChip ───────────────────────────────────────────────────
function SummaryChip({
  label,
  count,
  color,
  bg,
}: {
  label: string
  count: number
  color: string
  bg: string
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 border-[1.5px] font-mono text-[10px] uppercase tracking-[0.1em]"
      style={{ borderColor: color, background: bg, color, borderRadius: '2px' }}
    >
      <span className="font-bold num-mono text-[12px]">{count}</span>
      {label}
    </div>
  )
}

// ── BpField ───────────────────────────────────────────────────────
function BpField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted font-bold mb-2">
        {label}
      </label>
      {children}
    </div>
  )
}
