import { apiClient } from './axios'

export type TaskStatus = 'COMPLETED' | 'IN_PROGRESS' | 'ON_HOLD'
export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED'
export type InputMethod = 'PASTE' | 'FORM'

// 카테고리는 자유 텍스트 (예: "입·출고 관련업무")
export type TaskCategory = string

export interface WorkTaskDto {
  id?: number
  taskNo: string
  category?: string | null
  content: string
  status: TaskStatus
  taskIssue?: string | null
  extractedLots?: string[]
  extractedQtys?: string[]
}

export interface DailyReportDto {
  id?: number
  reportDate: string // YYYY-MM-DD
  workHours?: string | null
  tomorrowPlan?: string | null
  issues?: string | null
  remarks?: string | null
  inputMethod: InputMethod
  status?: ReportStatus
  tasks: WorkTaskDto[]
  createdAt?: string
  updatedAt?: string
}

export interface DailyReportFromServer extends Omit<DailyReportDto, 'tasks'> {
  id: number
  userId: number
  status: ReportStatus
  reportDate: string
  tasks: Array<{
    id: number
    taskNo: string
    category: string | null
    content: string
    status: TaskStatus
    taskIssue: string | null
    extractedLots: string | null
    extractedQtys: string | null
  }>
}

export const reportsApi = {
  async upsert(dto: DailyReportDto) {
    const { data } = await apiClient.post('/reports', dto)
    return data.data as DailyReportFromServer
  },

  async getMyToday() {
    const { data } = await apiClient.get('/reports/me/today')
    return data.data as DailyReportFromServer | null
  },

  async getMyByDate(date: string) {
    const { data } = await apiClient.get(`/reports/me/by-date/${date}`)
    return data.data as DailyReportFromServer | null
  },

  async getMyHistory(from: string, to: string) {
    const { data } = await apiClient.get('/reports/me', { params: { from, to } })
    return data.data as DailyReportFromServer[]
  },

  async deleteOne(id: number) {
    await apiClient.delete(`/reports/${id}`)
  },
}
