import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi, type DailyReportFromServer } from '../api/reports'
import { dateToIso, startOfMonth, endOfMonth, formatKoreanDate } from '../utils/date'
import ReportVersionPanel from '../components/ReportVersionPanel'
import HistoryTableView from '../components/HistoryTableView'

type ViewMode = 'calendar' | 'table'

const STATUS_LABEL: Record<string, { ko: string; cls: string }> = {
  COMPLETED:   { ko: '완료',  cls: 'v2-pill-done border border-transparent' },
  IN_PROGRESS: { ko: '진행중', cls: 'v2-pill-doing border border-transparent' },
  ON_HOLD:     { ko: '보류',  cls: 'v2-pill-wait border border-transparent' },
}

export default function MyHistory() {
  const [cursor, setCursor] = useState(new Date())
  const [selectedIso, setSelectedIso] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')

  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const fromIso = dateToIso(monthStart)
  const toIso = dateToIso(monthEnd)

  const historyQuery = useQuery({
    queryKey: ['reports', 'me', 'history', fromIso, toIso],
    queryFn: () => reportsApi.getMyHistory(fromIso, toIso),
  })

  const reportsByDate = useMemo(() => {
    const map = new Map<string, DailyReportFromServer>()
    historyQuery.data?.forEach((r) => {
      map.set(r.reportDate.slice(0, 10), r)
    })
    return map
  }, [historyQuery.data])

  const calendarDays = useMemo(() => {
    const firstDayOfWeek = monthStart.getDay()
    const daysInMonth = monthEnd.getDate()
    const cells: { iso: string | null; day: number | null }[] = []
    for (let i = 0; i < firstDayOfWeek; i++) cells.push({ iso: null, day: null })
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), d)
      cells.push({ iso: dateToIso(date), day: d })
    }
    return cells
  }, [cursor, monthStart, monthEnd])

  const selectedReport = selectedIso ? reportsByDate.get(selectedIso) : null
  const todayIsoStr = dateToIso(new Date())
  const submitCount = historyQuery.data?.length ?? 0
  const allReports = historyQuery.data ?? []

  const navPrev = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
  const navNext = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
  const navToday = () => setCursor(new Date())

  return (
    <div className="px-12 py-10 max-w-[1180px]">

      {/* View mode toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex border-[1.5px] overflow-hidden" style={{ borderColor: 'var(--v2-line)', borderRadius: '4px' }}>
          {(['calendar', 'table'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="px-4 py-1.5 text-[12px] font-mono uppercase tracking-wider font-semibold transition-colors"
              style={{
                background: viewMode === mode ? 'var(--v2-accent)' : 'var(--v2-paper)',
                color: viewMode === mode ? 'var(--v2-cream)' : 'var(--v2-ink-muted)',
                borderRight: mode === 'calendar' ? '1px solid var(--v2-line)' : undefined,
              }}
            >
              {mode === 'calendar' ? '캘린더' : '전체보기'}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <HistoryTableView
            reports={allReports}
            cursor={cursor}
            onPrev={navPrev}
            onNext={navNext}
            onToday={navToday}
            submitCount={submitCount}
          />
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              ← 이전달
            </button>
            <div className="flex items-center gap-3">
              <h3 className="text-[20px] font-bold tracking-tight num-mono">
                {cursor.getFullYear()}.{String(cursor.getMonth() + 1).padStart(2, '0')}
              </h3>
              <button
                onClick={() => setCursor(new Date())}
                className="text-[11px] px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-medium border border-indigo-100"
              >
                오늘
              </button>
            </div>
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              다음달 →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <div
                key={d}
                className={`text-center text-[11px] font-semibold py-1.5 tracking-widest ${
                  i === 0 ? 'text-rose-500' : i === 6 ? 'text-indigo-500' : 'text-slate-500'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, idx) => {
              const isToday = cell.iso === todayIsoStr
              const hasReport = cell.iso && reportsByDate.has(cell.iso)
              const isSelected = cell.iso === selectedIso
              const dow = idx % 7
              const dayClass = !isSelected && cell.iso
                ? dow === 0
                  ? 'text-rose-500'
                  : dow === 6
                  ? 'text-indigo-500'
                  : ''
                : ''
              return (
                <button
                  key={idx}
                  disabled={!cell.iso}
                  onClick={() => cell.iso && setSelectedIso(cell.iso)}
                  className={`aspect-square flex flex-col items-center justify-center text-[13px] rounded-lg transition-colors relative num-mono ${
                    !cell.iso
                      ? 'invisible'
                      : isSelected
                      ? 'bg-slate-900 text-white font-semibold'
                      : isToday
                      ? 'bg-indigo-50 border border-indigo-200 hover:bg-indigo-100'
                      : hasReport
                      ? 'bg-emerald-50/60 border border-emerald-100 hover:bg-emerald-100/60'
                      : 'hover:bg-slate-100'
                  } ${dayClass}`}
                >
                  <span>{cell.day}</span>
                  {hasReport && !isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-500" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-5 flex items-center gap-5 text-[11.5px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-100" /> 제출함
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-50 border border-indigo-200" /> 오늘
            </span>
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h3 className="text-[15px] font-bold text-slate-900 mb-4">
            {selectedIso ? formatKoreanDate(selectedIso) : '날짜를 선택하세요'}
          </h3>

          {!selectedIso && (
            <p className="text-[13px] text-slate-400 text-center py-12 leading-relaxed">
              왼쪽 캘린더에서 날짜를 클릭하면<br />
              해당 일자의 업무일지를 볼 수 있습니다.
            </p>
          )}
          {selectedIso && !selectedReport && (
            <p className="text-[13px] text-slate-400 text-center py-12">제출된 일지가 없습니다.</p>
          )}

          {selectedReport && (
            <div className="space-y-5">
              <div className="text-[13px] text-slate-500 num-mono">
                근무시간: {selectedReport.workHours || '—'}
              </div>

              <div>
                <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  업무 항목
                </h4>
                <ul className="space-y-2.5">
                  {selectedReport.tasks.map((t) => {
                    const status = STATUS_LABEL[t.status]
                    return (
                      <li
                        key={t.id}
                        className="text-[13px] bg-slate-50 rounded-xl p-3 border border-slate-200"
                      >
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-[12px] num-mono text-slate-400 mt-0.5">{t.taskNo}</span>
                          {t.category && (
                            <span className="text-[11px] uppercase tracking-wider text-indigo-600 font-semibold">
                              {t.category}
                            </span>
                          )}
                          {status && (
                            <span
                              className={`ml-auto text-[11px] px-2 py-0.5 rounded-md border font-medium ${status.cls}`}
                            >
                              {status.ko}
                            </span>
                          )}
                        </div>
                        <pre className="whitespace-pre-wrap font-sans text-slate-700 text-[13px] leading-relaxed">
                          {t.content}
                        </pre>
                        {t.taskIssue && (
                          <div className="mt-1.5 text-[12px] text-rose-600 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-rose-500" />
                            {t.taskIssue}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>

              {selectedReport.issues && (
                <DetailField label="이슈 및 특이사항" value={selectedReport.issues} />
              )}
              {selectedReport.remarks && (
                <DetailField label="비고" value={selectedReport.remarks} />
              )}

              {selectedReport.id && (
                <ReportVersionPanel reportId={selectedReport.id} />
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}
      </h4>
      <p className="text-[13px] text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-200 leading-relaxed">
        {value}
      </p>
    </div>
  )
}
