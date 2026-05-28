# CLAUDE.md - 업무일지 자동화 시스템

> Claude Code는 작업을 시작할 때마다 반드시 이 파일 전체를 먼저 읽고, 맥락을 이해한 뒤 진행한다.

---

## 프로젝트 한 줄 요약

L&K Biomed 생산팀(10명 미만)의 일일 업무일지를 웹으로 수집해서 팀장의 수작업 취합·주간 요약 부담을 없애는 사내 전용 시스템.

## 핵심 가치

1. **팀장 취합 업무 제로화** — 직원 제출 즉시 실시간 취합, 엑셀 다운로드 가능
2. **직원 저항 최소화** — 기존 엑셀 작성은 유지, 시스템은 "붙여넣기" 한 번만 추가
3. **AI 요약 비용 0원** — Max 요금제 내에서 수동 3단계로 처리
4. **운영 이력 보존** — 변경 이력, soft delete, LOT/수량 추출 지원

---

## 프로젝트 배경

### 기존 운영 방식 (대체 대상)

팀장(최현우)이 매일 엑셀 파일 `생산팀 일일업무 보고 취합본.xlsx`에 새 시트(04월 14일, 15일...)를 추가하고, 직원들이 이메일·메신저로 보내온 내용을 손으로 붙여넣고 있음. 주간 요약 보고서도 이 취합본을 다시 읽고 팀장이 직접 작성.

### 기존 엑셀 열 구조 (중요 - 그대로 유지)

```
| 담당자 | 금일 진행 업무 | 업무 진행상태 | 명일 진행 예정 | 이슈 및 특이사항 | 비고 (부장님 요청/지시사항) |
```

- **금일 진행 업무**: 번호 매김(1. 2. 3.) + 하위 계층(` - `) 서술형
- **업무 진행상태**: 번호별 매칭 ("1.완료 2.진행중 3.완료")
- **비고**: 상부 지시사항 전달용

### 시스템 전환 원칙

직원들이 20년간 써온 양식을 **한 글자도 바꾸지 않는다**. 웹 폼 UI도 이 양식을 그대로 모방한다. 부담이 늘어나면 직원들이 안 쓴다.

---

## 사용자 및 역할 (10명 미만 규모)

| 역할 | 권한 |
|---|---|
| ADMIN | 사용자 등록·수정, 시스템 설정, 모든 조회 |
| TEAM_LEAD | 전체 일지 조회, 일일 취합본, 주간 요약, 엑셀 다운로드 |
| MEMBER | 본인 일지 작성·조회, 본인 이력 |

초기 계정: 최현우(TEAM_LEAD + ADMIN 겸임), 김수진·이아현 등(MEMBER)

---

## 기술 스택 (확정)

### 백엔드
- Node.js 20+ / Express / TypeScript
- Prisma ORM
- **SQLite** (10명 미만 규모 기준 영구 사용. 백업은 `.db` 파일 복사)
- JWT (access 2h + refresh 7d HttpOnly) + bcrypt (saltRounds 12)
- 라이브러리: ExcelJS (엑셀 생성), date-fns (한국어 로케일), pino (로깅)

### 프론트엔드
- React 18 + TypeScript + Vite
- Tailwind CSS
- React Router v6, React Query
- Axios

### 추가하지 않는 것 (YAGNI)
- ❌ Socket.io — 10명 미만에서 실시간 푸시 불필요. React Query의 `refetchInterval` (30초)로 충분
- ❌ Redis — 세션은 DB에 직접 저장
- ❌ PostgreSQL 마이그레이션 경로 — SQLite로 영구 운영

---

## 프로젝트 구조

