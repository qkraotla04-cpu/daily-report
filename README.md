# L&K Biomed 업무일지 자동화 시스템

생산팀 일일 업무일지 작성·취합·요약을 자동화한 사내 웹 시스템.
일일 업무 기록, 팀 취합, 주간 요약, 변경 이력 보존을 지원합니다.

---

## 주요 기능

| 화면 | 권한 | 내용 |
|------|------|------|
| 오늘 업무일지 | 전원 | 엑셀 행 붙여넣기 + 직접 입력 (탭 전환), 자동 LOT/수량 추출 |
| 내 이력 | 전원 | 월별 캘린더 + 일자별 상세 |
| 일일 취합본 | 팀장/관리자 | 팀 전체 일지 (30초 자동 새로고침), 미제출자 빨간색 표시, 엑셀 다운로드 |
| 주간 요약 | 팀장/관리자 | 자동 집계 카드 + 3단계 AI 요약 위저드 (Claude.ai 활용), 이력 조회 |
| 사용자 관리 | 관리자 | 계정 추가/수정/비활성화, 비밀번호 재설정 |

---

## 기술 스택

**백엔드**: Node.js 20+ / Express / TypeScript / Prisma / SQLite / JWT (access 2h + refresh 7d HttpOnly) / bcrypt(12) / ExcelJS
**프론트엔드**: React 18 / TypeScript / Vite / Tailwind CSS / React Router v6 / React Query / Axios

---

## 디렉토리 구조

```
daily-report/
├── backend/                  Express + Prisma 백엔드
│   ├── prisma/
│   │   ├── schema.prisma     5개 테이블 (users, daily_reports, work_tasks, weekly_summaries, audit_logs)
│   │   ├── seed.ts           초기 계정 시드
│   │   └── dev.db            SQLite 파일 (gitignore)
│   └── src/
│       ├── modules/
│       │   ├── auth/         로그인/리프레시/비번변경
│       │   ├── reports/      일일 일지 CRUD
│       │   ├── paste/        엑셀 TSV 파싱 (정규식 기반 LOT/수량 추출)
│       │   ├── aggregation/  팀 취합 + ExcelJS 다운로드
│       │   ├── weekly/       주간 집계 + AI 요약 저장
│       │   └── admin/        사용자 관리
│       ├── middleware/       authenticate, requireRole, errorHandler
│       └── index.ts
├── frontend/                 React + Vite 프론트엔드
│   └── src/
│       ├── pages/            로그인, DailyReport, MyHistory, DailyAggregation, WeeklySummary, Admin
│       ├── components/       PasteDropzone, TaskRowEditor, ReportFreeFields
│       ├── api/              axios + 모듈별 API 클라이언트
│       ├── contexts/         AuthContext (JWT 자동 리프레시)
│       └── layouts/          MainLayout (사이드바)
└── package.json              npm workspaces 루트 (concurrently로 BE+FE 동시 실행)
```

---

## 로컬 개발 환경 설정

### 1. 사전 설치
- Node.js 20 LTS 이상
- npm (Node와 함께 설치됨)

### 2. 의존성 설치
```bash
cd C:\CLAUDE\2 daily-report
npm install
```

### 3. 환경 변수
`backend/.env` 파일 생성 (예시):
```env
NODE_ENV=development
PORT=4000
DATABASE_URL="file:./dev.db"
JWT_SECRET="lkbiomed-daily-report-dev-secret-key-2026"
JWT_REFRESH_SECRET="lkbiomed-daily-report-dev-refresh-secret-key-2026"
CORS_ORIGIN=http://localhost:5175
```
> ⚠️ 운영 환경에서는 32자 이상의 랜덤 문자열로 교체할 것.

### 4. DB 초기화 + 시드 (최초 1회)
```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```
초기 계정 (모두 비번 `changeme1234`):
- `admin` / 최현우 / ADMIN
- `EMP001` / 김수진 / MEMBER
- `EMP002` / 이아현 / MEMBER

### 5. 개발 서버 실행
```bash
cd C:\CLAUDE\2 daily-report
npm run dev
```
백엔드 `http://localhost:4000`, 프론트 `http://localhost:5175` 동시 기동.

---

## 운영 배포 가이드 (사내 PC)

> 10명 미만 단일 PC 운영 기준. 외부 노출 불필요.

### Windows 서비스로 백엔드 실행
1. `pm2`로 영구 실행:
   ```bash
   npm install -g pm2 pm2-windows-startup
   pm2-startup install
   cd C:\CLAUDE\2 daily-report\backend
   pm2 start "npx tsx src/index.ts" --name daily-report-api
   pm2 save
   ```
2. 부팅 시 자동 기동 확인.

### 프론트엔드 정적 빌드 + 배포
```bash
cd C:\CLAUDE\2 daily-report\frontend
npm run build
```
`dist/` 폴더를 사내 nginx / IIS에 정적 호스팅하거나 `serve` 패키지로 띄움:
```bash
npm install -g serve
serve -l 5175 dist
```

### DB 백업
- 일 1회 `backend/prisma/dev.db` 파일을 `\\fileserver\backup\daily-report\YYYY-MM-DD.db`로 복사
- Windows 작업 스케줄러에 등록:
  ```bash
  schtasks /create /tn "DailyReportBackup" /tr "robocopy C:\CLAUDE\2 daily-report\backend\prisma \\fileserver\backup\daily-report\%date% dev.db" /sc daily /st 23:30
  ```

### 보안 점검
- [ ] `JWT_SECRET`, `JWT_REFRESH_SECRET` 32자 이상 랜덤으로 변경
- [ ] `CORS_ORIGIN`을 운영 도메인으로 변경
- [ ] `admin` 계정 초기 비번 즉시 변경 (사용자 관리 → 비번 재설정)
- [ ] 사내 방화벽: 4000 포트 외부 차단
- [ ] HTTPS 사용 시 `cookie.secure: true` 활성화 (`auth.router.ts`)

---

## 사용자 빠른 가이드

### 일반 팀원
1. 로그인 (사번 + 비번)
2. **오늘 업무일지** 화면
   - 엑셀에서 본인 행 6개 열 (담당자 / 금일 업무 / 진행상태 / 명일 예정 / 이슈 / 비고) 복사
   - 붙여넣기 영역에 Ctrl+V → 자동 분석
   - 또는 "직접 입력" 탭에서 폼으로 작성
   - "제출" 클릭

### 팀장
1. **일일 취합본**: 날짜 선택 → 미제출자 확인 → "엑셀 다운로드"
2. **주간 요약**:
   - 1단계: TXT 다운로드
   - 2단계: 프롬프트 복사 → claude.ai 새 대화에 붙여넣기 → TXT 내용 추가
   - 3단계: Claude 생성 결과 복사 → 붙여넣기 → 저장

### 관리자
- **사용자 관리**에서 계정 추가/수정/비활성화/비번 재설정

---

## 트러블슈팅

| 증상 | 원인 / 해결 |
|------|------|
| 백엔드 포트 4000 사용 중 | `netstat -ano \| findstr :4000` → `taskkill /PID <pid> /F` |
| "엑셀 6개 열이 필요합니다" | 엑셀에서 담당자 행 전체를 한 번에 선택했는지 확인 (1셀씩 복사 X) |
| 로그인 후 401 반복 | 브라우저 쿠키 차단 여부 확인. SameSite=Strict 환경에서는 동일 도메인만 |
| Prisma 마이그레이션 실패 | `backend/prisma/dev.db` 삭제 후 `npx prisma migrate dev` 재실행 (개발 환경만) |

---

## 라이선스 / 소유

L&K Biomed 사내용 — 외부 배포 금지.
