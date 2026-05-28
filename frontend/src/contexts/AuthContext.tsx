import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { apiClient, setAccessToken } from '../api/axios'

export interface AuthUser {
  id: number
  name: string
  role: 'ADMIN' | 'TEAM_LEAD' | 'MEMBER'
  team: string
  employeeNo: string
  email: string | null
  isFirstLogin: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isBypass: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  firstLoginChange: (newPassword: string) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const BYPASS_ENABLED = import.meta.env.VITE_AUTH_BYPASS === 'true'
const BYPASS_USER    = import.meta.env.VITE_BYPASS_USER ?? 'admin'
const BYPASS_PASS    = import.meta.env.VITE_BYPASS_PASS ?? 'changeme1234'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const restoreSession = useCallback(async () => {
    try {
      const { data } = await apiClient.post('/auth/refresh')
      setAccessToken(data.data.accessToken)
      setUser(data.data.user)
    } catch {
      // 비로그인 상태 — 정상
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (BYPASS_ENABLED) {
      // 우회 모드: 기존 세션 → 실패 시 자동 로그인
      apiClient.post('/auth/refresh')
        .then(({ data }) => { setAccessToken(data.data.accessToken); setUser(data.data.user) })
        .catch(() =>
          apiClient.post('/auth/login', { email: BYPASS_USER, password: BYPASS_PASS })
            .then(({ data }) => { setAccessToken(data.data.accessToken); setUser(data.data.user) })
            .catch(err => console.error('[AUTH-BYPASS] 자동 로그인 실패:', err))
        )
        .finally(() => setIsLoading(false))
      return
    }
    restoreSession()
  }, [restoreSession])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { email, password })
    setAccessToken(data.data.accessToken)
    setUser(data.data.user)
  }, [])

  const logout = useCallback(async () => {
    if (BYPASS_ENABLED) return
    try { await apiClient.post('/auth/logout') } finally {
      setAccessToken(null)
      setUser(null)
    }
  }, [])

  // 첫 로그인 비밀번호 변경 — 완료 후 user.isFirstLogin 갱신
  const firstLoginChange = useCallback(async (newPassword: string) => {
    await apiClient.post('/auth/first-login-change', { newPassword })
    setUser(prev => prev ? { ...prev, isFirstLogin: false } : null)
  }, [])

  // 세션 새로고침 (비밀번호 변경 등 후 호출)
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await apiClient.post('/auth/refresh')
      setAccessToken(data.data.accessToken)
      setUser(data.data.user)
    } catch { /* ignore */ }
  }, [])

  return (
    <AuthContext.Provider value={{
      user, isLoading, isBypass: BYPASS_ENABLED,
      login, logout, firstLoginChange, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth는 AuthProvider 내에서만 사용할 수 있습니다.')
  return ctx
}
