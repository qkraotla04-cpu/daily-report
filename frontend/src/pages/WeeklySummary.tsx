// WeeklySummary — Blueprint theme, inline-viewable workflow
// Flow: aggregate stats → view raw text inline → copy prompt → paste result → save & view

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { weeklyApi, type WeeklyAggregate, type WeeklySummaryRecord } from '../api/weekly'

const PROMPT_TEMPLATE_BASIC = `다음은 우리 팀의 한 주간 업무일지입니다. 아래 요구사항에 맞춰 한국어로 주간 요약 보고서를 작성해주세요.

[요구사항]
1. 주요 성과 (3~5개 bullet)
2. 진행중 / 보류 업무 (담당자별 정리)
3. 리스크 및 이슈 (긴급도별)
4. 다음 주 우선순위 제안
5. LOT/수량 등 정량 지표 요약

[입력 데이터]
=== 아래 본문 그대로 ===
`

const PROMPT_TEMPLATE_DETAILED = `당신은 L&K Biomed 생산팀의 주간 업무 보고서 작성 보조입니다. 아래 한 주간 일지를 분석해서 한국어로 보고서를 작성해주세요.

[보고서 구조]
## 1. Executive Summary
- 한 주 핵심 키워드 3~5개, 1줄씩

## 2. 주요 성과 (정량 지표 우선)
- LOT 처리량, 검사 완료 건수, 출고 건수 등 숫자 우선
- 담당자/업무명/수치를 명확히

## 3. 담당자별 진행 현황
- 각 팀원별 완료/진행/보류 업무 정리
- 미제출자 명시

## 4. 리스크 및 이슈
- 🔴 긴급: 즉시 대응 필요
- 🟡 중간: 이번 주 내 대응
- 🟢 모니터링: 관찰만

## 5. LOT/수량 분석
- 자주 등장한 LOT TOP 5
- 비정상 수량(과다/과소) 플래그

## 6. 다음 주 우선순위 제안
- 미완료 업무 이어가기 + 새 작업 제안 3~5건
- 인력 분배 권장

[작성 규칙]
- 추측 금지, 일지에 명시된 사실만 사용
- 모호한 표현 → 명확한 데이터로 치환
- 숫자는 num-mono 처럼 가지런히

[입력 데이터]
=== 아래 본문 그대로 ===
`

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function WeeklySummary() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [weekStart, setWeekStart] = useState(isoOf(getMonday(new Date())))
  const [pastedSummary, setPastedSummary] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'text' | 'prompt' | 'auto'>('idle')
  const [promptMode, setPromptMode] = useState<'basic' | 'detailed'>('detailed')
  const [rawText, setRawText] = useState<string>('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [autoSummary, setAutoSummary] = useState<string>('')
  const [autoLoading, setAutoLoading] = useState(false)
  const [autoError, setAutoError] = useState('')
  const [autoSaving, setAutoSaving] = useState(false)
  const [autoSaveError, setAutoSaveError] = useState('')

  const team = user?.team || '생산팀'

  const aggQuery = useQuery({
    queryKey: ['weekly', 'aggregate', weekStart, team],
    queryFn: () => weeklyApi.aggregate(weekStart, team),
  })
  const historyQuery = useQuery({
    queryKey: ['weekly', 'list', team],
    queryFn: () => weeklyApi.list(team),
  })

  // Auto-load raw text whenever week changes
  useEffect(() => {
    let cancelled = false
    weeklyApi.exportText(weekStart, team).then((text) => {
      if (!cancelled) setRawText(text)
    }).catch(() => {
      if (!cancelled) setRawText('')
    })
    return () => { cancelled = true }
  }, [weekStart, team])

  const saveMutation = useMutation({
    mutationFn: () => weeklyApi.save({ weekStart, team, summaryText: pastedSummary }),
    onSuccess: () => {
      setSaveError('')
      setSaveSuccess(true)
      setPastedSummary('')
      queryClient.invalidateQueries({ queryKey: ['weekly', 'list'] })
      setTimeout(() => setSaveSuccess(false), 3000)
    },
    onError: (err: AxiosError<{ error: { message: string } }>) => {
      setSaveError(err.response?.data?.error?.message || '저장 실패')
    },
  })

  const handleDownload = async () => {
    await weeklyApi.downloadText(weekStart, team)
  }
  const handleCopyText = async () => {
    if (!rawText) return
    await navigator.clipboard.writeText(rawText)
    setCopyState('text')
    setTimeout(() => setCopyState('idle'), 2000)
  }
  const handleCopyPrompt = async () => {
    const template = promptMode === 'detailed' ? PROMPT_TEMPLATE_DETAILED : PROMPT_TEMPLATE_BASIC
    await navigator.clipboard.writeText(`${template}\n\n${rawText}`)
    setCopyState('prompt')
    setTimeout(() => setCopyState('idle'), 2000)
  }
  const handleAutoGenerate = async () => {
    setAutoLoading(true)
    setAutoError('')
    try {
      const s = await weeklyApi.autoSummary(weekStart, team)
      setAutoSummary(s)
    } catch (err) {
      const ae = err as AxiosError<{ error: { message: string } }>
      setAutoError(ae.response?.data?.error?.message || '자동 요약 생성 실패')
    } finally {
      setAutoLoading(false)
    }
  }
  const handleCopyAuto = async () => {
    if (!autoSummary) return
    await navigator.clipboard.writeText(autoSummary)
    setCopyState('auto')
    setTimeout(() => setCopyState('idle'), 2000)
  }
  const handleUseAuto = () => {
    setPastedSummary(autoSummary)
    setSaveError('')
  }
  const handleAutoSave = async () => {
    setAutoSaving(true)
    setAutoSaveError('')
    setSaveError('')
    try {
      const s = await weeklyApi.autoSummary(weekStart, team)
      setAutoSummary(s)
      await weeklyApi.save({ weekStart, team, summaryText: s })
      setSaveSuccess(true)
      setPastedSummary('')
      queryClient.invalidateQueries({ queryKey: ['weekly', 'list'] })
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      const ae = err as AxiosError<{ error: { message: string } }>
      setAutoSaveError(ae.response?.data?.error?.message || '자동 저장 실패')
    } finally {
      setAutoSaving(false)
    }
  }

  const agg = aggQuery.data
  const weekEnd = useMemo(() => {
    const start = new Date(`${weekStart}T00:00:00`)
    const end = new Date(start)
    end.setDate(end.getDate() + 4)
    return isoOf(end)
  }, [weekStart])

  const lineCount = useMemo(() => rawText.split('\n').length, [rawText])

  return (
    <div className="max-w-[1100px]">
      {/* ── Hero header ── */}
      <header className="mb-6 flex items-end justify-between">
        <div />
        <div className="flex items-center gap-2">
          <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted font-bold">
            주 시작 (월)
          </label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="font-mono text-[13px] num-mono border-[1.5px] border-line bg-paper text-ink px-3 py-2 focus:border-accent focus:outline-none transition-colors"
            style={{ borderRadius: '2px' }}
          />
        </div>
      </header>

      {/* ── Aggregate stats ── */}
      {agg && <AggregateCards agg={agg} />}

      {saveSuccess && (
        <div
          className="mb-4 text-[13px] text-[var(--v2-state-done)] bg-[rgba(52,211,153,0.12)] border-[1.5px] border-[var(--v2-state-done)] px-4 py-2.5 font-mono"
          style={{ borderRadius: '2px' }}
        >
          ✓ 주간 요약이 저장되었습니다.
        </div>
      )}

      <div className="v2-divider"><span>Step 1 · 원본 일지 (자동 로드)</span></div>

      {/* ── Raw text viewer (auto-loaded, inline) ── */}
      <div
        className="bg-paper border-[1.5px] border-ink overflow-hidden mb-5"
        style={{ borderRadius: '3px' }}
      >
        <div className="px-5 py-3 bg-paper-warm border-b-[1.5px] border-ink flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink font-bold">
              주간 일지 원본
            </span>
            <span className="font-mono text-[11px] text-ink-muted num-mono">
              {lineCount}줄 · {rawText.length.toLocaleString()}자
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              disabled={!rawText}
              className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border-[1.5px] border-ink text-ink bg-paper hover:bg-ink hover:text-paper disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold"
              style={{ borderRadius: '2px' }}
            >
              {copyState === 'text' ? '✓ 복사됨' : '본문 복사'}
            </button>
            <button
              onClick={handleDownload}
              disabled={!rawText}
              className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border-[1.5px] border-line text-ink-muted hover:border-ink hover:text-ink disabled:opacity-30 transition-colors"
              style={{ borderRadius: '2px' }}
            >
              ↓ TXT
            </button>
          </div>
        </div>
        {rawText ? (
          <pre
            className="px-5 py-4 text-[13px] text-ink-muted whitespace-pre-wrap max-h-[400px] overflow-y-auto font-mono leading-relaxed bg-paper"
          >
            {rawText}
          </pre>
        ) : (
          <div className="px-5 py-12 text-center font-mono text-[11px] text-ink-faint uppercase tracking-wider">
            데이터 로딩 중…
          </div>
        )}
      </div>

      <div className="v2-divider"><span>Step 2-A · 시스템 자동 분석 (LLM 없이)</span></div>

      {/* ── Auto-summary section ── */}
      <div
        className="bg-paper border-[1.5px] border-ink p-5 mb-5"
        style={{ borderRadius: '3px' }}
      >
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex-1">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink font-bold mb-1">
              자체 알고리즘 요약 — 9개 섹션
            </div>
            <div className="text-[13px] text-ink-muted leading-relaxed">
              담당자별 / 카테고리별 / 이슈 우선순위 / LOT·수량 집계 / 미제출 / 차주 이월 항목까지 자동 산출.
              네트워크 외부 호출 없이 DB 데이터만으로 생성됩니다.
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button
              onClick={handleAutoGenerate}
              disabled={autoLoading || autoSaving}
              className="px-4 py-2 bg-ink text-paper hover:bg-accent disabled:bg-ink-faint font-bold text-[12px] uppercase tracking-[0.08em] border-[1.5px] border-ink hover:border-accent disabled:border-ink-faint transition-colors"
              style={{ borderRadius: '2px' }}
            >
              {autoLoading ? '생성 중…' : autoSummary ? '재생성' : '◈ 자동 분석 실행'}
            </button>
            <button
              onClick={handleAutoSave}
              disabled={autoSaving || autoLoading}
              className="px-4 py-2 bg-[var(--v2-state-done)] text-white hover:opacity-90 disabled:bg-ink-faint font-bold text-[12px] uppercase tracking-[0.08em] border-[1.5px] border-[var(--v2-state-done)] disabled:border-ink-faint transition-colors"
              style={{ borderRadius: '2px' }}
              title="일일 취합 데이터로 요약 생성 후 즉시 저장"
            >
              {autoSaving ? '저장 중…' : '⚡ 원클릭 자동 저장'}
            </button>
          </div>
        </div>

        {autoError && (
          <div
            className="text-[12.5px] text-accent bg-accent-soft border-[1.5px] border-accent px-3 py-2 font-mono mb-3"
            style={{ borderRadius: '2px' }}
          >
            ✕ {autoError}
          </div>
        )}
        {autoSaveError && (
          <div
            className="text-[12.5px] text-accent bg-accent-soft border-[1.5px] border-accent px-3 py-2 font-mono mb-3"
            style={{ borderRadius: '2px' }}
          >
            ✕ {autoSaveError}
          </div>
        )}

        {autoSummary && (
          <>
            <div
              className="bg-paper-warm border-[1.5px] border-line px-4 py-3 max-h-[420px] overflow-y-auto text-[13px] text-ink whitespace-pre-wrap font-sans leading-relaxed mb-3"
              style={{ borderRadius: '2px' }}
            >
              {autoSummary}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleUseAuto}
                className="px-4 py-2 bg-accent text-white hover:bg-accent-deep font-bold text-[12px] uppercase tracking-[0.08em] border-[1.5px] border-accent hover:border-accent-deep transition-colors"
                style={{ borderRadius: '2px' }}
              >
                ↓ Step 3 텍스트박스에 채우기
              </button>
              <button
                onClick={handleCopyAuto}
                className="px-4 py-2 bg-paper text-ink border-[1.5px] border-ink hover:bg-ink hover:text-paper font-bold text-[12px] uppercase tracking-[0.08em] transition-colors"
                style={{ borderRadius: '2px' }}
              >
                {copyState === 'auto' ? '✓ 복사됨' : '본문 복사'}
              </button>
              <span className="ml-auto font-mono text-[10px] text-ink-faint num-mono">
                {autoSummary.length.toLocaleString()}자
              </span>
            </div>
          </>
        )}
      </div>

      <div className="v2-divider"><span>Step 2-B · Claude.ai 프롬프트 복사 (옵션)</span></div>

      {/* ── Prompt section ── */}
      <div
        className="bg-paper border-[1.5px] border-ink p-5 mb-5"
        style={{ borderRadius: '3px' }}
      >
        {/* Mode toggle */}
        <div className="flex items-center gap-2 mb-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted font-bold mr-2">
            프롬프트 모드
          </span>
          <PromptModeBtn active={promptMode === 'basic'} onClick={() => setPromptMode('basic')}>
            기본 (5섹션)
          </PromptModeBtn>
          <PromptModeBtn active={promptMode === 'detailed'} onClick={() => setPromptMode('detailed')}>
            상세 (6섹션 · 권장)
          </PromptModeBtn>
        </div>

        {/* Cowork hint */}
        <div
          className="bg-accent-soft border-[1.5px] border-accent px-3 py-2.5 mb-4 text-[11.5px] text-ink leading-relaxed"
          style={{ borderRadius: '2px' }}
        >
          <strong className="font-bold text-accent">💡 코워크(Projects) 사용 팁:</strong>{' '}
          claude.ai의 Projects 기능에 팀 컨텍스트를 미리 등록해두면 더 자세한 요약이 가능합니다.
          TXT 파일 첨부 + 프로젝트 메모리 활용 시 권장.
        </div>

        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={handleCopyPrompt}
            disabled={!rawText}
            className="px-4 py-2 bg-accent text-white hover:bg-accent-deep disabled:bg-ink-faint font-bold text-[12px] uppercase tracking-[0.08em] border-[1.5px] border-accent hover:border-accent-deep disabled:border-ink-faint transition-colors"
            style={{ borderRadius: '2px' }}
          >
            {copyState === 'prompt' ? '✓ 복사 완료' : '프롬프트 + 본문 통합 복사 →'}
          </button>
          <a
            href="https://claude.ai/projects"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[10px] uppercase tracking-wider px-3 py-2 border-[1.5px] border-line text-ink-muted hover:border-accent hover:text-accent transition-colors"
            style={{ borderRadius: '2px' }}
          >
            claude.ai/projects ↗
          </a>
        </div>

        <details>
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint hover:text-accent transition-colors">
            프롬프트 미리보기 ▾
          </summary>
          <pre
            className="mt-3 bg-paper-warm border-[1.5px] border-line px-4 py-3 text-[11px] text-ink-muted whitespace-pre-wrap max-h-64 overflow-y-auto font-mono leading-relaxed"
            style={{ borderRadius: '2px' }}
          >
            {promptMode === 'detailed' ? PROMPT_TEMPLATE_DETAILED : PROMPT_TEMPLATE_BASIC}
          </pre>
        </details>
      </div>

      <div className="v2-divider"><span>Step 3 · 결과 붙여넣기 및 저장</span></div>

      <div
        className="bg-paper border-[1.5px] border-ink p-5 mb-7"
        style={{ borderRadius: '3px' }}
      >
        <textarea
          value={pastedSummary}
          onChange={(e) => setPastedSummary(e.target.value)}
          rows={12}
          placeholder="Claude.ai에서 생성한 주간 요약 결과를 여기에 붙여넣기 하세요…"
          className="w-full text-[13px] border-[1.5px] border-line bg-paper text-ink px-3 py-2 resize-y placeholder:text-ink-faint focus:border-accent focus:outline-none transition-colors font-mono leading-relaxed mb-3"
          style={{ borderRadius: '2px' }}
        />
        {saveError && (
          <div
            className="text-[12.5px] text-accent bg-accent-soft border-[1.5px] border-accent px-3 py-2 mb-3 font-mono"
            style={{ borderRadius: '2px' }}
          >
            ✕ {saveError}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-ink-faint num-mono">
            {pastedSummary.length.toLocaleString()}자
          </span>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!pastedSummary.trim() || saveMutation.isPending}
            className="px-5 py-2 bg-accent text-white hover:bg-accent-deep disabled:bg-ink-faint disabled:cursor-not-allowed font-bold text-[12px] uppercase tracking-[0.08em] border-[1.5px] border-accent hover:border-accent-deep disabled:border-ink-faint transition-colors"
            style={{ borderRadius: '2px' }}
          >
            {saveMutation.isPending ? '저장 중…' : '주간 요약 저장 →'}
          </button>
        </div>
      </div>

      {/* ── Saved history ── */}
      <div className="v2-divider"><span>저장된 주간 요약</span></div>

      <div
        className="bg-paper border-[1.5px] border-ink overflow-hidden"
        style={{ borderRadius: '3px' }}
      >
        {historyQuery.isLoading ? (
          <div className="px-5 py-12 text-center font-mono text-[11px] text-ink-faint uppercase tracking-wider">
            불러오는 중…
          </div>
        ) : !historyQuery.data || historyQuery.data.length === 0 ? (
          <div className="px-5 py-12 text-center font-mono text-[11px] text-ink-faint uppercase tracking-wider">
            저장된 요약이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {historyQuery.data.map((s) => (
              <SavedSummaryRow
                key={s.id}
                rec={s}
                expanded={expandedId === s.id}
                onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────

function SavedSummaryRow({
  rec,
  expanded,
  onToggle,
}: {
  rec: WeeklySummaryRecord
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="px-5 py-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 text-left hover:bg-paper-warm transition-colors -mx-5 px-5 py-2"
      >
        <div className="flex items-center gap-4">
          <span className="font-mono text-[12px] text-ink num-mono font-bold">
            {rec.weekStart.slice(0, 10)} ~ {rec.weekEnd.slice(0, 10)}
          </span>
          <span className="font-mono text-[10px] text-ink-faint uppercase tracking-wider">
            {rec.team}
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-ink-muted">
          <span className="num-mono">
            제출 <span className="text-ink font-bold">{rec.totalReports}</span>건
          </span>
          <span className="text-[var(--v2-state-done)] num-mono">완료 {rec.completedCount}</span>
          <span className="text-[var(--v2-accent)] num-mono">진행 {rec.inProgressCount}</span>
          <span className="text-ink-faint text-[14px]">{expanded ? '▴' : '▾'}</span>
        </div>
      </button>
      {expanded && (
        <pre
          className="mt-3 bg-paper-warm border-[1.5px] border-line px-4 py-3 text-[12.5px] text-ink whitespace-pre-wrap font-sans leading-relaxed"
          style={{ borderRadius: '2px' }}
        >
          {rec.summaryText}
        </pre>
      )}
    </div>
  )
}

function AggregateCards({ agg }: { agg: WeeklyAggregate }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      <Stat
        label="제출률"
        value={`${agg.submissionRate}%`}
        sub={`${agg.totalReports}/${agg.expectedReports}건`}
        color={agg.submissionRate >= 80 ? 'var(--v2-state-done)' : agg.submissionRate >= 60 ? 'var(--v2-accent)' : 'var(--v2-state-wait)'}
      />
      <Stat label="총 업무" value={String(agg.totalTasks)} color="var(--v2-ink)" />
      <Stat label="완료" value={String(agg.completedCount)} color="var(--v2-state-done)" />
      <Stat label="진행중" value={String(agg.inProgressCount)} color="var(--v2-accent)" />
      <Stat
        label="이슈"
        value={String(agg.issueCount)}
        color={agg.issueCount > 0 ? 'var(--v2-state-danger)' : 'var(--v2-ink-muted)'}
      />
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub?: string
  color: string
}) {
  return (
    <div
      className="bg-paper border-[1.5px] border-line p-4"
      style={{ borderRadius: '3px' }}
    >
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint font-bold mb-2">
        {label}
      </div>
      <div className="font-bold num-mono leading-none text-[24px]" style={{ color }}>
        {value}
      </div>
      {sub && (
        <div className="font-mono text-[10px] text-ink-faint mt-1.5 num-mono">{sub}</div>
      )}
    </div>
  )
}

function PromptModeBtn({
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
      className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border-[1.5px] transition-colors font-bold ${
        active
          ? 'bg-ink text-paper border-ink'
          : 'bg-paper text-ink-muted border-line hover:border-ink hover:text-ink'
      }`}
      style={{ borderRadius: '2px' }}
    >
      {children}
    </button>
  )
}
