import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi, type AdminReportRow } from '../api/admin'
import MemberHistoryDetail from './MemberHistoryDetail'

const REPORT_STATUS: Record<string, { ko: string; cls: string }> = {
  SUBMITTED: { ko: '제출됨',  cls: 'text-emerald-400 bg-emerald-900/30 border-emerald-800' },
  DRAFT:     { ko: '임시저장', cls: 'text-amber-400  bg-amber-900/30  border-amber-800'    },
  APPROVED:  { ko: '승인됨',  cls: 'text-teal-400   bg-teal-900/30   border-teal-800'     },
}

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${days[d.getDay()]})`
}

const INPUT_CLS =
  'text-[13px] bg-slate-700 text-slate-100 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 [color-scheme:dark]'

export default function MemberHistory() {
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('')
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single')
  const [singleDate, setSingleDate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [selectedReport, setSelectedReport] = useState<AdminReportRow | null>(null)

  const membersQuery = useQuery({
    queryKey: ['admin', 'members'],
    queryFn: () => adminApi.listMembers(),
    staleTime: 5 * 60 * 1000,
  })

  const queryParams = {
    userId: selectedUserId !== '' ? selectedUserId : undefined,
    date: dateMode === 'single' ? (singleDate || undefined) : undefined,
    startDate: dateMode === 'range' ? (startDate || undefined) : undefined,
    endDate: dateMode === 'range' ? (endDate || undefined) : undefined,
    page,
    limit: 15,
  }

  const reportsQuery = useQuery({
    queryKey: ['admin', 'reports', queryParams],
    queryFn: () => adminApi.getMemberReports(queryParams),
    placeholderData: (prev) => prev,
  })

  const result = reportsQuery.data
  const reports = result?.reports ?? []

  const handleFilterChange = () => { setPage(1); setSelectedReport(null) }
  const handleSelectReport = (r: AdminReportRow) => {
    setSelectedReport((prev) => (prev?.id === r.id ? null : r))
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedReport ? '1fr 420px' : '1fr', gap: 20, height: '100%' }}>

      {/* ── Left panel ── */}
      <div>

        {/* Filter bar */}
        <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-5 mb-5 backdrop-blur-sm">
          <div className="flex flex-wrap gap-3 items-end">

            {/* Member selector */}
            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em]">팀원</label>
              <select
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value === '' ? '' : Number(e.target.value))
                  handleFilterChange()
                }}
                className={INPUT_CLS}
              >
                <option value="">전체</option>
                {membersQuery.data?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.employeeNo})
                  </option>
                ))}
              </select>
            </div>

            {/* Date mode toggle */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em]">날짜 유형</label>
              <div className="flex rounded-lg overflow-hidden border border-slate-600 text-[12px] font-semibold">
                <button
                  onClick={() => { setDateMode('single'); handleFilterChange() }}
                  className={`px-3 py-2 transition-colors ${
                    dateMode === 'single'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >특정일</button>
                <button
                  onClick={() => { setDateMode('range'); handleFilterChange() }}
                  className={`px-3 py-2 border-l border-slate-600 transition-colors ${
                    dateMode === 'range'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >기간</button>
              </div>
            </div>

            {/* Date inputs */}
            {dateMode === 'single' ? (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em]">날짜</label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => { setSingleDate(e.target.value); handleFilterChange() }}
                  className={`${INPUT_CLS} num-mono`}
                />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em]">시작일</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); handleFilterChange() }}
                    className={`${INPUT_CLS} num-mono`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em]">종료일</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); handleFilterChange() }}
                    className={`${INPUT_CLS} num-mono`}
                  />
                </div>
              </>
            )}

            {/* Reset */}
            <button
              onClick={() => {
                setSelectedUserId(''); setSingleDate(''); setStartDate(''); setEndDate('')
                handleFilterChange()
              }}
              className="text-[12px] px-3 py-2 border border-slate-600 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-200 bg-slate-800 transition-colors"
            >초기화</button>
          </div>
        </div>

        {/* Summary bar */}
        {result && (
          <div className="flex items-center gap-4 mb-3 text-[12px] text-slate-500 px-1">
            <span>총 <strong className="text-slate-200 num-mono">{result.total}</strong>건</span>
            <span className="num-mono">{result.page} / {result.totalPages} 페이지</span>
            {reportsQuery.isFetching && <span className="text-teal-500">불러오는 중...</span>}
          </div>
        )}

        {/* Report list */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
          {reportsQuery.isLoading ? (
            <div className="text-center text-slate-500 py-12 text-[13px]">불러오는 중...</div>
          ) : reports.length === 0 ? (
            <div className="text-center text-slate-500 py-12 text-[13px]">조건에 맞는 업무일지가 없습니다.</div>
          ) : (
            <table className="w-full text-[13px]">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-700 bg-slate-900/40">
                <tr>
                  <th className="text-left font-semibold py-2.5 px-4">날짜</th>
                  <th className="text-left font-semibold py-2.5 px-4">팀원</th>
                  <th className="text-left font-semibold py-2.5 px-4">근무시간</th>
                  <th className="text-left font-semibold py-2.5 px-4">업무 수</th>
                  <th className="text-left font-semibold py-2.5 px-4">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {reports.map((r) => {
                  const st = REPORT_STATUS[r.status]
                  const isSelected = selectedReport?.id === r.id
                  return (
                    <tr
                      key={r.id}
                      onClick={() => handleSelectReport(r)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-teal-900/25 border-l-2 border-teal-500'
                          : 'hover:bg-slate-700/30'
                      }`}
                    >
                      <td className="px-4 py-3 num-mono text-slate-300">{fmtDate(r.reportDate.slice(0, 10))}</td>
                      <td className="px-4 py-3 font-medium text-slate-100">
                        {r.user.name}
                        <span className="text-[11px] text-slate-500 ml-1.5 num-mono">{r.user.employeeNo}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 num-mono">{r.workHours || '—'}</td>
                      <td className="px-4 py-3 text-slate-300 num-mono font-semibold">{r.tasks.length}건</td>
                      <td className="px-4 py-3">
                        {st && (
                          <span className={`text-[11px] px-2 py-0.5 rounded-md border font-medium ${st.cls}`}>
                            {st.ko}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {result && result.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-[12px] border border-slate-600 rounded-lg text-slate-300 disabled:opacity-40 hover:bg-slate-700 bg-slate-800 transition-colors"
            >이전</button>
            <span className="text-[12px] text-slate-500 num-mono">{page} / {result.totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
              disabled={page >= result.totalPages}
              className="px-3 py-1.5 text-[12px] border border-slate-600 rounded-lg text-slate-300 disabled:opacity-40 hover:bg-slate-700 bg-slate-800 transition-colors"
            >다음</button>
          </div>
        )}
      </div>

      {/* ── Right panel: detail ── */}
      {selectedReport && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 overflow-y-auto">
          <MemberHistoryDetail
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
          />
        </div>
      )}
    </div>
  )
}
