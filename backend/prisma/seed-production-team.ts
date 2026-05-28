/**
 * Sync 생산팀 members from personnel master (11 ai-study-hub/prisma/data/personnel.json).
 * - admin (최현우) and bykim (김복영) are ADMIN accounts — email only updated, role preserved.
 * - EMP001/EMP002 email corrected to match personnel master.
 * - New members added with employee_code as employeeNo and default password '0000'.
 *
 * Run: cd backend && npx tsx prisma/seed-production-team.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()
const SALT_ROUNDS = 12
const DEFAULT_PASSWORD = '0000'

const PRODUCTION_TEAM = [
  // ── ADMIN accounts (존재함 — 이메일만 확인) ──────────────────
  { employeeNo: 'admin', name: '최현우', email: 'hyunwoo.choi@lnkbiomed.com', role: 'ADMIN',  isFirstLogin: false },
  { employeeNo: 'bykim', name: '김복영', email: 'bykim@lnkbiomed.com',        role: 'ADMIN',  isFirstLogin: false },

  // ── 기존 MEMBER — 이메일 교정 ────────────────────────────────
  { employeeNo: 'EMP001', name: '김수진', email: 'sujin.kim@lnkbiomed.com',  role: 'MEMBER', isFirstLogin: true },
  { employeeNo: 'EMP002', name: '이아현', email: 'ahyun.lee@lnkbiomed.com',  role: 'MEMBER', isFirstLogin: true },

  // ── 신규 MEMBER 5명 ──────────────────────────────────────────
  { employeeNo: '241001', name: '이창수', email: 'changsu.lee@lnkbiomed.com',     role: 'MEMBER', isFirstLogin: true },
  { employeeNo: '241003', name: '박찬신', email: 'chanshin.park@lnkbiomed.com',   role: 'MEMBER', isFirstLogin: true },
  { employeeNo: '241004', name: '변용희', email: 'yhbyun@lnkbiomed.com',          role: 'MEMBER', isFirstLogin: true },
  { employeeNo: '241007', name: '황주희', email: 'juehee.hwang@lnkbiomed.com',    role: 'MEMBER', isFirstLogin: true },
  { employeeNo: '241009', name: '김혜지', email: 'hyeji.kim@lnkbiomed.com',       role: 'MEMBER', isFirstLogin: true },
]

async function main() {
  const defaultHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS)

  console.log('🌱 생산팀 계정 동기화 시작...\n')

  for (const m of PRODUCTION_TEAM) {
    const existing = await prisma.user.findUnique({ where: { employeeNo: m.employeeNo } })

    if (existing) {
      // Update email and name only — preserve password and role
      await prisma.user.update({
        where: { employeeNo: m.employeeNo },
        data: { name: m.name, email: m.email },
      })
      console.log(`  ✏️  업데이트 | ${m.role.padEnd(6)} | ${m.name} (${m.employeeNo}) → ${m.email}`)
    } else {
      await prisma.user.create({
        data: {
          employeeNo:   m.employeeNo,
          name:         m.name,
          email:        m.email,
          passwordHash: defaultHash,
          role:         m.role,
          team:         '생산팀',
          isActive:     true,
          isFirstLogin: m.isFirstLogin,
        },
      })
      console.log(`  ✅  신규생성 | ${m.role.padEnd(6)} | ${m.name} (${m.employeeNo}) → ${m.email}`)
    }
  }

  console.log('\n🔑 신규 계정 초기 비밀번호: 0000 (첫 로그인 시 변경)')
  console.log('📋 생산팀 전체 계정 목록:')

  const all = await prisma.user.findMany({
    where: { team: '생산팀', deletedAt: null },
    orderBy: { employeeNo: 'asc' },
    select: { employeeNo: true, name: true, role: true, email: true, isFirstLogin: true },
  })

  for (const u of all) {
    const flag = u.isFirstLogin ? '🔐 초기' : '✅ 설정됨'
    console.log(`   ${u.role.padEnd(6)} | ${u.name.padEnd(4)} (${u.employeeNo.padEnd(8)}) | ${u.email ?? '이메일없음'} | ${flag}`)
  }
}

main()
  .catch((e) => { console.error('❌ 실패:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
