import { prisma } from '../../config/prisma'
import { REPORT_EXCLUDED_NOS } from '../../config/report-exclusions'

function toDateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`)
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

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

const WORK_DAYS = 5 // 월~금

export const weeklyService = {
  // 주의 시작일(월요일) 기준 집계
  async aggregate(weekStartIso: string, team?: string): Promise<WeeklyAggregate> {
    const weekStart = toDateOnly(weekStartIso)
    const weekEnd = addDays(weekStart, WORK_DAYS - 1) // 금요일

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        employeeNo: { notIn: REPORT_EXCLUDED_NOS },
        ...(team ? { team } : {}),
      },
    })
    const userById = new Map(users.map((u) => [u.id, u]))

    const reports = await prisma.dailyReport.findMany({
      where: {
        reportDate: { gte: weekStart, lte: weekEnd },
        deletedAt: null,
        userId: { in: users.map((u) => u.id) },
      },
      include: { tasks: { where: { deletedAt: null } } },
    })

    const tasks = reports.flatMap((r) => r.tasks)
    const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length
    const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length
    const onHoldCount = tasks.filter((t) => t.status === 'ON_HOLD').length
    const issueCount = reports.filter((r) => r.issues && r.issues.trim().length > 0).length

    // 미제출자 (날짜별)
    const reportKeys = new Set(reports.map((r) => `${r.userId}|${isoDate(r.reportDate)}`))
    const missingByDate: WeeklyAggregate['missingByDate'] = []
    for (let i = 0; i < WORK_DAYS; i++) {
      const day = addDays(weekStart, i)
      const dayIso = isoDate(day)
      const missing = users
        .filter((u) => !reportKeys.has(`${u.id}|${dayIso}`))
        .map((u) => ({ id: u.id, name: u.name, employeeNo: u.employeeNo }))
      missingByDate.push({ date: dayIso, users: missing })
    }

    // LOT 빈도 (top 10)
    const lotCount = new Map<string, number>()
    for (const t of tasks) {
      if (!t.extractedLots) continue
      t.extractedLots
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((lot) => lotCount.set(lot, (lotCount.get(lot) ?? 0) + 1))
    }
    const topLots = [...lotCount.entries()]
      .map(([lot, count]) => ({ lot, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    void userById
    return {
      weekStart: isoDate(weekStart),
      weekEnd: isoDate(weekEnd),
      totalUsers: users.length,
      expectedReports: users.length * WORK_DAYS,
      totalReports: reports.length,
      submissionRate:
        users.length === 0 ? 0 : Math.round((reports.length / (users.length * WORK_DAYS)) * 100),
      totalTasks: tasks.length,
      completedCount,
      inProgressCount,
      onHoldCount,
      issueCount,
      missingByDate,
      topLots,
    }
  },

  // AI 프롬프트용 평문 텍스트 생성
  async exportText(weekStartIso: string, team?: string): Promise<string> {
    const weekStart = toDateOnly(weekStartIso)
    const weekEnd = addDays(weekStart, WORK_DAYS - 1)

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        employeeNo: { notIn: REPORT_EXCLUDED_NOS },
        ...(team ? { team } : {}),
      },
    })

    const reports = await prisma.dailyReport.findMany({
      where: {
        reportDate: { gte: weekStart, lte: weekEnd },
        deletedAt: null,
        userId: { in: users.map((u) => u.id) },
      },
      include: { tasks: { where: { deletedAt: null }, orderBy: { id: 'asc' } }, user: true },
      orderBy: [{ reportDate: 'asc' }, { userId: 'asc' }],
    })

    const lines: string[] = []
    lines.push(`# 주간 업무일지 (${isoDate(weekStart)} ~ ${isoDate(weekEnd)})`)
    if (team) lines.push(`팀: ${team}`)
    lines.push('')

    // 날짜별 그룹
    const byDate = new Map<string, typeof reports>()
    for (const r of reports) {
      const key = isoDate(r.reportDate)
      const arr = byDate.get(key) ?? []
      arr.push(r)
      byDate.set(key, arr)
    }

    const sortedDates = [...byDate.keys()].sort()
    for (const date of sortedDates) {
      lines.push(`## ${date}`)
      const list = byDate.get(date)!
      for (const r of list) {
        lines.push(`### ${r.user.name} (${r.user.employeeNo}) - 근무: ${r.workHours ?? '-'}`)
        for (const t of r.tasks) {
          const statusKor =
            t.status === 'COMPLETED' ? '완료' : t.status === 'IN_PROGRESS' ? '진행중' : '보류'
          const cat = t.category ? `[${t.category}] ` : ''
          const issue = t.taskIssue ? `  ↳ 이슈: ${t.taskIssue.replace(/\n/g, ' ')}` : ''
          lines.push(`- ${t.taskNo} | ${statusKor} | ${cat}${t.content.replace(/\n/g, ' ')}`)
          if (issue) lines.push(issue)
        }
        if (r.issues) lines.push(`  · 일반 이슈: ${r.issues.replace(/\n/g, ' ')}`)
        if (r.remarks) lines.push(`  · 비고: ${r.remarks.replace(/\n/g, ' ')}`)
        lines.push('')
      }
    }

    return lines.join('\n')
  },

  // Algorithmic auto-summary — comprehensive structured Markdown report (no LLM)
  async generateAutoSummary(weekStartIso: string, team?: string): Promise<string> {
    const weekStart = toDateOnly(weekStartIso)
    const weekEnd = addDays(weekStart, WORK_DAYS - 1)

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        employeeNo: { notIn: REPORT_EXCLUDED_NOS },
        ...(team ? { team } : {}),
      },
    })
    const reports = await prisma.dailyReport.findMany({
      where: {
        reportDate: { gte: weekStart, lte: weekEnd },
        deletedAt: null,
        userId: { in: users.map((u) => u.id) },
      },
      include: { tasks: { where: { deletedAt: null }, orderBy: { id: 'asc' } }, user: true },
      orderBy: [{ reportDate: 'asc' }, { userId: 'asc' }],
    })

    // Previous-week reports for trend comparison
    const prevStart = addDays(weekStart, -7)
    const prevEnd = addDays(weekStart, -1)
    const prevReports = await prisma.dailyReport.findMany({
      where: {
        reportDate: { gte: prevStart, lte: prevEnd },
        deletedAt: null,
        userId: { in: users.map((u) => u.id) },
      },
      include: { tasks: { where: { deletedAt: null } } },
    })

    const tasks = reports.flatMap((r) => r.tasks)
    const prevTasks = prevReports.flatMap((r) => r.tasks)

    const completed = tasks.filter((t) => t.status === 'COMPLETED')
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS')
    const onHold = tasks.filter((t) => t.status === 'ON_HOLD')
    const completionRate = tasks.length === 0 ? 0 : Math.round((completed.length / tasks.length) * 100)
    const expectedReports = users.length * WORK_DAYS
    const submissionRate = expectedReports === 0 ? 0 : Math.round((reports.length / expectedReports) * 100)

    // WoW deltas
    const taskDelta = tasks.length - prevTasks.length
    const completedDelta = completed.length - prevTasks.filter((t) => t.status === 'COMPLETED').length

    // Per-user breakdown
    const byUser = new Map<
      number,
      { name: string; team: string | null; total: number; completed: number; inProgress: number; onHold: number; days: Set<string>; categories: Map<string, number>; issues: string[] }
    >()
    for (const u of users) {
      byUser.set(u.id, {
        name: u.name,
        team: u.team,
        total: 0,
        completed: 0,
        inProgress: 0,
        onHold: 0,
        days: new Set(),
        categories: new Map(),
        issues: [],
      })
    }
    for (const r of reports) {
      const u = byUser.get(r.userId)
      if (!u) continue
      u.days.add(isoDate(r.reportDate))
      for (const t of r.tasks) {
        u.total++
        if (t.status === 'COMPLETED') u.completed++
        else if (t.status === 'IN_PROGRESS') u.inProgress++
        else u.onHold++
        if (t.category) u.categories.set(t.category, (u.categories.get(t.category) ?? 0) + 1)
        if (t.taskIssue?.trim()) u.issues.push(t.taskIssue.trim())
      }
    }

    // Category breakdown across all
    const catStats = new Map<string, { total: number; completed: number; inProgress: number; onHold: number }>()
    for (const t of tasks) {
      const cat = t.category || '(미분류)'
      const cur = catStats.get(cat) ?? { total: 0, completed: 0, inProgress: 0, onHold: 0 }
      cur.total++
      if (t.status === 'COMPLETED') cur.completed++
      else if (t.status === 'IN_PROGRESS') cur.inProgress++
      else cur.onHold++
      catStats.set(cat, cur)
    }
    const topCategories = [...catStats.entries()]
      .map(([cat, s]) => ({ cat, ...s, rate: s.total === 0 ? 0 : Math.round((s.completed / s.total) * 100) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)

    // Issues with frequency (simple urgency heuristic: keywords)
    const issuesAll: { text: string; user: string; urgency: '🔴' | '🟡' | '🟢' }[] = []
    const urgentKeywords = /긴급|지연|중단|불량|에러|실패|문제|장애|결함|위험/
    const midKeywords = /확인|검토|대기|보류|예정|필요/
    for (const r of reports) {
      for (const t of r.tasks) {
        if (t.taskIssue?.trim()) {
          const text = t.taskIssue.trim().replace(/\n/g, ' ')
          const urgency = urgentKeywords.test(text) ? '🔴' : midKeywords.test(text) ? '🟡' : '🟢'
          issuesAll.push({ text, user: r.user.name, urgency })
        }
      }
      if (r.issues?.trim()) {
        const text = r.issues.trim().replace(/\n/g, ' ')
        const urgency = urgentKeywords.test(text) ? '🔴' : midKeywords.test(text) ? '🟡' : '🟢'
        issuesAll.push({ text, user: r.user.name, urgency })
      }
    }
    const issuesByUrgency = {
      '🔴': issuesAll.filter((i) => i.urgency === '🔴'),
      '🟡': issuesAll.filter((i) => i.urgency === '🟡'),
      '🟢': issuesAll.filter((i) => i.urgency === '🟢'),
    }

    // LOT analysis
    const lotCount = new Map<string, number>()
    for (const t of tasks) {
      if (!t.extractedLots) continue
      t.extractedLots
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((lot) => lotCount.set(lot, (lotCount.get(lot) ?? 0) + 1))
    }
    const topLots = [...lotCount.entries()]
      .map(([lot, count]) => ({ lot, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Quantity analysis — parse numbers + units
    const qtyTotals = new Map<string, number>()
    const qtyPattern = /^(-?\d+(?:\.\d+)?)\s*([a-zA-Z가-힣%]*)$/
    for (const t of tasks) {
      if (!t.extractedQtys) continue
      t.extractedQtys
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((q) => {
          const m = q.match(qtyPattern)
          if (m) {
            const num = parseFloat(m[1])
            const unit = (m[2] || 'EA').toUpperCase()
            qtyTotals.set(unit, (qtyTotals.get(unit) ?? 0) + num)
          }
        })
    }

    // Missing reports per date
    const reportKeys = new Set(reports.map((r) => `${r.userId}|${isoDate(r.reportDate)}`))
    const missingByDate: { date: string; users: string[] }[] = []
    for (let i = 0; i < WORK_DAYS; i++) {
      const day = addDays(weekStart, i)
      const dayIso = isoDate(day)
      const missing = users.filter((u) => !reportKeys.has(`${u.id}|${dayIso}`)).map((u) => u.name)
      if (missing.length > 0) missingByDate.push({ date: dayIso, users: missing })
    }

    // Carryover (IN_PROGRESS + ON_HOLD) for next week
    const carryover: { user: string; content: string; status: string }[] = []
    for (const r of reports) {
      for (const t of r.tasks) {
        if (t.status === 'IN_PROGRESS' || t.status === 'ON_HOLD') {
          carryover.push({
            user: r.user.name,
            content: t.content.replace(/\n/g, ' ').slice(0, 60),
            status: t.status === 'IN_PROGRESS' ? '진행중' : '보류',
          })
        }
      }
    }

    // ── Build Markdown ──
    const L: string[] = []
    L.push(`# 주간 요약 보고서`)
    L.push(`**기간**: ${isoDate(weekStart)} ~ ${isoDate(weekEnd)} · **팀**: ${team ?? '전체'}`)
    L.push(`**생성 시각**: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} (자동 생성)`)
    L.push('')

    // 1. Executive Summary
    L.push(`## 1. Executive Summary`)
    L.push(`- 제출률 **${submissionRate}%** (${reports.length}/${expectedReports}건) · 총 업무 **${tasks.length}건** · 완료율 **${completionRate}%**`)
    L.push(`- 주간 핵심 카테고리: ${topCategories.slice(0, 3).map((c) => `**${c.cat}**(${c.total}건)`).join(' · ') || '없음'}`)
    L.push(`- 활동 인원 ${[...byUser.values()].filter((u) => u.total > 0).length}명 / 전체 ${users.length}명`)
    if (taskDelta !== 0) {
      L.push(`- 전주 대비 업무 ${taskDelta > 0 ? '+' : ''}${taskDelta}건 · 완료 ${completedDelta > 0 ? '+' : ''}${completedDelta}건`)
    }
    L.push('')

    // 2. 정량 지표
    L.push(`## 2. 정량 지표`)
    L.push(`| 지표 | 값 | 비고 |`)
    L.push(`|---|---|---|`)
    L.push(`| 제출률 | ${submissionRate}% | ${reports.length}/${expectedReports}건 |`)
    L.push(`| 총 업무 | ${tasks.length}건 | 전주 ${prevTasks.length}건 (${taskDelta >= 0 ? '+' : ''}${taskDelta}) |`)
    L.push(`| 완료 | ${completed.length}건 | ${completionRate}% |`)
    L.push(`| 진행중 | ${inProgress.length}건 | 차주 이월 후보 |`)
    L.push(`| 보류 | ${onHold.length}건 | 검토 필요 |`)
    L.push(`| 이슈 | ${issuesAll.length}건 | 🔴${issuesByUrgency['🔴'].length} 🟡${issuesByUrgency['🟡'].length} 🟢${issuesByUrgency['🟢'].length} |`)
    L.push('')

    // 3. 담당자별 진행 현황
    L.push(`## 3. 담당자별 진행 현황`)
    const userRows = [...byUser.values()].sort((a, b) => b.total - a.total)
    L.push(`| 이름 | 제출일수 | 업무수 | 완료 | 진행 | 보류 | 주요 카테고리 |`)
    L.push(`|---|---|---|---|---|---|---|`)
    for (const u of userRows) {
      const topCats = [...u.categories.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c, n]) => `${c}(${n})`).join(', ')
      L.push(`| ${u.name} | ${u.days.size}/${WORK_DAYS}일 | ${u.total} | ${u.completed} | ${u.inProgress} | ${u.onHold} | ${topCats || '—'} |`)
    }
    L.push('')

    // 4. 카테고리별 분석
    if (topCategories.length > 0) {
      L.push(`## 4. 카테고리별 분석 (TOP ${topCategories.length})`)
      L.push(`| 카테고리 | 총 | 완료 | 진행 | 보류 | 완료율 |`)
      L.push(`|---|---|---|---|---|---|`)
      for (const c of topCategories) {
        L.push(`| ${c.cat} | ${c.total} | ${c.completed} | ${c.inProgress} | ${c.onHold} | ${c.rate}% |`)
      }
      L.push('')
    }

    // 5. 리스크 및 이슈
    L.push(`## 5. 리스크 및 이슈 (${issuesAll.length}건)`)
    for (const [tier, label] of [['🔴', '긴급 — 즉시 대응'], ['🟡', '중간 — 이번 주 내'], ['🟢', '모니터링']] as const) {
      const list = issuesByUrgency[tier]
      if (list.length === 0) continue
      L.push(`### ${tier} ${label} (${list.length}건)`)
      for (const i of list.slice(0, 10)) {
        L.push(`- **${i.user}**: ${i.text}`)
      }
      if (list.length > 10) L.push(`- _… 외 ${list.length - 10}건_`)
      L.push('')
    }
    if (issuesAll.length === 0) {
      L.push(`- 보고된 이슈 없음`)
      L.push('')
    }

    // 6. LOT / 수량 분석
    if (topLots.length > 0 || qtyTotals.size > 0) {
      L.push(`## 6. LOT / 수량 분석`)
      if (topLots.length > 0) {
        L.push(`**TOP LOT** (${topLots.length}개)`)
        L.push(`| LOT | 등장 횟수 |`)
        L.push(`|---|---|`)
        for (const l of topLots) L.push(`| ${l.lot} | ${l.count} |`)
        L.push('')
      }
      if (qtyTotals.size > 0) {
        L.push(`**수량 집계** (단위별)`)
        L.push(`| 단위 | 총량 |`)
        L.push(`|---|---|`)
        for (const [unit, total] of [...qtyTotals.entries()].sort((a, b) => b[1] - a[1])) {
          L.push(`| ${unit} | ${total.toLocaleString()} |`)
        }
        L.push('')
      }
    }

    // 7. 미제출 현황
    if (missingByDate.length > 0) {
      L.push(`## 7. 미제출 현황`)
      L.push(`| 날짜 | 미제출자 |`)
      L.push(`|---|---|`)
      for (const m of missingByDate) {
        L.push(`| ${m.date} | ${m.users.join(', ')} |`)
      }
      L.push('')
    }

    // 8. 다음 주 우선순위 제안 (이월 업무)
    if (carryover.length > 0) {
      L.push(`## 8. 다음 주 우선순위 제안 — 이월 업무 (${carryover.length}건)`)
      const grouped = new Map<string, typeof carryover>()
      for (const c of carryover) {
        const arr = grouped.get(c.user) ?? []
        arr.push(c)
        grouped.set(c.user, arr)
      }
      for (const [user, list] of grouped) {
        L.push(`**${user}** (${list.length}건)`)
        for (const c of list.slice(0, 5)) {
          L.push(`- [${c.status}] ${c.content}`)
        }
        if (list.length > 5) L.push(`- _… 외 ${list.length - 5}건_`)
        L.push('')
      }
    }

    L.push(`---`)
    L.push(`_이 보고서는 시스템 알고리즘으로 자동 생성되었습니다. LLM 기반 분석이 필요하면 Claude.ai에 본문 복사 후 사용하세요._`)

    return L.join('\n')
  },

  async save(
    userId: number,
    dto: {
      weekStart: string
      team: string
      summaryText: string
    }
  ) {
    const agg = await weeklyService.aggregate(dto.weekStart, dto.team)
    const weekStart = toDateOnly(dto.weekStart)
    const weekEnd = toDateOnly(agg.weekEnd)

    const missingReports = JSON.stringify(
      agg.missingByDate.flatMap((d) =>
        d.users.map((u) => ({ date: d.date, userId: u.id, name: u.name }))
      )
    )

    const existing = await prisma.weeklySummary.findFirst({
      where: { weekStart, team: dto.team, deletedAt: null },
    })

    if (existing) {
      return prisma.weeklySummary.update({
        where: { id: existing.id },
        data: {
          summaryText: dto.summaryText,
          totalReports: agg.totalReports,
          totalTasks: agg.totalTasks,
          completedCount: agg.completedCount,
          inProgressCount: agg.inProgressCount,
          issueCount: agg.issueCount,
          missingReports,
        },
      })
    }

    return prisma.weeklySummary.create({
      data: {
        weekStart,
        weekEnd,
        team: dto.team,
        createdById: userId,
        summaryText: dto.summaryText,
        totalReports: agg.totalReports,
        totalTasks: agg.totalTasks,
        completedCount: agg.completedCount,
        inProgressCount: agg.inProgressCount,
        issueCount: agg.issueCount,
        missingReports,
      },
    })
  },

  async list(team?: string) {
    return prisma.weeklySummary.findMany({
      where: { deletedAt: null, ...(team ? { team } : {}) },
      orderBy: { weekStart: 'desc' },
      include: { createdBy: { select: { id: true, name: true } } },
    })
  },

  async get(id: number) {
    return prisma.weeklySummary.findFirst({
      where: { id, deletedAt: null },
      include: { createdBy: { select: { id: true, name: true } } },
    })
  },
}
