// Weekly insight analysis — detects long-running tasks, repeat patterns, LOT-user mapping
import { prisma } from '../../config/prisma'
import { REPORT_EXCLUDED_NOS } from '../../config/report-exclusions'

function toDateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`)
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + n)
  return d
}

// Canonical key for task deduplication: userId + category + first 40 chars of content
function taskKey(userId: number, category: string | null, content: string): string {
  return `${userId}|${category ?? ''}|${content.trim().slice(0, 40)}`
}

export interface WeeklyInsights {
  longRunningTasks: {
    userId: number
    userName: string
    category: string | null
    contentPreview: string
    weeksOngoing: number
  }[]
  repeatRate: number             // 0–1: fraction of this-week tasks that also appeared last week
  lotUserMap: {
    lot: string
    users: string[]
    count: number
  }[]
  submissionTrend: {
    thisWeek: number             // submission rate % this week
    lastWeek: number             // submission rate % last week
    delta: number                // this - last
  }
}

export async function getWeeklyInsights(
  weekStartIso: string,
  team?: string,
): Promise<WeeklyInsights> {
  const weekStart = toDateOnly(weekStartIso)
  const weekEnd = addDays(weekStart, 4)       // Friday
  const prevStart = addDays(weekStart, -7)
  const prevEnd = addDays(prevStart, 4)

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      employeeNo: { notIn: REPORT_EXCLUDED_NOS },
      ...(team ? { team } : {}),
    },
  })

  const userMap = new Map(users.map((u) => [u.id, u.name]))
  const userIds = users.map((u) => u.id)

  const [thisWeekReports, prevWeekReports] = await Promise.all([
    prisma.dailyReport.findMany({
      where: { reportDate: { gte: weekStart, lte: weekEnd }, deletedAt: null, userId: { in: userIds } },
      include: { tasks: { where: { deletedAt: null } } },
    }),
    prisma.dailyReport.findMany({
      where: { reportDate: { gte: prevStart, lte: prevEnd }, deletedAt: null, userId: { in: userIds } },
      include: { tasks: { where: { deletedAt: null } } },
    }),
  ])

  // Flatten tasks with userId
  const thisTasks = thisWeekReports.flatMap((r) =>
    r.tasks.map((t) => ({ ...t, userId: r.userId })),
  )
  const prevTasks = prevWeekReports.flatMap((r) =>
    r.tasks.map((t) => ({ ...t, userId: r.userId })),
  )

  // Long-running: IN_PROGRESS this week AND last week for same user+task
  const prevInProgressKeys = new Set(
    prevTasks
      .filter((t) => t.status === 'IN_PROGRESS')
      .map((t) => taskKey(t.userId, t.category, t.content)),
  )

  const seen = new Set<string>()
  const longRunningTasks: WeeklyInsights['longRunningTasks'] = []
  for (const t of thisTasks) {
    if (t.status !== 'IN_PROGRESS') continue
    const k = taskKey(t.userId, t.category, t.content)
    if (!prevInProgressKeys.has(k) || seen.has(k)) continue
    seen.add(k)
    longRunningTasks.push({
      userId: t.userId,
      userName: userMap.get(t.userId) ?? '알 수 없음',
      category: t.category,
      contentPreview: t.content.trim().slice(0, 60),
      weeksOngoing: 2,
    })
  }

  // Repeat rate: how many of this week's tasks also appeared last week (any status)
  const prevAllKeys = new Set(prevTasks.map((t) => taskKey(t.userId, t.category, t.content)))
  const repeatCount = thisTasks.filter((t) => prevAllKeys.has(taskKey(t.userId, t.category, t.content))).length
  const repeatRate = thisTasks.length > 0 ? repeatCount / thisTasks.length : 0

  // LOT → user mapping
  const lotUsers = new Map<string, Set<string>>()
  const lotCount = new Map<string, number>()
  for (const r of thisWeekReports) {
    const name = userMap.get(r.userId) ?? '?'
    for (const t of r.tasks) {
      if (!t.extractedLots) continue
      for (const lot of t.extractedLots.split(',').map((s) => s.trim()).filter(Boolean)) {
        if (!lotUsers.has(lot)) lotUsers.set(lot, new Set())
        lotUsers.get(lot)!.add(name)
        lotCount.set(lot, (lotCount.get(lot) ?? 0) + 1)
      }
    }
  }
  const lotUserMap = Array.from(lotUsers.entries())
    .map(([lot, userSet]) => ({ lot, users: Array.from(userSet), count: lotCount.get(lot) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // Submission trend: report count / (users × 5 work days)
  const denominator = users.length * 5
  const thisRate = denominator > 0 ? Math.round((thisWeekReports.length / denominator) * 100) : 0
  const prevRate = denominator > 0 ? Math.round((prevWeekReports.length / denominator) * 100) : 0

  return {
    longRunningTasks,
    repeatRate,
    lotUserMap,
    submissionTrend: { thisWeek: thisRate, lastWeek: prevRate, delta: thisRate - prevRate },
  }
}
