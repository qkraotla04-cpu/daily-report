import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const SALT_ROUNDS      = 12
const DEFAULT_PASSWORD = '0000'        // 모든 신규 계정 초기 비밀번호

async function main() {
  console.log('🌱 시드 데이터 생성 시작...')

  const defaultHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS)

  // ── ADMIN 1: 최현우 (사번: admin) ─────────────────────────
  const admin = await prisma.user.upsert({
    where: { employeeNo: 'admin' },
    update: { email: 'chw@lnkbiomed.com', isFirstLogin: false },
    create: {
      employeeNo:   'admin',
      name:         '최현우',
      passwordHash: defaultHash,
      role:         'ADMIN',
      team:         '생산팀',
      email:        'chw@lnkbiomed.com',
      isActive:     true,
      isFirstLogin: false,
    },
  })

  // ── ADMIN 2: 김복영 (사번: bykim) ─────────────────────────
  const bykim = await prisma.user.upsert({
    where: { employeeNo: 'bykim' },
    update: { name: '김복영', email: 'bykim@lnkbiomed.com', isFirstLogin: false },
    create: {
      employeeNo:   'bykim',
      name:         '김복영',
      passwordHash: defaultHash,
      role:         'ADMIN',
      team:         '생산팀',
      email:        'bykim@lnkbiomed.com',
      isActive:     true,
      isFirstLogin: false,
    },
  })

  // ── 팀원 1: 김수진 (사번: EMP001) ─────────────────────────
  const member1 = await prisma.user.upsert({
    where: { employeeNo: 'EMP001' },
    update: { email: 'sujin@lnkbiomed.com' },
    create: {
      employeeNo:   'EMP001',
      name:         '김수진',
      passwordHash: defaultHash,
      role:         'MEMBER',
      team:         '생산팀',
      email:        'sujin@lnkbiomed.com',
      isActive:     true,
      isFirstLogin: true,
    },
  })

  // ── 팀원 2: 이아현 (사번: EMP002) ─────────────────────────
  const member2 = await prisma.user.upsert({
    where: { employeeNo: 'EMP002' },
    update: { email: 'ahyeon@lnkbiomed.com' },
    create: {
      employeeNo:   'EMP002',
      name:         '이아현',
      passwordHash: defaultHash,
      role:         'MEMBER',
      team:         '생산팀',
      email:        'ahyeon@lnkbiomed.com',
      isActive:     true,
      isFirstLogin: true,
    },
  })

  // ── 시스템 계정 lnk (내부용) ──────────────────────────────
  // 이메일 로그인 체계에서 lnk 는 이메일 미설정 → 실질적 로그인 불가
  // (필요 시 admin UI에서 이메일 추가)
  const lnk = await prisma.user.upsert({
    where: { employeeNo: 'lnk' },
    update: { isActive: false },
    create: {
      employeeNo:   'lnk',
      name:         'LNK 시스템',
      passwordHash: defaultHash,
      role:         'MEMBER',
      team:         '생산팀',
      isActive:     false,    // 이메일 없으므로 비활성
      isFirstLogin: true,
    },
  })

  console.log('\n✅ 사용자 현황:')
  console.log(`   ADMIN  | ${admin.name} (${admin.employeeNo}) → ${admin.email}`)
  console.log(`   ADMIN  | ${bykim.name} (${bykim.employeeNo}) → ${bykim.email}`)  // 김복영
  console.log(`   MEMBER | ${member1.name} (${member1.employeeNo}) → ${member1.email}`)
  console.log(`   MEMBER | ${member2.name} (${member2.employeeNo}) → ${member2.email}`)
  console.log(`   SYSTEM | ${lnk.name} (${lnk.employeeNo}) → 비활성`)
  console.log('\n🔑 이메일 로그인 / 초기 비밀번호: 0000')
  console.log('   admin, bykim 은 isFirstLogin=false (별도 비밀번호 사용)')
  console.log('   EMP001, EMP002 첫 로그인 시 비밀번호 변경 강제')
}

main()
  .catch((e) => { console.error('❌ 시드 실패:', e); process.exit(1) })
  .finally(async () => prisma.$disconnect())
