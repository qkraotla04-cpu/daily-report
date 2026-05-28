import { prisma } from '../../config/prisma'
import { UpsertReportDto, BulkUpsertDto } from './reports.types'

function toDateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`)
}

function todayDateOnly(): Date {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return toDateOnly(`${yyyy}-${mm}-${dd}`)
}

function mapTaskCreate(t: UpsertReportDto['tasks'][number]) {
  return {
    taskNo: t.taskNo,
    category: t.category ?? null,
    content: t.content,
    status: t.status,
    taskIssue: t.taskIssue ?? null,
    extractedLots: t.extractedLots && t.extractedLots.length > 0 ? t.extractedLots.join(',') : null,
    extractedQtys: t.extractedQtys && t.extractedQtys.length > 0 ? JSON.stringify(t.extractedQtys) : null,
  }
}

async function upsertOne(userId: number, dto: UpsertReportDto) {
  const reportDate = toDateOnly(dto.reportDate)
  const now = new Date()

  const existing = await prisma.dailyReport.findFirst({
    where: { userId, reportDate, deletedAt: null },
  })

  if (existing) {
    return prisma.$transaction(async (tx) => {
      await tx.workTask.updateMany({
        where: { reportId: existing.id, deletedAt: null },
        data: { deletedAt: now },
      })
      return tx.dailyReport.update({
        where: { id: existing.id },
        data: {
          workHours: dto.workHours ?? null,
          tomorrowPlan: dto.tomorrowPlan ?? null,
          issues: dto.issues ?? null,
          remarks: dto.remarks ?? null,
          inputMethod: dto.inputMethod,
          status: dto.status,
          submittedAt:
            dto.status === 'SUBMITTED' && !existing.submittedAt ? now : existing.submittedAt,
          tasks: { create: dto.tasks.map(mapTaskCreate) },
        },
        include: { tasks: { where: { deletedAt: null }, orderBy: { id: 'asc' } } },
      })
    })
  }

  return prisma.dailyReport.create({
    data: {
      userId,
      reportDate,
      workHours: dto.workHours ?? null,
      tomorrowPlan: dto.tomorrowPlan ?? null,
      issues: dto.issues ?? null,
      remarks: dto.remarks ?? null,
      inputMethod: dto.inputMethod,
      status: dto.status,
      submittedAt: dto.status === 'SUBMITTED' ? now : null,
      tasks: { create: dto.tasks.map(mapTaskCreate) },
    },
    include: { tasks: { where: { deletedAt: null }, orderBy: { id: 'asc' } } },
  })
}

export const reportsService = {
  upsert: upsertOne,

  async bulkUpsert(userId: number, dto: BulkUpsertDto) {
    const results = []
    for (const r of dto.reports) {
      results.push(await upsertOne(userId, r))
    }
    return results
  },

  async getMyToday(userId: number) {
    return prisma.dailyReport.findFirst({
      where: { userId, reportDate: todayDateOnly(), deletedAt: null },
      include: { tasks: { where: { deletedAt: null }, orderBy: { id: 'asc' } } },
    })
  },

  async getMyByDate(userId: number, isoDate: string) {
    return prisma.dailyReport.findFirst({
      where: { userId, reportDate: toDateOnly(isoDate), deletedAt: null },
      include: { tasks: { where: { deletedAt: null }, orderBy: { id: 'asc' } } },
    })
  },

  async getMyHistory(userId: number, fromIso: string, toIso: string) {
    return prisma.dailyReport.findMany({
      where: {
        userId,
        reportDate: { gte: toDateOnly(fromIso), lte: toDateOnly(toIso) },
        deletedAt: null,
      },
      include: { tasks: { where: { deletedAt: null }, orderBy: { id: 'asc' } } },
      orderBy: { reportDate: 'desc' },
    })
  },

  async getReportVersionHistory(userId: number, reportId: number) {
    const report = await prisma.dailyReport.findFirst({
      where: { id: reportId, userId, deletedAt: null },
    })
    if (!report) throw new Error('NOT_FOUND')

    const allTasks = await prisma.workTask.findMany({
      where: { reportId },
      orderBy: { id: 'asc' },
    })

    const currentTasks = allTasks.filter((t) => t.deletedAt === null)
    const deletedTasks = allTasks.filter((t) => t.deletedAt !== null)

    // Group deleted tasks by deletedAt truncated to the second
    // (same-second deletions = same upsert batch = one historical version)
    const batches = new Map<string, typeof allTasks>()
    for (const task of deletedTasks) {
      const key = task.deletedAt!.toISOString().slice(0, 19)
      if (!batches.has(key)) batches.set(key, [])
      batches.get(key)!.push(task)
    }

    const versions = Array.from(batches.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, tasks]) => ({
        replacedAt: key + 'Z',
        taskCount: tasks.length,
        tasks,
      }))

    return { report, currentTasks, versions }
  },

  async deleteMine(userId: number, reportId: number) {
    const existing = await prisma.dailyReport.findFirst({
      where: { id: reportId, userId, deletedAt: null },
    })
    if (!existing) throw new Error('NOT_FOUND')
    const now = new Date()
    return prisma.$transaction(async (tx) => {
      await tx.workTask.updateMany({
        where: { reportId, deletedAt: null },
        data: { deletedAt: now },
      })
      return tx.dailyReport.update({
        where: { id: reportId },
        data: { deletedAt: now },
      })
    })
  },
}
