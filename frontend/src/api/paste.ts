import { apiClient } from './axios'
import type { TaskStatus } from './reports'

// 신규 양식 (7열) 파싱 결과
export interface ParsedTask {
  taskNo: string
  category: string | null
  content: string
  status: TaskStatus | null
  taskIssue: string | null
  extractedLots: string[]
  extractedQtys: string[]
}

export interface ParsedDay {
  reportDate: string // YYYY-MM-DD
  workHours: string | null
  tasks: ParsedTask[]
}

export interface ParsedPasteResult {
  days: ParsedDay[]
  warnings: string[]
}

export interface PasteSubmitResult {
  saved: number
  reports: Array<{ id: number; reportDate: string }>
}

export const pasteApi = {
  async preview(text: string) {
    const { data } = await apiClient.post('/paste/preview', { text })
    return data.data as ParsedPasteResult
  },
  async submit(text: string) {
    const { data } = await apiClient.post('/paste/submit', { text })
    return data.data as PasteSubmitResult
  },
}