```
C:\CLAUDE\2 daily-report\
├── CLAUDE.md                    ← 이 파일
├── README.md
├── .gitignore
├── package.json                 ← 루트 워크스페이스
│
├── backend\
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma\
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src\
│       ├── index.ts
│       ├── config\
│       ├── middleware\          ← auth, auditLog, softDelete
│       ├── modules\
│       │   ├── auth\            ← 로그인 / JWT
│       │   ├── users\           ← 사용자 관리
│       │   ├── reports\         ← 일일 일지 CRUD
│       │   ├── paste\           ← 엑셀 붙여넣기 파싱
│       │   ├── aggregation\     ← 일일·주간 집계
│       │   ├── summaries\       ← 주간 요약 저장
│       │   └── export\          ← 엑셀/TXT 내보내기
│       └── utils\
│
└── frontend\
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src\
        ├── main.tsx
        ├── App.tsx
        ├── api\
        ├── components\          ← 공통 UI
        ├── hooks\
        ├── layouts\             ← 사이드바 포함 레이아웃
        └── pages\
            ├── Login.tsx
            ├── DailyReport.tsx       ← 직원: 붙여넣기 + 폼 (탭 전환)
            ├── MyHistory.tsx         ← 직원: 내 이력
            ├── DailyAggregation.tsx  ← 팀장: 일일 취합본
            ├── WeeklySummary.tsx     ← 팀장: 주간 요약 (3단계 위저드)
            └── Admin.tsx             ← 관리자: 사용자 관리
```

---

## DB 스키마 핵심

상세는 `backend/prisma/schema.prisma`. 5개 테이블:

### users
- 3개 역할 (ADMIN / TEAM_LEAD / MEMBER)
- team 필드 (생산팀 등)

### daily_reports
- `@@unique([userId, reportDate])` — 하루 한 건
- 엑셀 양식의 자유 텍스트 필드 그대로: `tomorrowPlan`, `issues`, `remarks`
- `inputMethod`: PASTE / FORM — 어느 방식으로 입력했는지 추적

### work_tasks
- 엑셀의 "1." "2." "3." 각 업무가 레코드 하나
- `taskNo`, `content`(서술형), `status`, `category`
- `extractedLots`, `extractedQtys` — 정규식 추출 메타데이터

### weekly_summaries
- 팀장이 Claude.ai에서 생성한 AI 요약 텍스트 저장
- 규칙 기반 집계 스냅샷도 같이 저장 (totalReports, completedCount 등)

### audit_logs
- 모든 CUD 자동 기록

**전 테이블 `deletedAt` 필수. 물리 삭제 절대 금지.**

---

## 입력 방식: 2가지 병행 (직원 선택)

### 방식 A: 붙여넣기 (권장, 빠름)

직원이 엑셀에서 본인 행을 복사 → 시스템의 드롭존에 Ctrl+V → 서버가 파싱 → 미리보기 → 저장.

파싱 로직 (`backend/src/modules/paste`):
1. 클립보드 텍스트를 탭(`\t`) 단위로 열 분리
2. 기대 열 순서: 담당자 / 금일 진행 업무 / 업무 진행상태 / 명일 진행 예정 / 이슈 및 특이사항 / 비고
3. 담당자 필드는 **본인 이름과 일치하는지 검증** (다른 사람 행 붙여넣기 방지)
4. "금일 진행 업무" 텍스트에서 `^\d+\.` 패턴으로 업무 번호 분리 → `WorkTask` 레코드 생성
5. "업무 진행상태" 텍스트에서 `1\.(완료|진행중|보류)` 추출 → 번호별 상태 매칭
6. LOT 번호 정규식 추출: `\d+LOT`, `LOT-[\w-]+`, `\d+Lot` 등
7. 수량 추출: `\d+\s*(개|EA|ea|건|kg)` 등

### 방식 B: 웹 폼

동적 행 추가형 UI. 번호별 업무 입력 + 상태 드롭다운. 기존 엑셀 양식 순서대로 배치.

두 방식 모두 같은 API 엔드포인트(`POST /api/v1/reports`)로 저장하되, `inputMethod` 필드로 구분한다.

---

## 주간 요약: 3단계 수동 AI (Max 요금제 내 처리)

팀장의 비용 0원 흐름:

