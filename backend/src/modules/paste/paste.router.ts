import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/auth'
import { parsePastedExcel } from './paste.parser'
import { reportsService } from '../reports/reports.service'
import { successResponse, errorResponse } from '../../utils/response'
import { REPORT_EXCLUDED_NOS } from '../../config/report-exclusions'

export const pasteRouter = Router()

pasteRouter.use(authenticate)

const previewSchema = z.object({
  text: z.string().min(1, '붙여넣기 내용이 비어있습니다.'),
})

const submitSchema = z.object({
  text: z.string().min(1, '붙여넣기 내용이 비어있습니다.'),
})

// POST /api/v1/paste/preview - 붙여넣기 텍스트 파싱 (DB 저장 X)
// 응답: { days: [{reportDate, workHours, tasks: [...]}], warnings: [] }
pasteRouter.post('/preview', async (req: Request, res: Response) => {
  try {
    const { text } = previewSchema.parse(req.body)
    const parsed = parsePastedExcel(text)
    res.json(successResponse(parsed))
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json(errorResponse('PARSE_ERROR', err.message))
      return
    }
    throw err
  }
})

// POST /api/v1/paste/submit - 붙여넣기 텍스트 파싱 후 일괄 저장
// 다일자 양식 한 번 붙여넣기 = N개 일지 일괄 SUBMITTED
pasteRouter.post('/submit', async (req: Request, res: Response) => {
  if (REPORT_EXCLUDED_NOS.includes(req.user.employeeNo)) {
    res.status(403).json(errorResponse('REPORT_EXCLUDED', '해당 계정은 업무일지 제출 대상이 아닙니다.'))
    return
  }
  try {
    const { text } = submitSchema.parse(req.body)
    const parsed = parsePastedExcel(text)

    const results = await reportsService.bulkUpsert(req.user.userId, {
      reports: parsed.days.map((d) => ({
        reportDate: d.reportDate,
        workHours: d.workHours ?? null,
        tomorrowPlan: null,
        issues: null,
        remarks: null,
        inputMethod: 'PASTE' as const,
        status: 'SUBMITTED' as const,
        tasks: d.tasks.map((t) => ({
          taskNo: t.taskNo,
          category: t.category,
          content: t.content,
          status: (t.status ?? 'IN_PROGRESS') as 'COMPLETED' | 'IN_PROGRESS' | 'ON_HOLD',
          taskIssue: t.taskIssue,
          extractedLots: t.extractedLots,
          extractedQtys: t.extractedQtys,
        })),
      })),
    })

    res.json(successResponse({ saved: results.length, reports: results }))
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json(errorResponse('PARSE_ERROR', err.message))
      return
    }
    throw err
  }
})
