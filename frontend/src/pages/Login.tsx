import { useState, FormEvent, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AxiosError } from 'axios'

const REMEMBER_KEY = 'dr_remember'

function loadSaved(): { email: string; remember: boolean } {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { email: parsed.email || '', remember: parsed.remember === true }
    }
  } catch { /* ignore */ }
  return { email: '', remember: false }
}

export default function Login() {
  const { login, firstLoginChange, user } = useAuth()
  const navigate = useNavigate()

  const saved = loadSaved()

  /* ── 로그인 폼 상태 ── */
  const [email,    setEmail]    = useState(saved.email)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(saved.remember)
  const [showPw,   setShowPw]   = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  /* ── 첫 로그인 모달 상태 ── */
  const [showModal,  setShowModal]  = useState(false)
  const [newPw,      setNewPw]      = useState('')
  const [newPwCheck, setNewPwCheck] = useState('')
  const [modalErr,   setModalErr]   = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const newPwRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user && !user.isFirstLogin) navigate('/', { replace: true })
  }, [user, navigate])

  // 모달 열릴 때 첫 입력란에 포커스
  useEffect(() => {
    if (showModal) setTimeout(() => newPwRef.current?.focus(), 80)
  }, [showModal])

  /* ── 로그인 제출 ── */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setErrorMsg('이메일과 비밀번호를 입력해주세요.')
      return
    }
    setErrorMsg('')
    setIsLoading(true)
    try {
      await login(email.trim(), password)
      // 로그인 성공 → 기억하기 처리
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email: email.trim(), remember: true }))
      } else {
        localStorage.removeItem(REMEMBER_KEY)
      }
    } catch (err) {
      const axiosErr = err as AxiosError<{ error: { code: string; message: string } }>
      const code = axiosErr.response?.data?.error?.code
      if (code === 'TEAM_RESTRICTED') {
        setErrorMsg('생산팀 구성원만 접속할 수 있습니다.')
      } else {
        setErrorMsg(
          axiosErr.response?.data?.error?.message ||
          '이메일 또는 비밀번호가 올바르지 않습니다.'
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  // user가 업데이트되면 isFirstLogin 체크
  useEffect(() => {
    if (user?.isFirstLogin) setShowModal(true)
  }, [user?.isFirstLogin])

  /* ── 첫 로그인 비밀번호 변경 ── */
  const handleFirstLoginChange = async () => {
    if (newPw.length < 4) { setModalErr('비밀번호는 4자 이상이어야 합니다.'); return }
    if (newPw !== newPwCheck) { setModalErr('비밀번호가 일치하지 않습니다.'); return }
    setModalErr('')
    setModalLoading(true)
    try {
      await firstLoginChange(newPw)
      setShowModal(false)
      navigate('/', { replace: true })
    } catch {
      setModalErr('비밀번호 변경에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setModalLoading(false)
    }
  }

  return (
    <>
      {/* ── 로그인 화면 ── */}
      <div style={S.body}>
        <div style={S.wrap}>

          {/* 브랜드 */}
          <div style={S.brand}>
            <div style={S.logoIcon}>K</div>
            <div style={S.brandTexts}>
              <div style={S.brandName}>LNKBIOMED</div>
              <div style={S.brandSub}>업무일지 자동화 시스템</div>
            </div>
          </div>

          <div style={S.greeting}>안녕하세요</div>
          <h1 style={S.title}>로그인</h1>
          <p style={S.subtitle}>회사 이메일과 비밀번호를 입력해주세요.</p>

          <form onSubmit={handleSubmit} autoComplete="on">
            {/* 이메일 */}
            <div style={S.field}>
              <label style={S.label}>이메일 · Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@lnkbiomed.com"
                autoFocus
                autoComplete="email"
                disabled={isLoading}
                style={S.input}
                onFocus={e => Object.assign(e.target.style, S.inputFocus)}
                onBlur={e  => Object.assign(e.target.style, S.input)}
              />
            </div>

            {/* 비밀번호 */}
            <div style={S.field}>
              <label style={S.label}>비밀번호 · Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="초기 비밀번호: 0000"
                  autoComplete="current-password"
                  disabled={isLoading}
                  style={{ ...S.input, paddingRight: 46 }}
                  onFocus={e => Object.assign(e.target.style, { ...S.inputFocus, paddingRight: '46px' })}
                  onBlur={e  => Object.assign(e.target.style, { ...S.input,      paddingRight: '46px' })}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={S.eyeBtn} tabIndex={-1}>
                  {showPw ? <EyeOff /> : <EyeOn />}
                </button>
              </div>
            </div>

            {/* 아이디/비번 기억 */}
            <label style={S.rememberRow}>
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                style={S.rememberChk}
              />
              <span style={S.rememberTxt}>아이디 기억</span>
            </label>

            {errorMsg && <div style={S.errorMsg}>{errorMsg}</div>}

            <button
              type="submit"
              disabled={isLoading}
              style={isLoading ? { ...S.btnLogin, opacity: 0.55, cursor: 'not-allowed' } : S.btnLogin}
            >
              {isLoading ? '확인 중…' : '로그인'}&nbsp;›
            </button>
          </form>

          {/* 안내 박스 */}
          <div style={S.infoBox}>
            <div style={S.infoIcon}>i</div>
            <div>
              <strong style={S.infoTitle}>초기 로그인 안내</strong>
              <p style={S.infoText}>
                이메일: 회사 이메일 주소 (name@lnkbiomed.com)<br />
                초기 비밀번호: <span style={{ color: '#00d4a8', fontWeight: 700 }}>0000</span><br />
                첫 로그인 후 비밀번호를 변경해주세요.
              </p>
            </div>
          </div>

          <div style={S.footer}>Daily Report v2 &nbsp;·&nbsp; © L&K Biomed &nbsp;·&nbsp; 생산팀 전용</div>
        </div>
      </div>

      {/* ── 첫 로그인 비밀번호 변경 모달 (33번 스타일) ── */}
      {showModal && (
        <div style={S.modalBg}>
          <div style={S.modalBox}>
            <div style={S.modalHead}>🔒 비밀번호 변경</div>
            <div style={S.modalBody}>
              <p style={S.modalDesc}>
                최초 로그인입니다.<br />
                보안을 위해 새 비밀번호를 설정해주세요.
              </p>

              <div>
                <label style={S.modalLabel}>새 비밀번호 (4자 이상)</label>
                <input
                  ref={newPwRef}
                  type="password"
                  value={newPw}
                  onChange={e => { setNewPw(e.target.value); setModalErr('') }}
                  placeholder="새 비밀번호 입력"
                  autoComplete="new-password"
                  style={S.modalInput}
                  onFocus={e => Object.assign(e.target.style, S.modalInputFocus)}
                  onBlur={e  => Object.assign(e.target.style, S.modalInput)}
                  onKeyDown={e => e.key === 'Enter' && handleFirstLoginChange()}
                />
              </div>
              <div>
                <label style={S.modalLabel}>비밀번호 확인</label>
                <input
                  type="password"
                  value={newPwCheck}
                  onChange={e => { setNewPwCheck(e.target.value); setModalErr('') }}
                  placeholder="동일하게 입력"
                  autoComplete="new-password"
                  style={S.modalInput}
                  onFocus={e => Object.assign(e.target.style, S.modalInputFocus)}
                  onBlur={e  => Object.assign(e.target.style, S.modalInput)}
                  onKeyDown={e => e.key === 'Enter' && handleFirstLoginChange()}
                />
              </div>

              {modalErr && <div style={S.modalErr}>{modalErr}</div>}
            </div>

            <div style={S.modalFoot}>
              <button
                onClick={handleFirstLoginChange}
                disabled={modalLoading}
                style={modalLoading ? { ...S.btnChange, opacity: 0.55 } : S.btnChange}
              >
                {modalLoading ? '변경 중…' : '변경하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ── SVG 아이콘 ── */
function EyeOn() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
function EyeOff() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

/* ── 인라인 스타일 (33번 다크 테마) ── */
const TEAL  = 'linear-gradient(135deg, #00d4a8 0%, #0099cc 100%)'
const TEAL_S = '0 4px 20px rgba(0,180,160,.30)'

const S: Record<string, React.CSSProperties> = {
  /* 배경 */
  body: {
    minHeight: '100dvh', background: '#07111d',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '28px 20px', fontFamily: "'Inter','Noto Sans KR',sans-serif",
  },
  wrap: { width: '100%', maxWidth: 420 },

  /* 브랜드 */
  brand: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 },
  logoIcon: {
    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
    background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px', fontStyle: 'italic',
    boxShadow: '0 4px 14px rgba(0,212,168,.35)',
  },
  brandTexts: { display: 'flex', flexDirection: 'column', gap: 2 },
  brandName:  { fontSize: 15, fontWeight: 900, color: '#00d4a8', letterSpacing: '0.12em' },
  brandSub:   { fontSize: 11, color: '#5a7a96', fontWeight: 500, letterSpacing: '0.04em' },

  /* 헤딩 */
  greeting: { fontSize: 14, color: '#5a7a96', fontWeight: 500, marginBottom: 6 },
  title:    { fontSize: 34, fontWeight: 900, color: '#f0f6ff', letterSpacing: '-0.5px', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#5a7a96', fontWeight: 400, marginBottom: 32, lineHeight: 1.5 },

  /* 폼 */
  field: { marginBottom: 16 },
  label: {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#8aa4be',
    letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8,
  },
  input: {
    width: '100%', background: '#0d1f30', color: '#e8f0f8',
    border: '1.5px solid #1a2f42', borderRadius: 12,
    padding: '13px 16px', fontSize: 14, fontWeight: 500,
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  },
  inputFocus: {
    width: '100%', background: '#0f2336', color: '#e8f0f8',
    border: '1.5px solid #00d4a8', borderRadius: 12,
    padding: '13px 16px', fontSize: 14, fontWeight: 500,
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
    boxShadow: '0 0 0 3px rgba(0,212,168,.12)',
  },
  eyeBtn: {
    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
    color: '#3a5568', display: 'flex', alignItems: 'center',
  },
  /* 기억하기 */
  rememberRow: {
    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
    marginBottom: 16, userSelect: 'none',
  },
  rememberChk: {
    width: 16, height: 16, accentColor: '#00d4a8', cursor: 'pointer', flexShrink: 0,
  },
  rememberTxt: { fontSize: 13, color: '#5a7a96', fontWeight: 500 },

  errorMsg: {
    fontSize: 12, fontWeight: 600, padding: '10px 14px', borderRadius: 10, marginBottom: 16,
    background: 'rgba(220,38,38,.1)', color: '#f87171', border: '1px solid rgba(220,38,38,.25)',
  },
  btnLogin: {
    width: '100%', padding: '14px', background: TEAL,
    color: '#fff', border: 'none', borderRadius: 12,
    fontSize: 15, fontWeight: 800, letterSpacing: '0.04em',
    fontFamily: 'inherit', cursor: 'pointer', boxShadow: TEAL_S,
    marginBottom: 28, marginTop: 4,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  },

  /* 안내 박스 */
  infoBox: {
    background: '#0d1f30', border: '1px solid #1a2f42', borderRadius: 12,
    padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 28,
  },
  infoIcon: {
    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
    background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 900, color: '#fff', marginTop: 1,
  },
  infoTitle: { display: 'block', fontSize: 12, color: '#8aa4be', fontWeight: 700, marginBottom: 4 },
  infoText:  { fontSize: 12, color: '#5a7a96', lineHeight: 1.65, margin: 0 },
  footer:    { textAlign: 'center', fontSize: 11, color: '#2a3f52', fontWeight: 500 },

  /* 첫 로그인 모달 */
  modalBg: {
    position: 'fixed', inset: 0, zIndex: 9000,
    background: 'rgba(7,17,29,.85)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modalBox: {
    background: '#0d1f30', border: '1.5px solid #1a3a52', borderRadius: 16,
    width: '100%', maxWidth: 360, overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,.6)',
  },
  modalHead: {
    background: TEAL, padding: '16px 20px',
    fontSize: 15, fontWeight: 900, color: '#fff',
  },
  modalBody: {
    padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
  },
  modalDesc: { fontSize: 13, color: '#6a8aaa', lineHeight: 1.6, margin: 0 },
  modalLabel: {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#8aa4be',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
  },
  modalInput: {
    width: '100%', background: '#0a1825', color: '#e8f0f8',
    border: '1.5px solid #1a2f42', borderRadius: 10,
    padding: '12px 14px', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  },
  modalInputFocus: {
    width: '100%', background: '#0a1825', color: '#e8f0f8',
    border: '1.5px solid #00d4a8', borderRadius: 10,
    padding: '12px 14px', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  },
  modalErr: { fontSize: 12, color: '#f87171', fontWeight: 600 },
  modalFoot: { padding: '16px 20px', borderTop: '1px solid #1a2f42' },
  btnChange: {
    width: '100%', padding: 13, background: TEAL,
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 13, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer',
  },
}
