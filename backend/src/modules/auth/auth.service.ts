import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../../config/prisma'
import { env } from '../../config/env'
import { LoginDto, TokenPayload } from './auth.types'

const ALLOWED_TEAM = '생산팀'

function signTokens(payload: TokenPayload) {
  const base = {
    userId: payload.userId,
    employeeNo: payload.employeeNo,
    role: payload.role,
    name: payload.name,
    team: payload.team,
  }
  const accessToken  = jwt.sign(base, env.JWT_SECRET,         { expiresIn: '2h' })
  const refreshToken = jwt.sign(base, env.JWT_REFRESH_SECRET,  { expiresIn: '7d' })
  return { accessToken, refreshToken }
}

function toPublicUser(user: {
  id: number; name: string; role: string; team: string
  employeeNo: string; email: string | null; isFirstLogin: boolean
}) {
  return {
    id:           user.id,
    name:         user.name,
    role:         user.role,
    team:         user.team,
    employeeNo:   user.employeeNo,
    email:        user.email,
    isFirstLogin: user.isFirstLogin,
  }
}

export const authService = {
  async login(dto: LoginDto) {
    // 이메일로 사용자 조회
    const user = await prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null, isActive: true },
    })

    if (!user) throw new Error('INVALID_CREDENTIALS')

    // 생산팀 전용 접근 제한
    if (user.team !== ALLOWED_TEAM) throw new Error('TEAM_RESTRICTED')

    const isValid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!isValid) throw new Error('INVALID_CREDENTIALS')

    const tokens = signTokens({
      userId: user.id, employeeNo: user.employeeNo,
      role: user.role, name: user.name, team: user.team,
    })

    return { user: toPublicUser(user), ...tokens }
  },

  async refresh(refreshToken: string) {
    let payload: TokenPayload
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as TokenPayload
    } catch {
      throw new Error('TOKEN_INVALID')
    }

    const user = await prisma.user.findFirst({
      where: { id: payload.userId, deletedAt: null, isActive: true },
    })
    if (!user) throw new Error('USER_NOT_FOUND')

    const tokens = signTokens({
      userId: user.id, employeeNo: user.employeeNo,
      role: user.role, name: user.name, team: user.team,
    })
    return { user: toPublicUser(user), ...tokens }
  },

  async me(userId: number) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true, employeeNo: true, name: true,
        role: true, team: true, email: true, isFirstLogin: true,
      },
    })
    return user
  },

  // 첫 로그인 비밀번호 변경 — 현재 비밀번호 불필요, isFirstLogin=true 여야만 허용
  async firstLoginChange(userId: number, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    })
    if (!user) throw new Error('USER_NOT_FOUND')
    if (!user.isFirstLogin) throw new Error('NOT_FIRST_LOGIN')

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, isFirstLogin: false },
    })
  },

  // 일반 비밀번호 변경 (로그인 후, 현재 비밀번호 필요)
  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } })
    if (!user) throw new Error('USER_NOT_FOUND')

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) throw new Error('INVALID_CREDENTIALS')

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
  },
}
