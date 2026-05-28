# 2 daily-report — L&K Biomed 업무일지 자동화 시스템

## 한 줄 요약
생산팀 일일 업무일지 작성·취합·요약을 자동화한 사내 웹 시스템. 운영 중.

## 아키텍처 (요점)
- 백엔드: Express + TypeScript + Prisma + SQLite, 포트 4000
- 프론트엔드: React 18 + Vite + Tailwind + React Query, 포트 5175
- npm workspaces + concurrently 로 BE+FE 동시 기동 (`npm run dev` 루트에서)
- 인증: JWT access 2h + refresh 7d HttpOnly cookie, bcrypt(12)

## 핵심 도메인 지식
- 5개 테이블: `users`, `daily_reports`, `work_tasks`, `weekly_summaries`, `audit_logs`
- `audit_logs` 는 업무 변경 이력 보존용으로 유지
- 일지 삭제는 soft delete (plain DELETE 금지)
- LOT 추적: `work_tasks` 의 자동 LOT/수량 추출은 엑셀 TSV 정규식 기반 (`src/modules/paste/`)

## 외부 시스템 연동
- 주간 요약: Claude.ai 웹 UI 수동 연동(사용자가 TXT 다운로드 → claude.ai 붙여넣기 → 결과 저장). API 키 사용 안 함.
- 파일 다운로드: ExcelJS 로 팀 취합본 xlsx 생성

## 운영 배포 (사내 단일 PC)
- pm2 + pm2-windows-startup 로 부팅 시 자동 기동
- DB 백업: 일 1회 `backend/prisma/dev.db` → 파일서버 (작업 스케줄러)
- **외부 고정 URL**: `https://operator-agony-itunes.ngrok-free.dev` (ngrok 무료 static domain)
  - tunnel 프로세스: pm2 `daily-report-tunnel` → ngrok http 4000 --url=...
  - 재시작 후에도 URL 고정 유지
  - ngrok authtoken: `C:\Users\lnkbiomed\AppData\Local\ngrok\ngrok.yml`
  - ngrok exe: `C:\Users\lnkbiomed\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_...`

## 주의
- 프론트 포트 5175 변경 시 `backend/.env` 의 `CORS_ORIGIN` 도 같이 변경
- `JWT_SECRET`, `JWT_REFRESH_SECRET` 은 환경별(.env) 관리, 커밋 금지
- 초기 계정 비밀번호 `changeme1234` 는 최초 로그인 후 즉시 변경
- 전역 규칙(`~/.claude/rules/*`)이 모두 적용됨 — 코딩 스타일/보안/TDD/검증 재기재 안 함

## 인증 모드 (2026-05-18 ~ 단독 로그인)
- 현재 `frontend/.env` 의 `VITE_AUTH_BYPASS=false` → **정상 로그인 필요**
- 로그인 화면: 33번 프로젝트 다크 테마 적용 (딥 네이비 #07111d, 틸 그라데이션 버튼)
- 개발 편의 bypass 재활성화:
  1. `frontend/.env` 의 `VITE_AUTH_BYPASS=true` 로 변경
  2. `npm run dev` 재시작 (Vite 가 환경변수 캐시함)

## 역할(Role) 정책 (2026-05-18 ~ )
- **ADMIN 계정**: `admin` (최현우), `bykim` (김봄이) — 초기 비번 `changeme1234`
- **MEMBER 계정**: 그 외 모든 사용자 (EMP001, EMP002 등) + lnk 시스템 계정
- MEMBER 는 본인 업무일지·이력만 조회 가능 (타인 데이터 접근 차단)
- ADMIN 만 일일 취합본·주간 요약·사용자 관리 접근 가능
- 프론트: 라우트 가드(`RoleRoute`) + 네비게이션 자동 필터링
- 백엔드: `requireRole(['ADMIN','TEAM_LEAD'])` 미들웨어 적용 (aggregation, weekly 라우터)

## 파일 맵 (빠른 진입)
- 백엔드 모듈: `backend/src/modules/{auth,reports,paste,aggregation,weekly,admin}/`
- 미들웨어: `backend/src/middleware/` (authenticate, requireRole, errorHandler)
- 프론트 페이지: `frontend/src/pages/` (DailyReport, MyHistory, DailyAggregation, WeeklySummary, Admin)

## 관련 자료
- 상세 사용자 가이드: `README.md` (이 폴더 내)
- 스펙 원본: `./docs/spec/` (구 `C:\CLAUDE\6 daily-report-spec\` 에서 2026-04-25 이관)
