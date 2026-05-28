import { Router, Request, Response } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { adminService } from './admin.service'
import { createUserSchema, updateUserSchema } from './admin.types'
import { successResponse, errorResponse } from '../../utils/response'
import { z } from 'zod'

export const adminRouter = Router()

const reportQuerySchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

adminRouter.use(authenticate)
adminRouter.use(requireRole(['ADMIN']))

// GET /api/v1/admin/users
adminRouter.get('/users', async (_req: Request, res: Response) => {
  const users = await adminService.listUsers()
  res.json(successResponse(users))
})

// POST /api/v1/admin/users
adminRouter.post('/users', async (req: Request, res: Response) => {
  try {
    const dto = createUserSchema.parse(req.body)
    const user = await adminService.createUser(dto)
    res.json(successResponse(user))
  } catch (err) {
    if (err instanceof Error && err.message === 'EMPLOYEE_NO_EXISTS') {
      res.status(400).json(errorResponse('EMPLOYEE_NO_EXISTS', '이미 존재하는 사번입니다.'))
      return
    }
    throw err
  }
})

// PATCH /api/v1/admin/users/:id
adminRouter.patch('/users/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10)
    const dto = updateUserSchema.parse(req.body)
    const user = await adminService.updateUser(id, dto)
    res.json(successResponse(user))
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json(errorResponse('NOT_FOUND', '사용자를 찾을 수 없습니다.'))
      return
    }
    throw err
  }
})

// POST /api/v1/admin/users/:id/reset-password  — 0000 으로 초기화 + isFirstLogin 복구
adminRouter.post('/users/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10)
    const result = await adminService.resetPassword(id)
    res.json(successResponse(result))
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json(errorResponse('NOT_FOUND', '사용자를 찾을 수 없습니다.'))
      return
    }
    throw err
  }
})

// GET /api/v1/admin/members — list all active members for dropdown
adminRouter.get('/members', async (_req: Request, res: Response) => {
  const members = await adminService.getMembers()
  res.json(successResponse(members))
})

// GET /api/v1/admin/reports?userId=&date=&startDate=&endDate=&page=&limit=
adminRouter.get('/reports', async (req: Request, res: Response) => {
  const parsed = reportQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json(errorResponse('INVALID_QUERY', '조회 조건이 올바르지 않습니다.'))
    return
  }
  const result = await adminService.getMemberReports(parsed.data)
  res.json(successResponse(result))
})

// DELETE /api/v1/admin/users/:id (soft)
adminRouter.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (id === req.user.userId) {
      res.status(400).json(errorResponse('SELF_DELETE', '본인 계정은 삭제할 수 없습니다.'))
      return
    }
    await adminService.deactivate(id)
    res.json(successResponse(null))
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json(errorResponse('NOT_FOUND', '사용자를 찾을 수 없습니다.'))
      return
    }
    throw err
  }
})
