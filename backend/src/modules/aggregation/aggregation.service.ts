import { prisma } from '../../config/prisma'
import { REPORT_EXCLUDED_NOS } from '../../config/report-exclusions'

function toDateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`)
}

export interface AggregationRow {
  user: {
    id: number
    employeeNo: string
    name: string
    team: string | null
    role: string
  }
  report: {
    id: number
    workHours: string | null
    tomorrowPlan: string | null
    issues: string | null
    remarks: string | null
    inputMethod: string
    status: string
    submittedAt: string | null
    tasks: {
      id: number
      taskNo: string
      content: string
      status: string
      category: string | null
      taskIssue: string | null
      extractedLots: string | null
      extractedQtys: string | null
    }[]
  } | null
}

export const aggregationService = {
  // 특정 날짜의 팀 전체 일지 취합 (활성 사용자 기준)
  async getDailyAggregation(isoDate: string, team?: string): Promise<AggregationRow[]> {
    const reportDate = toDateOnly(isoDate)

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        employeeNo: { notIn: REPORT_EXCLUDED_NOS },
        ...(team ? { team } : {}),
      },
      orderBy: [{ team: 'asc' }, { name: 'asc' }],
    })

    const reports = await prisma.dailyReport.findMany({
      where: {
        reportDate,
        deletedAt: null,
        userId: { in: users.map((u) => u.id) },
      },
      include: { tasks: { where: { deletedAt: null }, orderBy: { id: 'asc' } } },
    })

    const reportByUser = new Map(reports.map((r) => [r.userId, r]))

    return users.map((u) => {
      const r = reportByUser.get(u.id)
      return {
        user: {
          id: u.id,
          employeeNo: u.employeeNo,
          name: u.name,
          team: u.team,
          role: u.role,
        },
        report: r
          ? {
              id: r.id,
              workHours: r.workHours,
              tomorrowPlan: r.tomorrowPlan,
              issues: r.issues,
              remarks: r.remarks,
              inputMethod: r.inputMethod,
              status: r.status,
              submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
              tasks: r.tasks.map((t) => ({
                id: t.id,
                taskNo: t.taskNo,
                content: t.content,
                status: t.status,
                category: t.category,
                taskIssue: t.taskIssue,
                extractedLots: t.extractedLots,
                extractedQtys: t.extractedQtys,
              })),
            }
          : null,
      }
    })
  },
}