### 1단계: 내보내기
프런트에서 "이번 주 TXT 다운로드" 버튼 → 백엔드 `/api/v1/export/weekly?week=2026-W16` → 이번 주 월~금 모든 일지를 하나의 텍스트로 묶어서 파일 다운로드.

TXT 포맷:
```
==========================================
2026.04.13 (월) - 2026.04.17 (금) 생산팀 주간 업무일지
==========================================

[2026-04-14 (화)]
- 담당자: 최현우
- 금일 진행 업무:
  1. 일일업무 보고서 취합
  2. 현장 순회
     - XTP 가공현황 체크
  ...
- 업무 진행상태: 1.완료 2.완료 ...
- 이슈: 크로스 링크 에이원 전량 반품
...
```

### 2단계: Claude.ai에서 요약
팀장이 Claude.ai 또는 Claude Code를 열고, 시스템이 미리 제공하는 **요약 프롬프트를 복사** → TXT 첨부 → 전송 → 요약 결과 복사.

요약 프롬프트 (시스템이 "복사" 버튼으로 제공):
```
첨부한 업무일지를 분석해서 주간 요약 보고서를 작성해주세요. 형식:
1. 주간 핵심 요약 (3~5문장)
2. 주요 이슈 (긴급/중요/일반 분류)
3. 직원별 핵심 업무 (2~3줄씩)
4. 상부 지시사항(비고 칸) 요약
5. 주의 필요 사항 (미제출, 장기 진행중 업무 등)
```

### 3단계: 붙여넣기 저장
시스템 화면의 대형 textarea에 결과 붙여넣기 → 저장 → `weekly_summaries` 테이블에 기록. 이후 언제든 조회·PDF 출력 가능.

---

## 코딩 규칙

- 변수·함수명: camelCase
- DB 컬럼: snake_case (`@map`)
- 테이블: snake_case 복수형 (`@@map`)
- API: RESTful `/api/v1/...`
- 주석은 **한국어**, 핵심 로직에만
- 모든 API 핸들러 try-catch
- 표준 응답: `{ success: true, data }` / `{ success: false, error: { code, message } }`

---

## 보안·운영 필수 구현

### 1. Audit Trail
Prisma Client Extensions (`$extends`)로 create/update/delete를 가로채 `audit_logs`에 자동 기록.
- AsyncLocalStorage로 요청 컨텍스트의 userId·ipAddress 전달
- oldValue·newValue는 JSON stringify

### 2. Soft Delete
Prisma Extensions로 `.delete()` 호출을 `.update({ deletedAt: new Date() })`로 치환. 모든 조회 쿼리에 `deletedAt: null` 자동 필터.

### 3. 권한 체크
미들웨어 `requireRole(['TEAM_LEAD', 'ADMIN'])`로 엔드포인트별 보호.
MEMBER는 본인 데이터만 접근 가능 — 서비스 레이어에서 `userId === req.user.id` 검증.

### 4. 비밀번호
bcrypt saltRounds 12. 초기 관리자 비밀번호는 강제 변경 플래그 설정.

---

## 개발 단계 (Phase)

### Phase 1: 뼈대 (1~2일)
- 루트 package.json + 워크스페이스 (concurrently로 backend+frontend 동시 실행)
- backend: Express + TS + Prisma + SQLite 초기화
- frontend: Vite + React + TS + Tailwind 초기화
- `schema.prisma` 적용 + migrate dev + seed (관리자 1명 + 테스트 직원 2명)
- 로그인 화면 + 사이드바 레이아웃
- 인증 API (`POST /api/v1/auth/login`, `GET /me`, `POST /logout`)
- 로컬 `npm run dev` 동작 확인

### Phase 2: 일일 업무일지 입력 (3~4일)
- **방식 A (붙여넣기)**: 드롭존 UI + 파싱 API + 미리보기·수정·저장
  - 담당자 이름 검증 (본인만)
  - 번호별 상태 매칭 로직
  - 정규식 LOT·수량 추출
