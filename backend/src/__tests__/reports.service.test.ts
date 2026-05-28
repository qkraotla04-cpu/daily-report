/**
 * Reports service — unit tests with Prisma mocked via vi.mock.
 * Focus: upsert soft-delete behaviour + version history grouping.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock prisma before importing the service ──────────────────
vi.mock('../config/prisma', () => ({
  prisma: {
    dailyReport: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    workTask: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '../config/prisma'
import { reportsService } from '../modules/reports/reports.service'

// ── Helpers ───────────────────────────────────────────────────

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    reportId: 10,
    taskNo: '1',
    category: null,
    content: '테스트 업무',
    status: 'COMPLETED',
    taskIssue: null,
    extractedLots: null,
    extractedQtys: null,
    createdAt: new Date('2024-05-01T09:00:00Z'),
    updatedAt: new Date('2024-05-01T09:00:00Z'),
    deletedAt: null,
    ...overrides,
  }
}

function makeReport(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    userId: 1,
    reportDate: new Date('2024-05-01T00:00:00Z'),
    workHours: null,
    tomorrowPlan: null,
    issues: null,
    remarks: null,
    inputMethod: 'PASTE',
    status: 'DRAFT',
    submittedAt: null,
    approvedById: null,
    approvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    tasks: [],
    ...overrides,
  }
}

// ── getReportVersionHistory ───────────────────────────────────

describe('reportsService.getReportVersionHistory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('존재하지 않는 일지 → NOT_FOUND 오류', async () => {
    vi.mocked(prisma.dailyReport.findFirst).mockResolvedValue(null)
    await expect(reportsService.getReportVersionHistory(1, 999)).rejects.toThrow('NOT_FOUND')
  })

  it('삭제된 업무 없으면 versions 빈 배열', async () => {
    vi.mocked(prisma.dailyReport.findFirst).mockResolvedValue(makeReport() as never)
    vi.mocked(prisma.workTask.findMany).mockResolvedValue([
      makeTask({ id: 1, deletedAt: null }),
      makeTask({ id: 2, deletedAt: null }),
    ] as never)

    const result = await reportsService.getReportVersionHistory(1, 10)
    expect(result.versions).toHaveLength(0)
    expect(result.currentTasks).toHaveLength(2)
  })

  it('같은 deletedAt의 태스크들이 하나의 버전으로 묶임', async () => {
    const deletedAt = new Date('2024-05-01T10:00:00Z')
    vi.mocked(prisma.dailyReport.findFirst).mockResolvedValue(makeReport() as never)
    vi.mocked(prisma.workTask.findMany).mockResolvedValue([
      makeTask({ id: 1, deletedAt: null }),                          // current
      makeTask({ id: 2, deletedAt }),                                // version 1 task A
      makeTask({ id: 3, taskNo: '2', deletedAt }),                   // version 1 task B
    ] as never)

    const result = await reportsService.getReportVersionHistory(1, 10)
    expect(result.versions).toHaveLength(1)
    expect(result.versions[0].taskCount).toBe(2)
    expect(result.currentTasks).toHaveLength(1)
  })

  it('다른 deletedAt은 별도 버전으로 분리되며 최신 순 정렬', async () => {
    const d1 = new Date('2024-05-01T09:00:00Z')
    const d2 = new Date('2024-05-01T11:00:00Z')
    vi.mocked(prisma.dailyReport.findFirst).mockResolvedValue(makeReport() as never)
    vi.mocked(prisma.workTask.findMany).mockResolvedValue([
      makeTask({ id: 1, deletedAt: null }),
      makeTask({ id: 2, deletedAt: d1 }),
      makeTask({ id: 3, deletedAt: d2 }),
    ] as never)

    const result = await reportsService.getReportVersionHistory(1, 10)
    expect(result.versions).toHaveLength(2)
    // 최신(d2)이 먼저
    expect(new Date(result.versions[0].replacedAt) >= new Date(result.versions[1].replacedAt)).toBe(true)
  })

  it('version.replacedAt 은 ISO 문자열 형태', async () => {
    const deletedAt = new Date('2024-05-15T14:30:00Z')
    vi.mocked(prisma.dailyReport.findFirst).mockResolvedValue(makeReport() as never)
    vi.mocked(prisma.workTask.findMany).mockResolvedValue([
      makeTask({ id: 2, deletedAt }),
    ] as never)

    const result = await reportsService.getReportVersionHistory(1, 10)
    expect(result.versions[0].replacedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
  })
})

// ── aggregation query param validation (검증 로직만) ──────────

describe('날짜 형식 검증 (YYYY-MM-DD)', () => {
  const RE = /^\d{4}-\d{2}-\d{2}$/

  it('올바른 날짜 형식 통과', () => {
    expect(RE.test('2024-05-28')).toBe(true)
  })
  it('시간 포함 → 실패', () => {
    expect(RE.test('2024-05-28T10:00')).toBe(false)
  })
  it('슬래시 구분자 → 실패', () => {
    expect(RE.test('2024/05/28')).toBe(false)
  })
  it('짧은 년도 → 실패', () => {
    expect(RE.test('24-05-28')).toBe(false)
  })
})
