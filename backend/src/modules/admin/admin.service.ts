import bcrypt from 'bcrypt'
import fs from 'fs'
import path from 'path'
import { prisma } from '../../config/prisma'
import { CreateUserDto, UpdateUserDto } from './admin.types'

const SALT_ROUNDS    = 12
const DEFAULT_PASSWORD = '0000'   // 초기 비밀번호 — 첫 로그인 시 변경 강제

const userSelect = {
  id: true,
  employeeNo: true,
  name: true,
  role: true,
  team: true,
  email: true,
  isActive: true,
  isFirstLogin: true,
  createdAt: true,
  updatedAt: true,
}

export const adminService = {
  async listUsers() {
    return prisma.user.findMany({
      where: { deletedAt: null },
      select: userSelect,
      orderBy: [{ isActive: 'desc' }, { team: 'asc' }, { name: 'asc' }],
    })
  },

  async createUser(dto: CreateUserDto) {
    const existing = await prisma.user.findFirst({
      where: { employeeNo: dto.employeeNo, deletedAt: null },
    })
    if (existing) throw new Error('EMPLOYEE_NO_EXISTS')

    // 신규 계정은 항상 초기 비밀번호 0000, 첫 로그인 강제 변경
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS)
    return prisma.user.create({
      data: {
        employeeNo: dto.employeeNo,
        name:       dto.name,
        passwordHash,
        role:         dto.role,
        team:         dto.team,
        email:        dto.email ?? null,
        isActive:     true,
        isFirstLogin: true,
      },
      select: userSelect,
    })
  },

  async updateUser(id: number, dto: UpdateUserDto) {
    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new Error('NOT_FOUND')

    return prisma.user.update({
      where: { id },
      data: {
        name:     dto.name,
        role:     dto.role,
        team:     dto.team,
        email:    dto.email,
        isActive: dto.isActive,
      },
      select: userSelect,
    })
  },

  // 비밀번호 초기화 — 0000 으로 리셋하고 첫 로그인 플래그 복구
  async resetPassword(id: number) {
    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new Error('NOT_FOUND')

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS)
    await prisma.user.update({
      where: { id },
      data: { passwordHash, isFirstLogin: true },
    })
    return { ok: true, message: '비밀번호가 0000으로 초기화되었습니다.' }
  },

  async deactivate(id: number) {
    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new Error('NOT_FOUND')

    return prisma.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
      select: userSelect,
    })
  },

  // List all non-deleted members for the member history filter
  async getSystemStatus() {
    const uptimeSec = Math.floor(process.uptime())
    const mem = process.memoryUsage()

    // DB file size
    const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db')
    let dbSizeBytes = 0
    try {
      dbSizeBytes = fs.statSync(dbPath).size
    } catch {
      dbSizeBytes = 0
    }

    const [userCount, reportCount, taskCount] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.dailyReport.count({ where: { deletedAt: null } }),
      prisma.workTask.count({ where: { deletedAt: null } }),
    ])

    const hours = Math.floor(uptimeSec / 3600)
    const mins = Math.floor((uptimeSec % 3600) / 60)
    const secs = uptimeSec % 60

    return {
      uptime: { seconds: uptimeSec, label: `${hours}h ${mins}m ${secs}s` },
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        rssMB: Math.round(mem.rss / 1024 / 1024),
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      },
      database: {
        sizeBytes: dbSizeBytes,
        sizeMB: Math.round(dbSizeBytes / 1024 / 1024 * 10) / 10,
        path: dbPath,
      },
      stats: { userCount, reportCount, taskCount },
      runtime: { nodeVersion: process.version, platform: process.platform },
    }
  },

  async getMembers() {
    return prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, employeeNo: true, name: true, role: true, team: true },
      orderBy: [{ team: 'asc' }, { name: 'asc' }],
    })
  },

  // Query reports with optional userId and date filters + pagination
  async getMemberReports(params: {
    userId?: number
    date?: string
    startDate?: string
    endDate?: string
    page: number
    limit: number
  }) {
    const { userId, date, startDate, endDate, page, limit } = params

    // Build date filter
    let dateFilter: Record<string, unknown> = {}
    if (date) {
      const d = new Date(`${date}T00:00:00.000Z`)
      dateFilter = { reportDate: d }
    } else if (startDate || endDate) {
      const range: { gte?: Date; lte?: Date } = {}
      if (startDate) range.gte = new Date(`${startDate}T00:00:00.000Z`)
      if (endDate) range.lte = new Date(`${endDate}T00:00:00.000Z`)
      dateFilter = { reportDate: range }
    }

    const where = {
      deletedAt: null,
      ...(userId ? { userId } : {}),
      ...dateFilter,
    }

    const [total, reports] = await Promise.all([
      prisma.dailyReport.count({ where }),
      prisma.dailyReport.findMany({
        where,
        include: {
          tasks: { where: { deletedAt: null }, orderBy: { id: 'asc' } },
          user: { select: { id: true, name: true, employeeNo: true, team: true } },
        },
        orderBy: [{ reportDate: 'desc' }, { user: { name: 'asc' } }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return { reports, total, page, limit, totalPages: Math.ceil(total / limit) }
  },
}
