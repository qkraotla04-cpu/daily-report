import { Router, Request, Response } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { aggregationService } from './aggregation.service'
import { buildAggregationWorkbook } from './aggregation.excel'
import { successResponse, errorResponse } from '../../utils/response'

export const aggregationRouter = Router()

aggregationRouter.use(authenticate)
aggregationRouter.use(requireRole(['ADMIN', 'TEAM_LEAD']))

function parseDate(req: Request): string | null {
  const date = (req.query.date as string) || ''
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null
}

// GET /api/v1/aggregation?date=YYYY-MM-DD&team=생산팀
aggregationRouter.get('/', async (req: Request, res: Response) => {
  const date = parseDate(req)
  if (!date) {
    res.status(400).json(errorResponse('MISSING_PARAMS', 'date (YYYY-MM-DD) 쿼리 파라미터가 필요합니다.'))
    return
  }
  const team = (req.query.team as string) || undefined
  const rows = await aggregationService.getDailyAggregation(date, team)
  res.json(successResponse({ date, rows }))
})

// GET /api/v1/aggregation/excel?date=YYYY-MM-DD&team=생산팀
aggregationRouter.get('/excel', async (req: Request, res: Response) => {
  const date = parseDate(req)
  if (!date) {
    res.status(400).json(errorResponse('MISSING_PARAMS', 'date (YYYY-MM-DD) 쿼리 파라미터가 필요합니다.'))
    return
  }
  const team = (req.query.team as string) || undefined
  const rows = await aggregationService.getDailyAggregation(date, team)
  const buffer = await buildAggregationWorkbook(date, rows)

  const filename = `daily-report-${date}.xlsx`
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(buffer)
})
