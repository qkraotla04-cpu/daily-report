import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const PAGE_TITLES: Record<string, { code: string; label: string; titleMain: string; titleAccent: string; sub: string }> = {
  '/':            { code: 'HOME',  label: '대시보드',     titleMain: '대시',   titleAccent: '보드',     sub: 'PERSONAL OVERVIEW · DASHBOARD' },
  '/daily':       { code: 'A.01', label: '오늘 업무일지', titleMain: '오늘',   titleAccent: '업무일지',  sub: 'DAILY WORK LOG · TODAY' },
  '/my-history':  { code: 'A.02', label: '내 이력',       titleMain: '내',     titleAccent: '이력',     sub: 'PERSONAL HISTORY · RECORD' },
  '/aggregation': { code: 'B.01', label: '일일 취합본',   titleMain: '일일',   titleAccent: '취합본',    sub: 'DAILY AGGREGATION · TEAM VIEW' },
  '/weekly':      { code: 'B.02', label: '주간 요약',     titleMain: '주간',   titleAccent: '요약',     sub: 'WEEKLY SUMMARY · DIGEST' },
  '/admin':                { code: 'C.01', label: '사용자 관리',   titleMain: '사용자', titleAccent: '관리',     sub: 'USER MANAGEMENT · ADMIN' },
  '/admin/member-history': { code: 'C.02', label: '팀원 업무 이력', titleMain: '팀원',   titleAccent: '업무 이력', sub: 'MEMBER HISTORY · ADMIN' },
  '/admin/system':         { code: 'C.03', label: '시스템 현황',   titleMain: '시스템', titleAccent: '현황',     sub: 'SYSTEM STATUS · OPS' },
}

interface NavItem { code: string; to: string; label: string; roles: string[] }

const NAV: NavItem[] = [
  { code: 'A.00', to: '/',            label: '대시보드',      roles: ['ADMIN', 'TEAM_LEAD', 'MEMBER'] },
  { code: 'A.01', to: '/daily',       label: '오늘 업무일지', roles: ['ADMIN', 'TEAM_LEAD', 'MEMBER'] },
  { code: 'A.02', to: '/my-history',  label: '내 이력',       roles: ['ADMIN', 'TEAM_LEAD', 'MEMBER'] },
  { code: 'B.01', to: '/aggregation', label: '일일 취합본',   roles: ['ADMIN', 'TEAM_LEAD'] },
  { code: 'B.02', to: '/weekly',      label: '주간 요약',     roles: ['ADMIN', 'TEAM_LEAD'] },
  { code: 'C.01', to: '/admin',                label: '사용자 관리',   roles: ['ADMIN'] },
  { code: 'C.02', to: '/admin/member-history', label: '팀원 업무 이력', roles: ['ADMIN'] },
  { code: 'C.03', to: '/admin/system',         label: '시스템 현황',   roles: ['ADMIN'] },
]

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const ROLE_LABEL: Record<string, string> = { ADMIN: '관리자', TEAM_LEAD: '팀장', MEMBER: '팀원' }

const secLabel = (text: string, topBorder = false) => (
  <div style={{
    fontFamily: 'var(--v2-font-mono)', fontSize: 10, letterSpacing: '0.22em',
    color: 'var(--v2-ink-faint)', fontWeight: 700,
    padding: topBorder ? '16px 22px 8px' : '5px 22px 6px',
    textTransform: 'uppercase' as const,
    display: 'flex', alignItems: 'center', gap: 7,
    ...(topBorder ? { borderTop: '1px dashed var(--v2-line-dash)', marginTop: 8 } : {}),
  }}>
    <span style={{ width: 4, height: 4, background: 'var(--v2-accent)', display: 'inline-block', flexShrink: 0, opacity: 0.55 }} />
    {text}
  </div>
)

function SidebarItem({ code, to, label }: { code: string; to: string; label: string }) {
  const [hovered, setHovered] = useState(false)
  const location = useLocation()
  const isActive = to === '/' ? location.pathname === '/' : location.pathname === to

  return (
    <NavLink
      to={to}
      end={to === '/'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 22px',
        color: isActive ? 'var(--v2-accent)' : hovered ? 'var(--v2-ink)' : 'var(--v2-ink-muted)',
        borderLeft: isActive || hovered ? '3px solid var(--v2-accent)' : '3px solid transparent',
        background: isActive ? 'var(--v2-accent-soft)' : hovered ? 'var(--v2-paper-warm)' : 'transparent',
        fontWeight: isActive ? 800 : 600, fontSize: 12, letterSpacing: '0.04em',
        textTransform: 'uppercase' as const, textDecoration: 'none', transition: 'all 0.15s',
      }}
    >
      <span style={{
        fontFamily: 'var(--v2-font-mono)', fontSize: 10, letterSpacing: '0.12em', fontWeight: 700,
        marginRight: 2, transition: 'color 0.15s',
        color: isActive || hovered ? 'var(--v2-accent)' : 'var(--v2-ink-faint)',
      }}>{code}</span>
      {label}
    </NavLink>
  )
}

