import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { adminApi, type AdminUser, type Role } from '../api/admin'
import { useAuth } from '../contexts/AuthContext'

const ROLES: Role[] = ['ADMIN', 'TEAM_LEAD', 'MEMBER']

export default function Admin() {
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [resetForId, setResetForId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.listUsers(),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => adminApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: (err: AxiosError<{ error: { message: string } }>) =>
      setError(err.response?.data?.error?.message || '비활성화 실패'),
  })

  const handleDelete = (u: AdminUser) => {
    if (u.id === me?.id) {
      setError('본인 계정은 비활성화할 수 없습니다.')
      return
    }
    if (!confirm(`${u.name} (${u.employeeNo}) 계정을 비활성화 하시겠습니까?`)) return
    setError('')
    deleteMut.mutate(u.id)
  }

  return (
    <div className="px-12 py-10 max-w-[1180px]">
      <header className="mb-8 flex items-end justify-between">
        <div />
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-[13px] font-medium"
        >
          + 사용자 추가
        </button>
      </header>

      {error && (
        <div className="mb-3 text-[13px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2.5">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <table className="w-full text-[14px]">
          <thead className="text-[12px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th className="text-left font-semibold py-3 px-4">사번</th>
              <th className="text-left font-semibold py-3 px-4">이름</th>
              <th className="text-left font-semibold py-3 px-4">역할</th>
              <th className="text-left font-semibold py-3 px-4">팀</th>
              <th className="text-left font-semibold py-3 px-4">이메일</th>
              <th className="text-left font-semibold py-3 px-4">상태</th>
              <th className="text-right font-semibold py-3 px-4">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usersQuery.isLoading && (
              <tr>
                <td colSpan={7} className="text-center text-slate-400 py-10">불러오는 중...</td>
              </tr>
            )}
            {usersQuery.data?.map((u) => (
              <tr key={u.id} className={`hover:bg-slate-50/50 ${!u.isActive ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 num-mono text-[13px] text-slate-600">{u.employeeNo}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                <td className="px-4 py-3 text-slate-600">{u.team || '—'}</td>
                <td className="px-4 py-3 text-slate-500 text-[12px]">{u.email || '—'}</td>
                <td className="px-4 py-3">
                  {u.isActive ? (
                    <span className="text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-medium">활성</span>
                  ) : (
                    <span className="text-[12px] text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-medium">비활성</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                  <button onClick={() => setEditingId(u.id)} className="text-[13px] text-indigo-600 hover:underline font-medium">
                    수정
                  </button>
                  <button onClick={() => setResetForId(u.id)} className="text-[13px] text-amber-600 hover:underline font-medium">
                    비번재설정
                  </button>
                  {u.isActive && (
                    <button onClick={() => handleDelete(u)} className="text-[13px] text-rose-600 hover:underline font-medium">
                      비활성화
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ['admin', 'users'] })
            setShowCreate(false)
          }}
        />
      )}

      {editingId !== null && usersQuery.data && (
        <EditUserModal
          user={usersQuery.data.find((u) => u.id === editingId)!}
          onClose={() => setEditingId(null)}
          onUpdated={() => {
            qc.invalidateQueries({ queryKey: ['admin', 'users'] })
            setEditingId(null)
          }}
        />
      )}

      {resetForId !== null && usersQuery.data && (
        <ResetPasswordModal
          user={usersQuery.data.find((u) => u.id === resetForId)!}
          onClose={() => setResetForId(null)}
        />
      )}
    </div>
  )
}

function RoleBadge({ role }: { role: Role }) {
  const styles =
    role === 'ADMIN'
      ? 'bg-purple-50 text-purple-700 border border-purple-100'
      : role === 'TEAM_LEAD'
        ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
        : 'bg-slate-100 text-slate-700 border border-slate-200'
  const label = role === 'ADMIN' ? '관리자' : role === 'TEAM_LEAD' ? '팀장' : '팀원'
  return <span className={`text-[12px] px-2 py-0.5 rounded-md font-medium ${styles}`}>{label}</span>
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-[16px] font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    employeeNo: '',
    name: '',
    role: 'MEMBER' as Role,
    team: '생산팀',
    email: '',
  })
  const [error, setError] = useState('')

  const mut = useMutation({
    mutationFn: () =>
      adminApi.createUser({
        employeeNo: form.employeeNo,
        name: form.name,
        role: form.role,
        team: form.team,
        email: form.email || null,
      }),
    onSuccess: onCreated,
    onError: (err: AxiosError<{ error: { message: string } }>) =>
      setError(err.response?.data?.error?.message || '생성 실패'),
  })

  return (
    <ModalShell title="사용자 추가" onClose={onClose}>
      <div className="space-y-3">
        <Input label="사번" value={form.employeeNo} onChange={(v) => setForm({ ...form, employeeNo: v })} />
        <Input label="이름" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <div>
          <label className="block text-xs text-gray-600 mb-1">역할</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            className="w-full text-[13.5px] border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r === 'ADMIN' ? '관리자' : r === 'TEAM_LEAD' ? '팀장' : '팀원'}
              </option>
            ))}
          </select>
        </div>
        <Input label="팀" value={form.team} onChange={(v) => setForm({ ...form, team: v })} />
        <Input label="이메일 (선택)" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <p className="text-[12px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          🔑 초기 비밀번호 <strong>0000</strong> 으로 자동 설정 — 첫 로그인 시 변경 강제
        </p>

        {error && <p className="text-sm text-red-600">⚠️ {error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-2 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg">
            취소
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={!form.employeeNo || !form.name || mut.isPending}
            className="px-4 py-2 text-[13px] bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium rounded-lg"
          >
            {mut.isPending ? '생성 중...' : '생성'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

function EditUserModal({ user, onClose, onUpdated }: { user: AdminUser; onClose: () => void; onUpdated: () => void }) {
  const [form, setForm] = useState({
    name: user.name,
    role: user.role,
    team: user.team || '',
    email: user.email || '',
    isActive: user.isActive,
  })
  const [error, setError] = useState('')

  const mut = useMutation({
    mutationFn: () =>
      adminApi.updateUser(user.id, {
        name: form.name,
        role: form.role,
        team: form.team,
        email: form.email || null,
        isActive: form.isActive,
      }),
    onSuccess: onUpdated,
    onError: (err: AxiosError<{ error: { message: string } }>) =>
      setError(err.response?.data?.error?.message || '수정 실패'),
  })

  return (
    <ModalShell title={`${user.name} 수정`} onClose={onClose}>
      <div className="space-y-3">
        <Input label="이름" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <div>
          <label className="block text-xs text-gray-600 mb-1">역할</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            className="w-full text-[13.5px] border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r === 'ADMIN' ? '관리자' : r === 'TEAM_LEAD' ? '팀장' : '팀원'}
              </option>
            ))}
          </select>
        </div>
        <Input label="팀" value={form.team} onChange={(v) => setForm({ ...form, team: v })} />
        <Input label="이메일" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          활성 상태
        </label>

        {error && <p className="text-sm text-red-600">⚠️ {error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-2 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg">
            취소
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="px-4 py-2 text-[13px] bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium rounded-lg"
          >
            {mut.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

function ResetPasswordModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const mut = useMutation({
    mutationFn: () => adminApi.resetPassword(user.id),
    onSuccess: () => {
      setError('')
      setDone(true)
      setTimeout(onClose, 1500)
    },
    onError: (err: AxiosError<{ error: { message: string } }>) =>
      setError(err.response?.data?.error?.message || '재설정 실패'),
  })

  return (
    <ModalShell title={`${user.name} 비밀번호 초기화`} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-[13px] text-amber-800">
          <p className="font-medium mb-1">비밀번호를 초기화하시겠습니까?</p>
          <p>
            <strong>{user.name}</strong> ({user.employeeNo}) 의 비밀번호가{' '}
            <strong>0000</strong> 으로 초기화됩니다.
          </p>
          <p className="mt-1 text-amber-600 text-[12px]">다음 로그인 시 새 비밀번호 변경이 강제됩니다.</p>
        </div>
        {error && <p className="text-sm text-red-600">⚠️ {error}</p>}
        {done && <p className="text-sm text-green-600">✅ 초기화 완료 — 비밀번호: 0000</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-2 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg">
            취소
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || done}
            className="px-4 py-2 text-[13px] bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-medium rounded-lg"
          >
            {mut.isPending ? '처리 중...' : '0000으로 초기화'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-[12px] text-slate-600 mb-1.5 font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-[13.5px] border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  )
}