- **방식 B (웹 폼)**: 동적 행 추가 입력, 같은 저장 API로 수렴
- 내 이력 캘린더 화면

### Phase 3: 일일 취합본 (2일)
- 팀장용 취합본 화면 (엑셀 열 구조 그대로 재현)
- 미제출자 자동 표시 (빨간색)
- 엑셀 다운로드 (ExcelJS로 기존 취합본 양식 재현)
- 30초 폴링 (React Query `refetchInterval`)

### Phase 4: 주간 요약 (2일)
- 주간 자동 집계 카드 (제출률, 업무 수, 완료/진행중, 이슈, 미제출자)
- 3단계 AI 요약 위저드:
  1. 이번 주 TXT 내보내기 버튼
  2. 프롬프트 복사 + 사용법 안내
  3. 결과 붙여넣기 + 저장
- 주간 요약 이력 조회, PDF 내보내기

### Phase 5: 운영 배포 (1~2일)
- GitHub 저장소 등록 + README 정비
- 사내 PC에 설치 가이드
- 사용자 계정 일괄 등록 스크립트
- 한 페이지 사용자 가이드 (스크린샷 포함)

**총 예상 기간: 9~11일 (실제로는 Claude Code와 대화하면서 2~3주 이내 완료 목표)**

---

## 작업 진행 규칙

### 각 Phase 시작 시
1. 해당 Phase의 할 일을 TODO 리스트로 보여주고 사용자 확인
2. 큰 변경은 설명 후 진행
3. 파일 생성·수정 후 한국어 요약

### 에러 발생 시
- 에러 메시지 원문 + 원인·해결책 한국어 설명
- 명령어는 복사 가능한 코드블록으로

### 커밋 메시지
- 예: `feat(paste): 엑셀 붙여넣기 파싱 로직 구현`
- 한국어 메시지 + 영문 태그

---

## 실행 명령

```bash
# 최초 1회
cd C:\CLAUDE\2 daily-report
npm install
cd backend
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
cd ..

# 개발
npm run dev
```

접속:
- Frontend: http://localhost:5173
- Backend: http://localhost:4000/api/v1

초기 관리자:
- 사번: `admin`
- 비밀번호: `changeme1234` (최초 로그인 후 강제 변경)

---

## 환경 변수 (backend/.env)

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="개발용-배포시-반드시-변경"
JWT_REFRESH_SECRET="개발용-리프레시-배포시-변경"
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

---

## 하지 말아야 할 것

1. **물리 삭제 금지** — soft delete만
2. **Audit log 누락 금지** — 모든 CUD는 자동 기록
3. **비밀번호 평문 저장 금지** — bcrypt 필수
4. **업무 내용을 강제 구조화하지 말 것** — 서술형 유지. 수량·LOT은 정규식 추출만.
5. **엑셀 내보내기 포맷 임의 변경 금지** — 기존 취합본 양식과 동일해야 함
6. **Socket.io·Redis·PostgreSQL 도입 금지** — 10명 미만 규모에서 불필요
7. **AI API 직접 호출 코드 금지** — Max 요금제 활용 수동 방식이 확정 결정. 혹시 나중에 바뀌더라도 `weekly_summaries.summaryText`에 텍스트로 저장하는 구조는 동일하므로 API 전환은 쉬움.
8. **CLAUDE.md 업데이트 없이 구조 변경 금지**

---

## 현재 상태

- [x] 요구사항 확정 (실제 엑셀 양식 분석, 10명 미만 규모, 붙여넣기 + 폼 병행)
- [x] DB 스키마 최종본 (`backend/prisma/schema.prisma`)
- [x] 본 지침서 작성
- [ ] **Phase 1 시작 대기 중**

다음 작업 지시:
> "CLAUDE.md 전체를 읽고 전체 맥락을 이해한 뒤, Phase 1의 TODO 리스트를 먼저 보여주고 내 확인을 받은 다음에 진행해줘."
