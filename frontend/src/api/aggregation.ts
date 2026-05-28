import { apiClient } from './axios'
import type { TaskStatus, ReportStatus, InputMethod } from './reports'

export interface AggregationUser {
  id: number
  employeeNo: string
  name: string
  team: string | null
  role: string
}

export interface AggregationTask {
  id: number
  taskNo: string
  content: string
  status: TaskStatus
  category: string | null
  taskIssue: string | null
  extractedLots: string | null
  extractedQtys: string | null
}

export interface AggregationReport {
  id: number
  workHours: string | null
  tomorrowPlan: string | null
  issues: string | null
  remarks: string | null
  inputMethod: InputMethod
  status: ReportStatus
  submittedAt: string | null
  tasks: AggregationTask[]
}

export interface AggregationRow {
  user: AggregationUser
  report: AggregationReport | null
}

export interface AggregationResponse {
  date: string
  rows: AggregationRow[]
}

export const aggregationApi = {
  async getDaily(date: string, team?: string) {
    const { data } = await apiClient.get('/aggregation', {
      params: { date, ...(team ? { team } : {}) },
    })
    return data.data as AggregationResponse
  },

  async downloadExcel(date: string, team?: string) {
    const params = new URLSearchParams({ date })
    if (team) params.set('team', team)
    const response = await apiClient.get(`/aggregation/excel?${params.toString()}`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(response.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daily-report-${date}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}
