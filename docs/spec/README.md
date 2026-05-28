# 업무일지 자동화 시스템 (Daily Report)

생산팀 일일 업무일지를 직원별로 구조화 입력하고, 주단위로 자동 취합·분석하는 사내 웹 시스템.

## 주요 기능

- 직원별 일일 업무일지 작성 (생산 / 외주 / 기타 구분, 품목·수량 구조화)
- 이슈·특이사항 기록
- 팀장용 주간 취합 대시보드
- 엑셀 / PDF 보고서 내보내기
- 역할별 권한 관리 (시스템관리자 / 팀장 / 파트장 / 작업자 / 외주담당 / QC)

## 운영 기록 관리

- 업무 변경 이력 보존
- 모든 데이터 변경 이력 자동 기록
- 물리 삭제 불가 (Soft Delete 전용)
- LOT/수량 자동 추출 지원

## 기술 스택

| 영역 | 스택 |
|---|---|
| 프론트엔드 | React 18, TypeScript, Vite, Tailwind CSS, React Query |
| 백엔드 | Node.js 20, Express, TypeScript, Prisma |
| DB | SQLite (개발/초기) → PostgreSQL (운영 전환) |
| 인증 | JWT + bcrypt |

## 설치 및 실행

### 사전 요구사항
- Node.js 20 이상
- Git

### 최초 설치

```bash
git clone <repo-url> daily-report
cd daily-report
npm install

# DB 초기화
cd backend
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
cd ..
```

### 개발 서버 실행

```bash
npm run dev
```

- 프론트엔드: http://localhost:5173
- 백엔드 API: http://localhost:4000/api/v1

### 초기 관리자 계정 (시드 데이터)

- 사번: `admin`
- 비밀번호: `changeme1234` (**최초 로그인 후 반드시 변경**)

## 프로젝트 구조

```
daily-report/
├── backend/          # Express + Prisma API 서버
├── frontend/         # React SPA
├── CLAUDE.md         # 개발 지침서 (Claude Code용)
└── README.md
```

## 배포 (사내 서버)

자세한 내용은 `docs/DEPLOYMENT.md` 참고 예정.

## 라이선스

사내 전용. 외부 배포 금지.
