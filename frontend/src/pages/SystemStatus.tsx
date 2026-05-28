import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/axios'

interface SystemStatusData {
  uptime: { seconds: number; label: string }
  memory: { rssMB: number; heapUsedMB: number; heapTotal: number }
  database: { sizeMB: number; path: string }
  stats: { userCount: number; reportCount: number; taskCount: number }
  runtime: { nodeVersion: string; platform: string }
}

async function fetchSystemStatus(): Promise<SystemStatusData> {
  const { data } = await apiClient.get('/admin/system')
  return data.data
}

export default function SystemStatus() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'system'],
    queryFn: fetchSystemStatus,
    refetchInterval: 30_000,  // auto-refresh every 30 s
  })

  return (
    <div className="max-w-[860px] space-y-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] text-slate-500">
          서버 프로세스 및 데이터베이스 운영 현황 (30초 자동 갱신)
        </p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-[11px] font-mono uppercase tracking-wider px-3 py-1.5 border border-slate-300 text-slate-600 hover:border-slate-500 hover:text-slate-800 disabled:opacity-40 transition-colors rounded-lg"
        >
          {isFetching ? '갱신 중…' : '↻ 갱신'}
        </button>
      </div>

      {isLoading && (
        <div className="py-16 text-center text-slate-400 text-[13px]">로딩 중…</div>
      )}
      {isError && (
        <div className="py-10 text-center text-rose-500 text-[13px]">
          데이터를 불러올 수 없습니다.
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Uptime */}
          <StatusCard title="서버 가동 시간" icon="⏱">
            <BigValue>{data.uptime.label}</BigValue>
            <Sub>{data.uptime.seconds.toLocaleString()}초</Sub>
          </StatusCard>

          {/* Memory */}
          <StatusCard title="메모리 사용량" icon="🧠">
            <BigValue>{data.memory.rssMB} MB</BigValue>
            <Sub>RSS · 힙 {data.memory.heapUsedMB} MB 사용 중</Sub>
            <div className="mt-3">
              <ProgressBar
                value={data.memory.heapUsedMB}
                max={Math.round(data.memory.heapTotal / 1024 / 1024)}
                color="bg-indigo-400"
              />
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                힙 {data.memory.heapUsedMB} / {Math.round(data.memory.heapTotal / 1024 / 1024)} MB
              </p>
            </div>
          </StatusCard>

          {/* Database */}
          <StatusCard title="데이터베이스" icon="🗄">
            <BigValue>{data.database.sizeMB} MB</BigValue>
            <Sub className="truncate" title={data.database.path}>
              {data.database.path.split(/[\\/]/).pop()}
            </Sub>
          </StatusCard>

          {/* Stats */}
          <StatusCard title="데이터 현황" icon="📊">
            <div className="grid grid-cols-3 gap-3 mt-1">
              <StatItem label="사용자" value={data.stats.userCount} />
              <StatItem label="일지" value={data.stats.reportCount} />
              <StatItem label="업무 항목" value={data.stats.taskCount} />
            </div>
          </StatusCard>

          {/* Runtime */}
          <StatusCard title="런타임 환경" icon="⚙️" className="md:col-span-2">
            <div className="flex items-center gap-8 mt-1">
              <InfoRow label="Node.js" value={data.runtime.nodeVersion} />
              <InfoRow label="Platform" value={data.runtime.platform} />
              <OnlineIndicator />
            </div>
          </StatusCard>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────

function StatusCard({
  title, icon, children, className = '',
}: {
  title: string
  icon: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[18px]">{icon}</span>
        <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function BigValue({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[24px] font-bold text-slate-800 font-mono leading-none">{children}</p>
  )
}

function Sub({ children, className = '', title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <p className={`text-[12px] text-slate-400 mt-1 font-mono ${className}`} title={title}>
      {children}
    </p>
  )
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="w-full bg-slate-100 rounded-full h-2">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-[20px] font-bold text-slate-800 font-mono">{value.toLocaleString()}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-[14px] font-mono font-semibold text-slate-700">{value}</p>
    </div>
  )
}

function OnlineIndicator() {
  return (
    <div className="ml-auto flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span className="text-[12px] font-semibold text-emerald-600">ONLINE</span>
    </div>
  )
}
