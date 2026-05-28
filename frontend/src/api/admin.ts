import { apiClient } from './axios'
import type { TaskStatus, ReportStatus } from './reports'

export type Role = 'ADMIN' | 'TEAM_LEAD' | 'MEMBER'

export interface AdminUser {
  id: number
  employeeNo: string
  name: string
  role: Role
  team: string | null
  email: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateUserDto {
  employeeNo: string
  name: string
  role: Role
  team: string
  email?: string | null
}

export interface UpdateUserDto {
  name?: string
  role?: Role
  team?: string
  email?: string | null
  isActive?: boolean
}

// Member summary for dropdown
export interface MemberSummary {
  id: number
  employeeNo: string
  name: string
  role: Role
  team: string | null
}

// Report row returned by admin reports endpoint
export interface AdminReportRow {
  id: number
  userId: number
  reportDate: string
  workHours: string | null
  tomorrowPlan: string | null
  issues: string | null
  remarks: string | null
  status: ReportStatus
  submittedAt: string | null
  user: { id: number; name: string; employeeNo: string; team: string | null }
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

export interface AdminReportsResult {
  reports: AdminReportRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AdminReportQuery {
  userId?: number
  date?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export const adminApi = {
  async listUsers() {
    const { data } = await apiClient.get('/admin/users')
    return data.data as AdminUser[]
  },
  async createUser(dto: CreateUserDto) {
    const { data } = await apiClient.post('/admin/users', dto)
    return data.data as AdminUser
  },
  async updateUser(id: number, dto: UpdateUserDto) {
    const { data } = await apiClient.patch(`/admin/users/${id}`, dto)
    return data.data as AdminUser
  },
  async resetPassword(id: number) {
    const { data } = await apiClient.post(`/admin/users/${id}/reset-password`)
    return data.data
  },
  async deactivate(id: number) {
    await apiClient.delete(`/admin/users/${id}`)
  },

  async listMembers() {
    const { data } = await apiClient.get('/admin/members')
    return data.data as MemberSummary[]
  },

  async getMemberReports(query: AdminReportQuery) {
    const params: Record<string, string | number> = {}
    if (query.userId) params.userId = query.userId
    if (query.date) params.date = query.date
    if (query.startDate) params.startDate = query.startDate
    if (query.endDate) params.endDate = query.endDate
    if (query.page) params.page = query.page
    if (query.limit) params.limit = query.limit
    const { data } = await apiClient.get('/admin/reports', { params })
    return data.data as AdminReportsResult
  },
}
