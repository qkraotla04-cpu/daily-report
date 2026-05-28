import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi, type ReportVersion } from '../api/reports'

const STATUS_LABEL: Record<string, { ko: string; cls: string }> = {
  COMPLETED: { ko: '완료', cls: 'text-emerald-600' },
  IN_PROGRESS: { ko: '진행중', cls: 'text-amber-600' },
  ON_HOLD: { ko: '보류', cls: 'text-slate-500' },
}

interface Props {
  reportId: number
}

export default function ReportVersionPanel({ reportId }: Props) {
  const [open, setOpen] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'versions', reportId],
    queryFn: () => reportsApi.getVersionHistory(reportId),
    enabled: open,
  })

  const versions = data?.versions ?? []

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left text-[11px] font-mono uppercase tracking-[0.12em] text-slate-400 hover:text-indigo-500 flex items-center gap-2 py-2.5 border-t border-slate-100 mt-3 transition-colors"
      >
        <span className="text-[9px]">▶</span>
        수정 이력 보기
        {versions.length > 0 && (
          <span className="ml-1 text-indigo-500">({versions.length})</span>
        )}
      </button>
    )
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          수정 이력
          {versions.length > 0 && (
            <span className="ml-1.5 text-indigo-500">({versions.length}건)</span>
          )}
        </h4>
        <button
          onClick={() => { setOpen(false); setExpandedIdx(null) }}
          className="text-[11px] text-slate-400 hover:text-slate-600 font-mono"
        >
          ✕
        </button>
      </div>

      {isLoading && (
        <p className="text-[12px] text-slate-400 py-4 text-center">로딩 중…</p>
      )}

      {!isLoading && versions.length === 0 && (
        <p className="text-[12px] text-slate-400 py-3 text-center">수정 이력이 없습니다.</p>
      )}

      <div className="space-y-1.5">
        {versions.map((v, idx) => (
          <VersionItem
            key={v.replacedAt}
            version={v}
            idx={idx}
            total={versions.length}
            expanded={expandedIdx === idx}
            onToggle={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
          />
        ))}
      </div>
    </div>
  )
}

function VersionItem({
  version, idx, total, expanded, onToggle,
}: {
  version: ReportVersion
  idx: number
  total: number
  expanded: boolean
  onToggle: () => void
}) {
  const d = new Date(version.replacedAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  const timeLabel = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full text-left flex items-center gap-2 px-3 py-2 bg-slate-50/80 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <span className="text-[9px] text-slate-400">{expanded ? '▼' : '▶'}</span>
        <span className="text-[11px] font-mono text-slate-600">{timeLabel}</span>
        <span className="text-[10px] text-slate-400 ml-auto">{version.taskCount}개</span>
        <span className="text-[9px] text-slate-400 font-mono bg-slate-200 px-1.5 py-0.5 rounded">
          V{total - idx}
        </span>
      </button>

      {expanded && (
        <div className="mt-1 pl-2 space-y-1">
          {version.tasks.map((t) => {
            const status = STATUS_LABEL[t.status]
            return (
              <div
                key={t.id}
                className="text-[12px] px-3 py-2 bg-white border border-slate-200/70 rounded-lg opacity-75"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-slate-400 text-[11px]">{t.taskNo}</span>
                  {t.category && (
                    <span className="text-indigo-500 text-[10px] font-semibold uppercase tracking-wide">
                      {t.category}
                    </span>
                  )}
                  {status && (
                    <span className={`ml-auto text-[10px] font-medium ${status.cls}`}>
                      {status.ko}
                    </span>
                  )}
                </div>
                <p className="text-slate-600 text-[12px] leading-relaxed whitespace-pre-wrap">
                  {t.content}
                </p>
                {t.taskIssue && (
                  <p className="mt-1 text-[11px] text-rose-500">{t.taskIssue}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
