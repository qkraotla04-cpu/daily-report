import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { pasteApi, type ParsedDay, type ParsedTask } from '../api/paste'
import { todayIso } from '../utils/date'
import PasteDropzone from '../components/PasteDropzone'
import DirectEntryForm from '../components/DirectEntryForm'

type Tab = 'PASTE' | 'FORM'

const STATUS_LABEL: Record<string, { ko: string; cls: string }> = {
  COMPLETED:   { ko: '완료',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  IN_PROGRESS: { ko: '진행중', cls: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  ON_HOLD:     { ko: '보류',   cls: 'bg-paper-warm text-ink-muted border-line' },
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

function dateLine(iso: string): { md: string; w: string } {
  const d = new Date(iso + 'T00:00:00')
  const md = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  return { md, w: `${WEEKDAY[d.getDay()]}요일` }
}

export default function DailyReport() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('PASTE')
  const [days, setDays] = useState<ParsedDay[]>([])
  const [parseError, setParseError] = useState('')
  const [submitMsg, setSubmitMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const previewMutation = useMutation({
    mutationFn: (text: string) => pasteApi.preview(text),
    onSuccess: (parsed) => {
      setParseError('')
      setSubmitMsg(null)
      setDays(parsed.days)
    },
    onError: (err: AxiosError<{ error: { message: string } }>) => {
      setParseError(err.response?.data?.error?.message || '파싱에 실패했습니다.')
      setDays([])
    },
  })

  const submitMutation = useMutation({
    mutationFn: (text: string) => pasteApi.submit(text),
    onSuccess: (res) => {
      setSubmitMsg({ kind: 'ok', text: `${res.saved}건의 일지가 저장되었습니다.` })
      // Dashboard의 '오늘 현황' 카드가 즉시 갱신되도록 캐시 무효화
      qc.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: (err: AxiosError<{ error: { message: string } }>) => {
      setSubmitMsg({
        kind: 'err',
        text: err.response?.data?.error?.message || '저장에 실패했습니다.',
      })
    },
  })

  const [lastText, setLastText] = useState('')
  const handlePastedText = (text: string) => {
    setLastText(text)
    previewMutation.mutate(text)
  }
  const handleSubmitAll = () => {
    if (!lastText) return
    submitMutation.mutate(lastText)
  }
  // 미리보기 없이 바로 제출 (PasteDropzone '제출 →' 버튼)
  const handleDirectSubmit = (text: string) => {
    setLastText(text)
    setParseError('')
    setDays([])
    submitMutation.mutate(text)
  }

  const today = dateLine(todayIso())
  const totalTasks = days.reduce((s, d) => s + d.tasks.length, 0)
  const pendingCount = days.reduce(
    (s, d) => s + d.tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    0
  )
  const warnings = previewMutation.data?.warnings ?? []

  return (
    <div className="max-w-[1100px]">
      <div className="v2-divider mb-6"><span>Entry</span></div>

      {/* Tabs */}
      <div className="flex gap-1 mb-7 border-b border-line">
        <TabBtn active={tab === 'PASTE'} onClick={() => setTab('PASTE')}>
          엑셀 붙여넣기
        </TabBtn>
        <TabBtn active={tab === 'FORM'} onClick={() => setTab('FORM')}>
          직접 입력
        </TabBtn>
      </div>

      {tab === 'FORM' && <DirectEntryForm />}

      {tab === 'PASTE' && (
        <section className="border-[1.5px] border-ink bg-paper p-7 mb-6" style={{borderRadius:'3px'}}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[16px] font-sans font-bold text-ink tracking-[-0.02em] uppercase">엑셀 행 붙여넣기</div>
              <div className="text-[13px] text-ink-muted mt-1 font-mono tracking-wide">
                7 cols · 작성일 / 근무시간 / 업무명 / NO. / 진행상태 / 상세내용 / 이슈
              </div>
            </div>
            <span className="font-mono text-[10px] px-2.5 py-1 bg-paper-warm border-[1.5px] border-ink text-ink-muted tracking-wider uppercase" style={{borderRadius:'2px'}}>
              Ctrl + V
            </span>
          </div>
          <PasteDropzone
            onText={handlePastedText}
            onSubmit={handleDirectSubmit}
            isLoading={previewMutation.isPending}
            isSubmitting={submitMutation.isPending}
          />

          {parseError && (
            <div className="mt-4 text-[13px] text-accent bg-accent-soft border border-accent/30 px-4 py-2.5" style={{borderRadius:'2px'}}>
              {parseError}
            </div>
          )}

          {/* 바로 제출 결과 (미리보기 없이 제출 시) */}
          {submitMsg && days.length === 0 && (
            <div
              className={`mt-4 text-[13px] px-4 py-2.5 border ${
                submitMsg.kind === 'ok'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-accent-soft text-accent border-accent/30'
              }`}
              style={{borderRadius:'2px'}}
            >
              {submitMsg.text}
            </div>
          )}
        </section>
      )}

      {tab === 'PASTE' && days.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[14px] text-ink-muted">
              <span className="font-mono uppercase tracking-[0.12em] text-[11px] text-ink-faint mr-2">Preview</span>
              <span className="text-ink font-semibold num-mono">{days.length}</span> 일자 ·{' '}
              <span className="text-ink font-semibold num-mono">{totalTasks}</span> 업무 ·{' '}
              <span className="text-accent font-semibold num-mono">{pendingCount}</span> 진행중
            </div>
            <button
              onClick={handleSubmitAll}
              disabled={submitMutation.isPending}
              className="text-[13px] px-5 py-2.5 bg-accent text-white hover:bg-accent-deep disabled:bg-ink-faint disabled:cursor-not-allowed font-bold tracking-[0.06em] uppercase transition-colors border-[1.5px] border-accent hover:border-accent-deep"
              style={{borderRadius:'2px'}}
            >
              {submitMutation.isPending ? '저장 중…' : '전체 제출 →'}
            </button>
          </div>

          {submitMsg && (
            <div
              className={`mb-5 text-[13px] rounded-v2-sm px-4 py-2.5 border ${
                submitMsg.kind === 'ok'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-accent-soft text-accent border-accent/30'
              }`}
            >
              {submitMsg.text}
            </div>
          )}

          {/* Quality warnings banner */}
          {warnings.length > 0 && (
            <details
              className="mb-5 border border-amber-200 overflow-hidden"
              style={{ borderRadius: '3px' }}
              open={warnings.length <= 4}
            >
              <summary className="cursor-pointer px-4 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2 text-[13px] font-semibold text-amber-800 list-none select-none">
                <span>⚠ 품질 경고 {warnings.length}건 — 제출 전 확인 권장</span>
              </summary>
              <ul className="bg-amber-50/60 px-4 py-3 space-y-1">
                {warnings.map((w, i) => (
                  <li key={i} className="text-[12px] text-amber-700 flex items-start gap-2 font-mono">
                    <span className="mt-[5px] w-1 h-1 rounded-full bg-amber-500 flex-shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {days.map((day) => (
            <DayCard key={day.reportDate} day={day} />
          ))}
        </>
      )}
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-[14px] -mb-px border-b-2 transition-colors ${
        active
          ? 'border-accent text-accent font-semibold'
          : 'border-transparent text-ink-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function DayCard({ day }: { day: ParsedDay }) {
  const d = dateLine(day.reportDate)
  const warnCount = day.tasks.reduce((s, t) => s + (t.warnings?.length ?? 0), 0)
  return (
    <article className="relative bg-paper mb-5 overflow-hidden border-[1.5px] border-ink" style={{borderRadius:'3px'}}>
      <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" aria-hidden="true" />
      <header className="px-7 py-4 border-b-[1.5px] border-ink bg-paper-warm flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="font-sans font-bold text-[20px] tracking-[-0.03em] num-mono text-ink">{d.md}</h2>
          <span className="text-[12px] font-mono uppercase tracking-[0.12em] text-ink-muted">{d.w}</span>
          <span className="v2-pill v2-pill-accent">{day.tasks.length} TASKS</span>
          {warnCount > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200" style={{borderRadius:'2px'}}>
              ⚠ {warnCount}
            </span>
          )}
        </div>
        <span className="text-[11px] font-mono tracking-wider text-ink-muted num-mono uppercase">{day.workHours ?? '—'}</span>
      </header>
      <div className="divide-y divide-line-soft">
        {day.tasks.map((t, i) => (
          <TaskRow key={`${day.reportDate}-${i}`} task={t} />
        ))}
      </div>
    </article>
  )
}

function TaskRow({ task }: { task: ParsedTask }) {
  const status = task.status ? STATUS_LABEL[task.status] : null
  return (
    <div className="px-7 py-4 flex gap-5 items-start">
      <div className="text-[12px] text-ink-faint w-12 pt-1 font-mono num-mono">{task.taskNo}</div>
      <div className="flex-1 min-w-0">
        {task.category && (
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-muted font-mono font-semibold inline-flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-accent" aria-hidden="true" />
            {task.category}
          </div>
        )}
        <div className="text-[14px] mt-1 leading-relaxed whitespace-pre-line text-ink">{task.content}</div>
        {task.taskIssue && (
          <div className="mt-2 text-[12px] text-accent flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-accent" />
            {task.taskIssue}
          </div>
        )}
        {task.warnings && task.warnings.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {task.warnings.map((w, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 font-mono" style={{borderRadius:'2px'}}>
                ⚠ {w}
              </span>
            ))}
          </div>
        )}
        {(task.extractedLots.length > 0 || task.extractedQtys.length > 0) && (
          <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px] font-mono uppercase tracking-wider">
            {task.extractedLots.map((lot, i) => (
              <span
                key={`l${i}`}
                className="px-2 py-0.5 rounded bg-paper-warm text-ink-muted border border-line"
              >
                LOT · {lot}
              </span>
            ))}
            {task.extractedQtys.map((qty, i) => (
              <span
                key={`q${i}`}
                className="px-2 py-0.5 rounded bg-accent-soft text-accent border border-accent/20"
              >
                {qty}
              </span>
            ))}
          </div>
        )}
      </div>
      {status && (
        <span
          className={`text-[11px] px-2.5 py-1 border font-mono uppercase tracking-[0.1em] font-bold ${status.cls}`}
          style={{borderRadius:'2px'}}
        >
          {status.ko}
        </span>
      )}
    </div>
  )
}
