import { z } from 'zod'

export const TaskStatus = z.enum(['COMPLETED', 'IN_PROGRESS', 'ON_HOLD'])
export type TaskStatusType = z.infer<typeof TaskStatus>

export const ReportStatus = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED'])
export type ReportStatusType = z.infer<typeof ReportStatus>

export const InputMethod = z.enum(['PASTE', 'FORM'])
export type InputMethodType = z.infer<typeof InputMethod>

// taskNo: 문자열 (예: "1", "1-1", "3-2")
// category: 자유 텍스트 (예: "입·출고 관련업무")
// taskIssue: task 단위 이슈/특이사항
export const taskInputSchema = z.object({
  taskNo: z.string().min(1, 'NO. 는 필수입니다.'),
  category: z.string().optional().nullable(),
  content: z.string().min(1, '업무 내용은 필수입니다.'),
  status: TaskStatus,
  taskIssue: z.string().optional().nullable(),
  extractedLots: z.array(z.string()).optional(),
  extractedQtys: z.array(z.string()).optional(),
})

export const upsertReportSchema = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다.'),
  workHours: z.string().optional().nullable(),
  tomorrowPlan: z.string().optional().nullable(),
  issues: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  inputMethod: InputMethod,
  status: ReportStatus.optional().default('SUBMITTED'),
  tasks: z.array(taskInputSchema).min(1, '업무 항목이 최소 1개 이상이어야 합니다.'),
})

export type UpsertReportDto = z.infer<typeof upsertReportSchema>

// 다일자 일괄 제출 — 신규 양식 한 번 붙여넣기 = N개 일지
export const bulkUpsertSchema = z.object({
  reports: z.array(upsertReportSchema).min(1, '제출할 일지가 최소 1개 이상이어야 합니다.'),
})
export type BulkUpsertDto = z.infer<typeof bulkUpsertSchema>
