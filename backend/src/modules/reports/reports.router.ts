import { Router, Request, Response } from 'express'
import { authenticate } from '../../middleware/auth'
import { reportsService } from './reports.service'
import { upsertReportSchema } from './reports.types'
import { successResponse, errorResponse } from '../../utils/response'
import { REPORT_EXCLUDED_NOS } from '../../config/report-exclusions'

export const reportsRouter = Router()

reportsRouter.use(authenticate)

// POST /api/v1/reports - 오늘 일지 생성/수정 (upsert)
reportsRouter.post('/', async (req: Request, res: Response) => {
  if (REPORT_EXCLUDED_NOS.includes(req.user.employeeNo)) {
    res.status(403).json(errorResponse('REPORT_EXCLUDED', '해당 계정은 업무일지 제출 대상이 아닙니다.'))
    return
  }
  const dto = upsertReportSchema.parse(req.body)
  const result = await reportsService.upsert(req.user.userId, dto)
  res.json(successResponse(result))
})

// GET /api/v1/reports/me/today - 오늘 일지 조회
reportsRouter.get('/me/today', async (req: Request, res: Response) => {
  const result = await reportsService.getMyToday(req.user.userId)
  res.json(successResponse(result))
})

// GET /api/v1/reports/me/by-date/:date
reportsRouter.get('/me/by-date/:date', async (req: Request, res: Response) => {
  const result = await reportsService.getMyByDate(req.user.userId, req.params.date)
  res.json(successResponse(result))
})

// GET /api/v1/reports/me?from=YYYY-MM-DD&to=YYYY-MM-DD
reportsRouter.get('/me', async (req: Request, res: Response) => {
  const from = (req.query.from as string) || ''
  const to = (req.query.to as string) || ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    res.status(400).json(errorResponse('MISSING_PARAMS', 'from, to (YYYY-MM-DD) 쿼리 파라미터가 필요합니다.'))
    return
  }
  const result = await reportsService.getMyHistory(req.user.userId, from, to)
  res.json(successResponse(result))
})

// DELETE /api/v1/reports/:id - 본인 일지 soft delete
reportsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10)
    await reportsService.deleteMine(req.user.userId, id)
    res.json(successResponse(null))
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json(errorResponse('NOT_FOUND', '일지를 찾을 수 없습니다.'))
      return
    }
    throw err
  }
})
