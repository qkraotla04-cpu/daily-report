// Dashboard — Main home page
// Shows today's submission status, team overview (ADMIN/TEAM_LEAD), and personal stats

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { aggregationApi, type AggregationRow } from '../api/aggregation'
import { reportsApi } from '../api/reports'
import { todayIso } from '../utils/date'
import PersonalStats from '../components/PersonalStats'

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

function todayLabel() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const w = WEEKDAY[d.getDay()]
  return { full: `${yyyy}.${mm}.${dd}`, w: `${w}요일`, dateNum: String(d.getDate()).padStart(2, '0') }
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function Dashboard() {
  const { user } = useAuth()
  const today = todayIso()
  const isManager = user?.role === 'ADMIN' || user?.role === 'TEAM_LEAD'
  const { full, w, dateNum } = todayLabel()

  // Today's own report
  const myTodayQ = useQuery({
    queryKey: ['reports', 'me', 'today'],
    queryFn: () => reportsApi.getMyToday(),
  })

  // Team aggregation (ADMIN / TEAM_LEAD only)
  const aggQ = useQuery({
    queryKey: ['aggregation', 'daily', today],
    queryFn: () => aggregationApi.getDaily(today),
    enabled: isManager,
  })

  const myReport = myTodayQ.data
  const aggRows: AggregationRow[] = aggQ.data?.rows ?? []

  // Team stats
  const submitted = useMemo(() => aggRows.filter((r) => r.report !== null), [aggRows])
  const notSubmitted = useMemo(() => aggRows.filter((r) => r.report === null), [aggRows])
  const totalTasks = useMemo(
    () => submitted.reduce((s, r) => s + (r.report?.tasks.length ?? 0), 0),
    [submitted]
  )

  return (
    <div className="max-w-[1100px]">
      {/* ── Blueprint section header ── */}
      <header className="mb-6 flex items-center justify-between pb-3" style={{ borderBottom: '1.5px solid var(--v2-ink)' }}>
        <div className="flex items-center gap-3">
          <div style={{ width: 22, height: 22, background: 'var(--v2-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--v2-font-mono)', fontSize: 8, fontWeight: 800, color: 'var(--v2-cream)' }}>홈</span>
          </div>
          <span style={{ fontFamily: 'var(--v2-font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--v2-ink)', textTransform: 'uppercase' }}>
            OVERVIEW · DAILY STATUS
          </span>
        </div>
      </header>

      {/* ── My today status card ── */}
      <SectionHead title="내 오늘 현황" />

      <div className="mb-6">
        {myTodayQ.isLoading ? (
          <LoadingCard />
        ) : myReport ? (
          <MySubmittedCard report={myReport} />
        ) : (
          <MyNotSubmittedCard />
        )}
      </div>

      {/* ── Personal stats — weekly + monthly, clickable drill-down ── */}
      <div className="mb-8">
        <PersonalStats />
      </div>

      {/* ── Team overview (ADMIN / TEAM_LEAD only) ── */}
      {isManager && (
        <>
          <SectionHead title="팀 제출 현황" meta={full} />

          {/* Summary chips */}
          <div className="flex items-center gap-3 mb-5">
            <TeamChip label="제출 완료" count={submitted.length} color="var(--v2-state-done)" bg="rgba(52,211,153,0.12)" borderColor="rgba(52,211,153,0.35)" />
            <TeamChip label="미제출" count={notSubmitted.length} color="var(--v2-ink)" bg="rgba(232,241,255,0.08)" borderColor="rgba(232,241,255,0.25)" />
            <TeamChip label="총 업무" count={totalTasks} unit="건" color="var(--v2-accent)" bg="rgba(90,200,255,0.10)" borderColor="rgba(90,200,255,0.30)" />
            <Link
              to="/aggregation"
              className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-accent border-[1.5px] border-accent px-3 py-1.5 hover:bg-accent hover:text-white transition-colors"
              style={{ borderRadius: '2px' }}
            >
              전체보기 →
            </Link>
          </div>

          {aggQ.isLoading ? (
            <LoadingCard />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8 pl-3">
              {aggRows.map((row) => (
                <MemberCard key={row.user.id} row={row} />
              ))}
            </div>
          )}

          {/* Recent submissions feed */}
          {submitted.length > 0 && (
            <>
              <SectionHead title="오늘 제출 피드" meta={`${submitted.length}명`} />
              <div className="border-[1.5px] border-ink bg-paper overflow-hidden mb-6 bp-inner-dash" style={{ borderRadius: '3px' }}>
                <div className="px-5 py-3 bg-paper-warm border-b-[1.5px] border-ink">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink font-bold">
                    제출 목록 — {submitted.length}명
                  </span>
                </div>
                <div className="divide-y divide-line">
                  {submitted.map((row) => (
                    <FeedRow key={row.user.id} row={row} />
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────

function SectionHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="mb-4 mt-6 flex items-center gap-3 pb-2" style={{ borderBottom: '1.5px solid var(--v2-ink)' }}>
      <div style={{ width: 20, height: 20, background: 'var(--v2-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--v2-font-mono)', fontSize: 8, fontWeight: 800, color: 'var(--v2-cream)' }}>—</span>
      </div>
      <span style={{ fontFamily: 'var(--v2-font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--v2-ink)', textTransform: 'uppercase', flex: 1 }}>
        {title}
      </span>
      {meta && (
        <span style={{ fontFamily: 'var(--v2-font-mono)', fontSize: 8.5, letterSpacing: '0.14em', color: 'var(--v2-ink-faint)', fontWeight: 600 }}>
          {meta}
        </span>
      )}
    </div>
  )
}

function MySubmittedCard({ report }: { report: NonNullable<Awaited<ReturnType<typeof reportsApi.getMyToday>>> }) {
  const taskCount = report.tasks.length
  const completed = report.tasks.filter((t) => t.status === 'COMPLETED').length
  const inProgress = report.tasks.filter((t) => t.status === 'IN_PROGRESS').length
  const submitTime = fmtTime(report.updatedAt ?? null)

  return (
    <div
      className="bg-paper p-5 flex items-center gap-5 relative bp-inner-dash"
      style={{ borderRadius: '3px', border: '1.5px solid var(--v2-state-done)' }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'var(--v2-state-done)' }} />
      <div
        className="flex-shrink-0 w-10 h-10 flex items-center justify-center font-bold text-[18px]"
        style={{ borderRadius: '2px', background: 'var(--v2-state-done)', color: 'var(--v2-cream)' }}
      >
        ✓
      </div>
      <div className="flex-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold mb-1" style={{ color: 'var(--v2-state-done)' }}>
          오늘 일지 제출 완료
        </div>
        <div className="text-[15px] font-bold text-ink num-mono">
          {submitTime} 제출 · {taskCount}건 업무
        </div>
        <div className="flex gap-3 mt-1.5 text-[12px] font-mono">
          <span style={{ color: 'var(--v2-state-done)' }}>완료 {completed}건</span>
          {inProgress > 0 && <span style={{ color: 'var(--v2-accent)' }}>진행중 {inProgress}건</span>}
        </div>
      </div>
      <Link
        to="/daily"
        className="flex-shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-muted border-[1.5px] border-line px-3 py-1.5 hover:border-ink hover:text-ink transition-colors"
        style={{ borderRadius: '2px' }}
      >
        수정 →
      </Link>
    </div>
  )
}

function MyNotSubmittedCard() {
  return (
    <div
      className="bg-paper p-5 flex items-center gap-5 relative bp-inner-dash"
      style={{ borderRadius: '3px', border: '1.5px solid var(--v2-ink)' }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'var(--v2-ink)' }} />
      <div
        className="flex-shrink-0 w-10 h-10 flex items-center justify-center font-bold text-[18px]"
        style={{ borderRadius: '2px', background: 'var(--v2-ink)', color: 'var(--v2-cream)' }}
      >
        !
      </div>
      <div className="flex-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold mb-1" style={{ color: 'var(--v2-ink)' }}>
          오늘 미제출
        </div>
        <div className="text-[14px] text-ink-muted">
          아직 오늘 업무일지를 제출하지 않았습니다.
        </div>
      </div>
      <Link
        to="/daily"
        className="flex-shrink-0 font-mono text-[11px] uppercase tracking-wider px-4 py-2 border-[1.5px] hover:opacity-80 transition-opacity font-bold"
        style={{ borderRadius: '2px', background: 'var(--v2-accent)', borderColor: 'var(--v2-accent)', color: 'var(--v2-cream)' }}
      >
        작성하기 →
      </Link>
    </div>
  )
}

function LoadingCard() {
  return (
    <div className="ed-card p-5">
      <div className="font-mono text-[11px] text-ink-faint uppercase tracking-wider">로딩 중…</div>
    </div>
  )
}

function TeamChip({
  label,
  count,
  unit = '명',
  color,
  bg,
  borderColor,
}: {
  label: string
  count: number
  unit?: string
  color: string
  bg: string
  borderColor: string
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] border-[1.5px]"
      style={{ color, background: bg, borderColor, borderRadius: '2px' }}
    >
      <span className="font-bold text-[15px] num-mono">{count}</span>
      {label}
      <span className="text-[9px] opacity-70">{unit}</span>
    </div>
  )
}

function MemberCard({ row }: { row: AggregationRow }) {
  const submitted = row.report !== null
  const taskCount = row.report?.tasks.length ?? 0
  const completed = row.report?.tasks.filter((t) => t.status === 'COMPLETED').length ?? 0
  const inProgress = row.report?.tasks.filter((t) => t.status === 'IN_PROGRESS').length ?? 0
  const submitTime = fmtTime(row.report?.submittedAt ?? null)
  const initial = row.user.name?.[0] ?? '?'

  return (
    <div
      className="bg-paper border-[1.5px] px-4 pt-6 pb-4 relative bp-inner-dash"
      style={{
        borderColor: 'var(--v2-ink)',
        borderRadius: '3px',
      }}
    >
      {/* Blueprint sect-marker — circle badge hanging OUTSIDE top-left corner (MES v5 asymmetry) */}
      <div style={{
        position: 'absolute', top: -12, left: -12,
        width: 24, height: 24, borderRadius: '50%',
        background: 'var(--v2-ink)',
        color: 'var(--v2-cream)',
        fontFamily: 'var(--v2-font-mono)', fontSize: 11, fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1.5px solid var(--v2-ink)',
        zIndex: 2,
        boxShadow: `0 0 0 3px var(--v2-paper)`,
      }}>
        {initial}
      </div>

      {/* User info */}
      <div className="mb-3">
        <div className="text-[13px] font-bold text-ink">{row.user.name}</div>
        <div className="font-mono text-[9px] text-ink-faint uppercase tracking-wider">
          {row.user.team ?? '—'}
        </div>
      </div>

      {submitted ? (
        <>
          <div
            className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 mb-2"
            style={{ background: 'rgba(52,211,153,0.12)', color: 'var(--v2-state-done)', borderRadius: '2px', border: '1px solid rgba(52,211,153,0.40)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            제출완료
          </div>
          <div className="font-mono text-[11px] text-ink-muted num-mono">{submitTime} 제출</div>
          <div className="font-mono text-[11px] text-ink mt-1 num-mono">
            <span className="font-bold">{taskCount}</span>건
            {completed > 0 && (
              <span className="ml-2" style={{ color: 'var(--v2-state-done)' }}>완료 {completed}</span>
            )}
            {inProgress > 0 && (
              <span className="ml-2" style={{ color: 'var(--v2-accent)' }}>진행 {inProgress}</span>
            )}
          </div>
        </>
      ) : (
        <div
          className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5"
          style={{ background: 'rgba(232,241,255,0.08)', color: 'var(--v2-ink)', borderRadius: '2px', border: '1px solid rgba(232,241,255,0.25)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          미제출
        </div>
      )}
    </div>
  )
}

function FeedRow({ row }: { row: AggregationRow }) {
  if (!row.report) return null
  const taskCount = row.report.tasks.length
  const completed = row.report.tasks.filter((t) => t.status === 'COMPLETED').length
  const inProgress = row.report.tasks.filter((t) => t.status === 'IN_PROGRESS').length
  const submitTime = fmtTime(row.report.submittedAt ?? null)
  const method = row.report.inputMethod === 'PASTE' ? 'EXCEL' : 'FORM'

  return (
    <div className="px-5 py-3 flex items-center gap-4 hover:bg-paper-warm transition-colors">
      <div
        className="w-7 h-7 flex items-center justify-center bg-ink text-paper text-[11px] font-bold flex-shrink-0"
        style={{ borderRadius: '2px' }}
      >
        {row.user.name?.[0] ?? '?'}
      </div>
      <div className="font-bold text-[13px] text-ink w-20 flex-shrink-0">{row.user.name}</div>
      <div className="font-mono text-[10px] text-ink-faint w-16 flex-shrink-0">{row.user.team ?? '—'}</div>
      <div className="font-mono text-[11px] text-ink-muted num-mono flex-shrink-0">{submitTime}</div>
      <div className="flex-1 flex items-center gap-3 font-mono text-[11px]">
        <span className="text-ink num-mono"><span className="font-bold">{taskCount}</span>건</span>
        {completed > 0 && <span style={{ color: 'var(--v2-state-done)' }}>완료 {completed}</span>}
        {inProgress > 0 && <span style={{ color: 'var(--v2-accent)' }}>진행중 {inProgress}</span>}
      </div>
      <span
        className="font-mono text-[9px] px-2 py-0.5 border-[1.5px] border-line text-ink-faint uppercase tracking-wider"
        style={{ borderRadius: '2px' }}
      >
        {method}
      </span>
    </div>
  )
}

