import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate, requireRole } from '../../middleware/auth'
import { weeklyService } from './weekly.service'
import { successResponse, errorResponse } from '../../utils/response'

export const weeklyRouter = Router()

weeklyRouter.use(authenticate)
weeklyRouter.use(requireRole(['ADMIN', 'TEAM_LEAD']))

const weekStartSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식')

const saveSchema = z.object({
  weekStart: weekStartSchema,
  team: z.string().min(1),
  summaryText: z.string().min(1, '요약 내용이 필요합니다.'),
})

// GET /api/v1/weekly/aggregate?weekStart=YYYY-MM-DD&team=생산팀
weeklyRouter.get('/aggregate', async (req: Request, res: Response) => {
  const parsed = weekStartSchema.safeParse(req.query.weekStart)
  if (!parsed.success) {
    res.status(400).json(errorResponse('MISSING_PARAMS', 'weekStart (YYYY-MM-DD) 파라미터가 필요합니다.'))
    return
  }
  const team = (req.query.team as string) || undefined
  const data = await weeklyService.aggregate(parsed.data, team)
  res.json(successResponse(data))
})

// GET /api/v1/weekly/export-text?weekStart=YYYY-MM-DD&team=생산팀
weeklyRouter.get('/export-text', async (req: Request, res: Response) => {
  const parsed = weekStartSchema.safeParse(req.query.weekStart)
  if (!parsed.success) {
    res.status(400).json(errorResponse('MISSING_PARAMS', 'weekStart 파라미터가 필요합니다.'))
    return
  }
  const team = (req.query.team as string) || undefined
  const text = await weeklyService.exportText(parsed.data, team)
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="weekly-${parsed.data}.txt"`)
  res.send(text)
})

// GET /api/v1/weekly/auto-summary?weekStart=YYYY-MM-DD&team=생산팀
weeklyRouter.get('/auto-summary', async (req: Request, res: Response) => {
  const parsed = weekStartSchema.safeParse(req.query.weekStart)
  if (!parsed.success) {
    res.status(400).json(errorResponse('MISSING_PARAMS', 'weekStart 파라미터가 필요합니다.'))
    return
  }
  const team = (req.query.team as string) || undefined
  const summary = await weeklyService.generateAutoSummary(parsed.data, team)
  res.json(successResponse({ summary }))
})

// POST /api/v1/weekly - AI 요약 저장
weeklyRouter.post('/', async (req: Request, res: Response) => {
  const dto = saveSchema.parse(req.body)
  const result = await weeklyService.save(req.user.userId, dto)
  res.json(successResponse(result))
})

// GET /api/v1/weekly?team=
weeklyRouter.get('/', async (req: Request, res: Response) => {
  const team = (req.query.team as string) || undefined
  const result = await weeklyService.list(team)
  res.json(successResponse(result))
})

// GET /api/v1/weekly/:id
weeklyRouter.get('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10)
  const result = await weeklyService.get(id)
  if (!result) {
    res.status(404).json(errorResponse('NOT_FOUND', '주간 요약을 찾을 수 없습니다.'))
    return
  }
  res.json(successResponse(result))
})
