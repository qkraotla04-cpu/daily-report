import { Router, Request, Response, NextFunction } from 'express'
import { authService } from './auth.service'
import { authenticate } from '../../middleware/auth'
import { loginSchema, firstLoginChangeSchema } from './auth.types'
import { successResponse, errorResponse } from '../../utils/response'
import { z } from 'zod'

export const authRouter = Router()

const LOGIN_WINDOW_MS = 10 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 8
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
}

function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || 'unknown'
  const now = Date.now()
  const current = loginAttempts.get(key)
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
    next()
    return
  }
  if (current.count >= LOGIN_MAX_ATTEMPTS) {
    res.status(429).json(errorResponse('TOO_MANY_ATTEMPTS', '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.'))
    return
  }
  current.count += 1
  next()
}

// POST /api/v1/auth/login
authRouter.post('/login', loginRateLimit, async (req: Request, res: Response) => {
  try {
    const dto = loginSchema.parse(req.body)
    const result = await authService.login(dto)

    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS)
    res.json(successResponse({ accessToken: result.accessToken, user: result.user }))
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'INVALID_CREDENTIALS') {
        res.status(401).json(errorResponse('INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.'))
        return
      }
      if (err.message === 'TEAM_RESTRICTED') {
        res.status(403).json(errorResponse('TEAM_RESTRICTED', '생산팀 구성원만 접속할 수 있습니다.'))
        return
      }
    }
    throw err
  }
})

// POST /api/v1/auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken as string | undefined
    if (!token) {
      res.status(401).json(errorResponse('NO_REFRESH_TOKEN', '갱신 토큰이 없습니다.'))
      return
    }
    const result = await authService.refresh(token)
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS)
    res.json(successResponse({ accessToken: result.accessToken, user: result.user }))
  } catch (err) {
    if (err instanceof Error && ['TOKEN_INVALID', 'USER_NOT_FOUND'].includes(err.message)) {
      res.clearCookie('refreshToken')
      res.status(401).json(errorResponse(err.message, '인증이 만료되었습니다. 다시 로그인해주세요.'))
      return
    }
    throw err
  }
})

// GET /api/v1/auth/me
authRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await authService.me(req.user.userId)
  if (!user) {
    res.status(404).json(errorResponse('USER_NOT_FOUND', '사용자를 찾을 수 없습니다.'))
    return
  }
  res.json(successResponse(user))
})

// POST /api/v1/auth/logout
authRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('refreshToken')
  res.json(successResponse(null))
})

// POST /api/v1/auth/first-login-change  — 첫 로그인 비밀번호 설정 (현재 비밀번호 불필요)
authRouter.post('/first-login-change', authenticate, async (req: Request, res: Response) => {
  try {
    const { newPassword } = firstLoginChangeSchema.parse(req.body)
    await authService.firstLoginChange(req.user.userId, newPassword)
    res.json(successResponse({ ok: true }))
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'NOT_FIRST_LOGIN') {
        res.status(400).json(errorResponse('NOT_FIRST_LOGIN', '이미 비밀번호를 변경한 계정입니다.'))
        return
      }
      if (err.message === 'USER_NOT_FOUND') {
        res.status(404).json(errorResponse('USER_NOT_FOUND', '사용자를 찾을 수 없습니다.'))
        return
      }
    }
    throw err
  }
})

// POST /api/v1/auth/change-password  — 일반 비밀번호 변경 (현재 비밀번호 필요)
authRouter.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(4, '비밀번호는 4자 이상이어야 합니다.'),
    })
    const { currentPassword, newPassword } = schema.parse(req.body)
    await authService.changePassword(req.user.userId, currentPassword, newPassword)
    res.json(successResponse(null))
  } catch (err) {
    if (err instanceof Error && err.message === 'INVALID_CREDENTIALS') {
      res.status(400).json(errorResponse('INVALID_CREDENTIALS', '현재 비밀번호가 올바르지 않습니다.'))
      return
    }
    throw err
  }
})