export default function MainLayout() {
  const { user, logout, isBypass } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const pageInfo = PAGE_TITLES[location.pathname] ?? { code: '—', label: location.pathname, titleMain: '', titleAccent: location.pathname, sub: '' }

  const [clock, setClock] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('')
  const [logoutHover, setLogoutHover] = useState(false)
  const [themeHover, setThemeHover] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('dr-theme') as 'dark' | 'light') || 'dark'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('dr-theme', theme)
  }, [theme])

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      setClock(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`)
      setDateStr(`${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`)
      setDayOfWeek(DAYS[now.getDay()] + '요일')
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const isDark = theme === 'dark'
  const headerBg = isDark ? 'rgba(7,24,46,0.97)' : 'rgba(232,243,255,0.97)'
  const handleLogout = async () => { await logout(); navigate('/login') }
  const visible   = NAV.filter((n) => user && n.roles.includes(user.role))
  const hasManage = visible.some((n) => n.code.startsWith('B') || n.code.startsWith('C'))

  return (
    <div style={{ display: 'flex', height: '100dvh', color: 'var(--v2-ink)', fontFamily: 'var(--v2-font-sans)' }}>

      {/* ══ 좌측 사이드바 — 브랜드·네비·푸터 하나의 세로 컬럼 ══ */}
      <div style={{ width: 240, flexShrink: 0, background: 'var(--v2-paper)', borderRight: '2px solid var(--v2-ink)', display: 'flex', flexDirection: 'column', zIndex: 30, boxShadow: 'inset -4px 0 12px rgba(0,0,0,0.18)' }}>

        {/* 브랜드 블록 — 자연 높이에서 경계선 끊음 */}
        <NavLink
          to="/"
          end
          style={{
            flexShrink: 0,
            padding: '18px 18px 16px',
            background: 'var(--v2-paper-warm)',
            display: 'flex', alignItems: 'flex-start', gap: 12,
            textDecoration: 'none', transition: 'opacity 0.15s',
            borderBottom: '2px solid var(--v2-ink)',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <div style={{ width: 38, height: 38, background: 'var(--v2-ink)', color: 'var(--v2-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--v2-font-mono)', fontWeight: 800, fontSize: 11, flexShrink: 0, position: 'relative', borderRadius: 2, lineHeight: 1.1, textAlign: 'center' }}>
            L&amp;K
            <span style={{ position: 'absolute', inset: 3, border: '1px dashed rgba(7,24,46,0.4)', borderRadius: 1 }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15, color: 'var(--v2-ink)' }}>
              L&amp;K <em style={{ fontStyle: 'normal', color: 'var(--v2-accent)' }}>BIOMED</em>
            </div>
            <div style={{ fontFamily: 'var(--v2-font-mono)', fontSize: 8, letterSpacing: '0.2em', color: 'var(--v2-ink-faint)', marginTop: 4, fontWeight: 700, textTransform: 'uppercase' }}>
              DAILY · REPORT · {isDark ? 'DARK' : 'LITE'}
            </div>
          </div>
        </NavLink>

        {/* 네비게이션 — 경계선 바로 아래 시작 */}
        <nav style={{ flex: 1, padding: '15px 0 14px', overflowY: 'auto', position: 'relative' }}>
          <span style={{ position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderTop: '1.5px solid var(--v2-accent)', borderRight: '1.5px solid var(--v2-accent)', opacity: 0.35, pointerEvents: 'none' }} />
          {secLabel('업무일지')}
          {visible.filter((n) => n.code.startsWith('A')).map((n) => <SidebarItem key={n.to} {...n} />)}
          {hasManage && secLabel('관리', true)}
          {visible.filter((n) => n.code.startsWith('B') || n.code.startsWith('C')).map((n) => <SidebarItem key={n.to} {...n} />)}
        </nav>

        {/* 푸터 */}
        <div style={{ borderTop: '2px solid var(--v2-ink)', background: 'var(--v2-paper-warm)', padding: '14px 18px', position: 'relative' }}>
          <span style={{ position: 'absolute', bottom: 7, right: 7, width: 8, height: 8, borderBottom: '1.5px solid var(--v2-accent)', borderRight: '1.5px solid var(--v2-accent)', opacity: 0.35, pointerEvents: 'none' }} />
          <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{ width: 26, height: 26, flexShrink: 0, background: 'var(--v2-ink)', color: 'var(--v2-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--v2-font-mono)', fontSize: 11, fontWeight: 800, borderRadius: 2, position: 'relative' }}>
                {user?.name?.[0] ?? '?'}
                <span style={{ position: 'absolute', inset: 2, border: '1px dashed rgba(7,24,46,0.35)', borderRadius: 1 }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--v2-ink)', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                <div style={{ fontFamily: 'var(--v2-font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--v2-ink-faint)', marginTop: 3, fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--v2-state-done)', display: 'inline-block', flexShrink: 0 }} />
                  {ROLE_LABEL[user?.role ?? 'MEMBER']}{isBypass && ' · BYPASS'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button
                onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                style={{ background: 'none', border: '1px solid', borderColor: themeHover ? 'var(--v2-accent)' : 'var(--v2-line)', color: themeHover ? 'var(--v2-accent)' : 'var(--v2-ink-muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '4px 7px', transition: 'all 0.15s', fontFamily: 'var(--v2-font-mono)', fontWeight: 700, borderRadius: 2 }}
                onMouseEnter={() => setThemeHover(true)}
                onMouseLeave={() => setThemeHover(false)}
                title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
              >{isDark ? '☀' : '☽'}</button>
              {!isBypass && (
                <button
                  onClick={handleLogout}
                  style={{ background: 'none', border: '1px solid', borderColor: logoutHover ? 'var(--v2-state-danger)' : 'var(--v2-line)', color: logoutHover ? 'var(--v2-state-danger)' : 'var(--v2-ink-muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '4px 7px', transition: 'all 0.15s', fontFamily: 'var(--v2-font-mono)', fontWeight: 700, borderRadius: 2 }}
                  onMouseEnter={() => setLogoutHover(true)}
                  onMouseLeave={() => setLogoutHover(false)}
                  title="로그아웃"
                >⏏</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 우측 영역 — 페이지 헤더 + 메인 콘텐츠 ══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 페이지 헤더 */}
        <div style={{ flexShrink: 0, background: headerBg, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'stretch', borderBottom: '2px solid var(--v2-ink)', minHeight: 102, zIndex: 29 }}>

          {/* 레퍼런스 라인(상단) + 타이틀(하단) */}
          <div style={{ flex: 1, padding: '10px 24px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--v2-font-mono)', fontSize: 8.5, letterSpacing: '0.22em', color: 'var(--v2-ink-faint)', fontWeight: 700 }}>
              <span style={{ display: 'inline-block', width: 18, height: 1.5, background: 'var(--v2-accent)', flexShrink: 0 }} />
              DR · SYS · {pageInfo.code} · REV A
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--v2-ink)', whiteSpace: 'nowrap' }}>
                {pageInfo.titleMain}{' '}{pageInfo.titleAccent}
              </div>
              <div style={{ fontFamily: 'var(--v2-font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--v2-ink-muted)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pageInfo.sub}
              </div>
            </div>
          </div>

          {/* DATE(대형) + TIME(소형) 독립 박스 */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '10px 16px 12px' }}>
            <div style={{ border: '1.5px solid var(--v2-ink)', display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 16px', minWidth: 165 }}>
              <div>
                <div style={{ fontFamily: 'var(--v2-font-mono)', fontSize: 7, letterSpacing: '0.22em', color: 'var(--v2-ink-faint)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>DATE</div>
                <div style={{ fontFamily: 'var(--v2-font-mono)', fontSize: 20, fontWeight: 900, color: 'var(--v2-accent)', letterSpacing: '0.04em', lineHeight: 1 }}>{dateStr || '----.--.--'}</div>
                <div style={{ fontFamily: 'var(--v2-font-mono)', fontSize: 8.5, fontWeight: 600, color: 'var(--v2-ink-muted)', letterSpacing: '0.18em', marginTop: 3 }}>{dayOfWeek}</div>
              </div>
              <div style={{ height: 1, background: 'var(--v2-line-dash)' }} />
              <div>
                <div style={{ fontFamily: 'var(--v2-font-mono)', fontSize: 7, letterSpacing: '0.22em', color: 'var(--v2-ink-faint)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>TIME</div>
                <div style={{ fontFamily: 'var(--v2-font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--v2-ink-muted)', letterSpacing: '0.06em', lineHeight: 1 }}>{clock || '--:--:--'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          <div style={{ padding: '28px 28px 40px' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
