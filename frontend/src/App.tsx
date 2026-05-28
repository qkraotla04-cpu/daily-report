import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import MainLayout from './layouts/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DailyReport from './pages/DailyReport'
import MyHistory from './pages/MyHistory'
import DailyAggregation from './pages/DailyAggregation'
import WeeklySummary from './pages/WeeklySummary'
import Admin from './pages/Admin'
import MemberHistory from './pages/MemberHistory'
import PrintAggregation from './pages/PrintAggregation'

// 로그인 필요 가드
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

// 역할 기반 가드 — 권한 없는 역할이면 대시보드로 리다이렉트
function RoleRoute({
  children,
  roles,
}: {
  children: React.ReactNode
  roles: Array<'ADMIN' | 'TEAM_LEAD' | 'MEMBER'>
}) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      {/* 인쇄용 — 사이드바 없는 단독 페이지 (ADMIN/TEAM_LEAD 전용) */}
      <Route
        path="/print/aggregation/:date"
        element={
          <PrivateRoute>
            <RoleRoute roles={['ADMIN', 'TEAM_LEAD']}>
              <PrintAggregation />
            </RoleRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        {/* 전체 역할 접근 */}
        <Route index element={<Dashboard />} />
        <Route path="daily" element={<DailyReport />} />
        <Route path="my-history" element={<MyHistory />} />

        {/* ADMIN / TEAM_LEAD 전용 */}
        <Route
          path="aggregation"
          element={
            <RoleRoute roles={['ADMIN', 'TEAM_LEAD']}>
              <DailyAggregation />
            </RoleRoute>
          }
        />
        <Route
          path="weekly"
          element={
            <RoleRoute roles={['ADMIN', 'TEAM_LEAD']}>
              <WeeklySummary />
            </RoleRoute>
          }
        />

        {/* ADMIN 전용 */}
        <Route
          path="admin"
          element={
            <RoleRoute roles={['ADMIN']}>
              <Admin />
            </RoleRoute>
          }
        />
        <Route
          path="admin/member-history"
          element={
            <RoleRoute roles={['ADMIN']}>
              <MemberHistory />
            </RoleRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
