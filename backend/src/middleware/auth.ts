import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { errorResponse } from '../utils/response'
import { TokenPayload } from '../modules/auth/auth.types'
import { prisma } from '../config/prisma'

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json(errorResponse('UNAUTHORIZED', '로그인이 필요합니다.'))
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload
    const user = await prisma.user.findFirst({
      where: { id: payload.userId, deletedAt: null, isActive: true },
      select: { id: true, employeeNo: true, role: true, name: true, team: true },
    })
    if (!user) {
      res.status(401).json(errorResponse('USER_INACTIVE', '사용할 수 없는 계정입니다.'))
      return
    }
    req.user = {
      userId: user.id,
      employeeNo: user.employeeNo,
      role: user.role,
      name: user.name,
      team: user.team,
    }
    next()
  } catch {
    res.status(401).json(errorResponse('TOKEN_INVALID', '토큰이 유효하지 않습니다.'))
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json(errorResponse('UNAUTHORIZED', '로그인이 필요합니다.'))
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json(errorResponse('FORBIDDEN', '권한이 없습니다.'))
      return
    }
    next()
  }
}
