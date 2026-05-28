import { apiClient } from './axios'

export interface WeeklyAggregate {
  weekStart: string
  weekEnd: string
  totalUsers: number
  expectedReports: number
  totalReports: number
  submissionRate: number
  totalTasks: number
  completedCount: number
  inProgressCount: number
  onHoldCount: number
  issueCount: number
  missingByDate: { date: string; users: { id: number; name: string; employeeNo: string }[] }[]
  topLots: { lot: string; count: number }[]
}

export interface WeeklySummaryRecord {
  id: number
  weekStart: string
  weekEnd: string
  team: string
  summaryText: string
  totalReports: number
  totalTasks: number
  completedCount: number
  inProgressCount: number
  issueCount: number
  missingReports: string | null
  createdAt: string
  updatedAt: string
  createdBy?: { id: number; name: string }
}

export const weeklyApi = {
  async aggregate(weekStart: string, team?: string) {
    const { data } = await apiClient.get('/weekly/aggregate', {
      params: { weekStart, ...(team ? { team } : {}) },
    })
    return data.data as WeeklyAggregate
  },

  async exportText(weekStart: string, team?: string) {
    const params = new URLSearchParams({ weekStart })
    if (team) params.set('team', team)
    const response = await apiClient.get(`/weekly/export-text?${params.toString()}`, {
      responseType: 'blob',
    })
    const blob = response.data as Blob
    const text = await blob.text()
    return text
  },

  async downloadText(weekStart: string, team?: string) {
    const text = await this.exportText(weekStart, team)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weekly-${weekStart}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return text
  },

  async autoSummary(weekStart: string, team?: string) {
    const { data } = await apiClient.get('/weekly/auto-summary', {
      params: { weekStart, ...(team ? { team } : {}) },
    })
    return (data.data as { summary: string }).summary
  },

  async save(dto: { weekStart: string; team: string; summaryText: string }) {
    const { data } = await apiClient.post('/weekly', dto)
    return data.data as WeeklySummaryRecord
  },

  async list(team?: string) {
    const { data } = await apiClient.get('/weekly', { params: team ? { team } : {} })
    return data.data as WeeklySummaryRecord[]
  },

  async get(id: number) {
    const { data } = await apiClient.get(`/weekly/${id}`)
    return data.data as WeeklySummaryRecord
  },
}
