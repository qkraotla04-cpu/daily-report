// 엑셀 → 시스템 붙여넣기 파서 (2026-04 신규 양식)
// 7개 열: 작성일 / 근무시간 / 업무명 / NO. / 진행상태 / 상세내용 / 이슈
// - 병합 셀 자동 분해 (forward-fill)
// - 다중 일자 일괄 처리
// - 탭(\t) 구분 + 줄바꿈(\n) 단일 컬럼 형태 모두 인식

export type ParsedTaskStatus = 'COMPLETED' | 'IN_PROGRESS' | 'ON_HOLD' | null

export interface ParsedTask {
  taskNo: string
  category: string | null
  content: string
  status: ParsedTaskStatus
  taskIssue: string | null
  extractedLots: string[]
  extractedQtys: string[]
}

export interface ParsedDay {
  reportDate: string // YYYY-MM-DD
  workHours: string | null
  tasks: ParsedTask[]
}

export interface ParsedPasteResult {
  days: ParsedDay[]
  warnings: string[]
}

const STATUS_MAP: Record<string, ParsedTaskStatus> = {
  완료: 'COMPLETED',
  진행중: 'IN_PROGRESS',
  진행: 'IN_PROGRESS',
  보류: 'ON_HOLD',
  대기: 'ON_HOLD',
  중단: 'ON_HOLD',
}

const HEADER_TOKENS = new Set([
  '작성일',
  '근무시간',
  '업무명',
  'NO.',
  'NO',
  '업무진행상태',
  '진행상태',
  '상세업무내용',
  '상세내용',
  '이슈/특이사항',
  '이슈',
  '특이사항',
  '명일 우선순위 업무',
  '명일 우선순위',
  '명일 예정',
  '우선순위 업무',
  '우선순위',
  '비고',
])

const COL_COUNT = 7

interface RawRow {
  cells: string[] // length === COL_COUNT
}

// ============================================================
// Public API
// ============================================================

export function parsePastedExcel(text: string): ParsedPasteResult {
  const trimmed = text.replace(/^\s+|\s+$/g, '')
  if (!trimmed) throw new Error('붙여넣기 내용이 비어있습니다.')

  const rows = tokenize(trimmed)
  if (rows.length === 0) throw new Error('읽을 수 있는 행이 없습니다.')

  const filled = forwardFill(rows)
  const days = groupIntoDays(filled)

  if (days.length === 0) {
    throw new Error('업무 항목을 찾지 못했습니다. 작성일/NO. 컬럼이 정상인지 확인해주세요.')
  }

  return { days, warnings: [] }
}

// ============================================================
// Step 1. Tokenize: text → rows of 7 cells
// ============================================================

function tokenize(text: string): RawRow[] {
  // 우선 탭 기반 TSV 시도
  if (text.includes('\t')) return tokenizeTSV(text)

  // 빈 줄(\n\n)이 셀 구분자로 쓰이는 형태 — 멀티라인 셀 보존
  // 이 형태는 셀 사이에 항상 \n\n 이 있고, 셀 내부 줄바꿈은 \n 단일.
  if (/\n\s*\n/.test(text)) return tokenizeBlankSeparated(text)

  // 그 외엔 한 줄 = 한 셀로 가정하고 7개씩 묶음
  return tokenizeLineSplit(text)
}

// 빈 줄(\n\n)을 셀 구분자로, 셀 내부 \n 은 보존
// 가변 길이 행 (병합 셀 빈칸이 누락된 경우) 도 재조립
function tokenizeBlankSeparated(text: string): RawRow[] {
  const cells = text
    .split(/\n\s*\n/)
    .map((s) => s.replace(/^\n+|\s+$/g, ''))
    .filter((s) => s.length > 0)

  // 헤더 위치 찾기 → 데이터 시작
  let dataStart = 0
  for (let i = 0; i + 6 < cells.length; i++) {
    const win = cells.slice(i, i + 7).map((s) => s.trim())
    const hits = win.filter((s) => HEADER_TOKENS.has(s)).length
    if (hits >= 5) {
      dataStart = i + 7
      break
    }
  }

  return reassembleVariableRows(cells.slice(dataStart))
}

// 셀 종류 판별
const RX_DATE = /^\d{4}[-./]\d{1,2}[-./]\d{1,2}$/
const RX_TASKNO = /^\d+(?:[-.]\d+)?$/
const RX_STATUS = /^(완료|진행중|진행|보류|대기|중단)$/
const RX_HOURS = /^\d{1,2}\s*:\s*\d{2}\s*[~\-–]\s*\d{1,2}\s*:\s*\d{2}\s*$/
const RX_CATEGORY_STRONG = /(관련\s*업무|업무|회의|보고|점검)\s*$/

function isCategoryLike(raw: string): boolean {
  const s = raw.trim()
  if (!s) return false
  if (RX_DATE.test(s) || RX_TASKNO.test(s) || RX_STATUS.test(s) || RX_HOURS.test(s)) return false
  if (RX_CATEGORY_STRONG.test(s)) return true
  // 줄바꿈 없고 짧고 한글/영문이 들어있으면 카테고리 후보
  return !s.includes('\n') && s.length <= 20 && /[가-힣A-Za-z]/.test(s)
}

// 가변 길이 셀 시퀀스 → 7-칼럼 행 재조립
// 작성일/근무시간/업무명은 forward fill, NO. 다음에 [상태, 내용] 흡수, 그 다음을 이슈/카테고리 변경/새 행 시작 으로 분기
function reassembleVariableRows(cells: string[]): RawRow[] {
  const rows: RawRow[] = []
  const ff = { date: '', hours: '', category: '' }
  let i = 0

  while (i < cells.length) {
    const c = cells[i].trim()
    if (!c) { i++; continue }

    // 작성일
    if (RX_DATE.test(c)) {
      ff.date = c
      i++
      if (i < cells.length && RX_HOURS.test(cells[i].trim())) {
        ff.hours = cells[i].trim()
        i++
      }
      // 작성일 다음에 카테고리(업무명)가 따라오는 일반적 형태
      if (i < cells.length) {
        const nx = cells[i].trim()
        if (!RX_TASKNO.test(nx) && !RX_DATE.test(nx) && isCategoryLike(nx)) {
          ff.category = nx
          i++
        }
      }
      continue
    }

    // 근무시간 단독
    if (RX_HOURS.test(c)) { ff.hours = c; i++; continue }

    // task NO.
    if (RX_TASKNO.test(c)) {
      const taskNo = c
      i++
      const status = i < cells.length ? cells[i].trim() : ''
      i++
      const content = i < cells.length ? cells[i].trim() : ''
      i++
      // 다음 셀: 이슈 / 카테고리 변경 / 새 행 시작 / 끝
      let issue = ''
      if (i < cells.length) {
        const next = cells[i].trim()
        const nextNext = i + 1 < cells.length ? cells[i + 1].trim() : ''
        if (RX_DATE.test(next) || RX_TASKNO.test(next)) {
          // 새 행 시작 — 이슈 빈
        } else if (isCategoryLike(next) && (RX_TASKNO.test(nextNext) || RX_DATE.test(nextNext))) {
          // 카테고리 변경 — 다음 루프에서 처리, 이슈 빈
        } else {
          // 이슈로 흡수
          issue = next
          i++
        }
      }
      rows.push(normalizeRow([ff.date, ff.hours, ff.category, taskNo, status, content, issue]))
      continue
    }

    // 그 외 → 카테고리(업무명) 갱신
    if (isCategoryLike(c)) {
      ff.category = c
    }
    i++
  }

  return rows
}

function tokenizeTSV(text: string): RawRow[] {
  // 멀티라인 셀(따옴표 안에 \n) 보존을 위해 상태 머신으로 파싱
  const rows: RawRow[] = []
  let cells: string[] = []
  let cur = ''
  let inQuotes = false
  let cellStarted = false

  const pushCell = () => {
    cells.push(cur)
    cur = ''
    cellStarted = false
  }
  const pushRow = () => {
    if (cur || cells.length > 0) pushCell()
    if (cells.length > 0) rows.push(normalizeRow(cells))
    cells = []
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
        continue
      }
      cur += ch
      continue
    }
    if (ch === '"' && !cellStarted) {
      inQuotes = true
      cellStarted = true
      continue
    }
    if (ch === '\t') {
      pushCell()
      continue
    }
    if (ch === '\r') continue
    if (ch === '\n') {
      pushRow()
      continue
    }
    cur += ch
    cellStarted = true
  }
  if (cur || cells.length > 0) pushRow()
  return rows.filter((r) => !isEmptyRow(r) && !isHeaderRow(r))
}

function tokenizeLineSplit(text: string): RawRow[] {
  // 탭이 없는 케이스: 한 셀 = 한 줄. 빈 줄은 빈 셀.
  // 헤더 7개 + 데이터 N×7 셀이 줄바꿈으로 나열된 형태.
  const lines = text.split(/\r?\n/).map((s) => s.replace(/\s+$/, ''))

  // 헤더 토큰 위치 찾아서 데이터 시작 지점 결정
  let dataStart = 0
  for (let i = 0; i + 6 < lines.length; i++) {
    const win = lines.slice(i, i + 7).map((s) => s.trim())
    const headerHits = win.filter((s) => HEADER_TOKENS.has(s)).length
    if (headerHits >= 5) {
      dataStart = i + 7
      break
    }
  }

  const dataLines = lines.slice(dataStart)
  // 빈 줄은 셀 구분 패딩으로 자주 등장 — 합쳐서 셀 단위로 변환
  // 단순 전략: 각 줄 = 1 셀, 7 셀씩 묶음
  const rows: RawRow[] = []
  for (let i = 0; i + COL_COUNT <= dataLines.length; ) {
    const chunk = dataLines.slice(i, i + COL_COUNT)
    rows.push(normalizeRow(chunk))
    i += COL_COUNT
  }
  return rows.filter((r) => !isEmptyRow(r))
}

function normalizeRow(cells: string[]): RawRow {
  const padded = [...cells]
  while (padded.length < COL_COUNT) padded.push('')
  if (padded.length > COL_COUNT) padded.length = COL_COUNT
  return { cells: padded.map((c) => c.trim()) }
}

function isEmptyRow(r: RawRow): boolean {
  return r.cells.every((c) => c.length === 0)
}

function isHeaderRow(r: RawRow): boolean {
  const hits = r.cells.filter((c) => HEADER_TOKENS.has(c.trim())).length
  return hits >= 4
}

// ============================================================
// Step 2. Forward fill (병합 셀 복원)
// ============================================================

function forwardFill(rows: RawRow[]): RawRow[] {
  // 작성일(0), 근무시간(1), 업무명(2) 만 forward fill 대상
  // NO.(3), 진행상태(4), 상세내용(5), 이슈(6) 은 비어있으면 그대로 둠
  const FILL_COLS = [0, 1, 2]
  let last = ['', '', ''] // 이전 채움 값
  let lastDate = '' // 작성일 그룹이 바뀔 때 업무명도 초기화

  return rows.map((r) => {
    const next = [...r.cells]
    const curDate = next[0] || last[0]
    if (next[0] && next[0] !== lastDate) {
      // 새 날짜 — 업무명 forward fill state 초기화
      last = [next[0], next[1] || '', next[2] || '']
      lastDate = next[0]
    } else {
      for (const c of FILL_COLS) {
        if (!next[c]) next[c] = last[c]
        else last[c] = next[c]
      }
      lastDate = curDate
    }
    return { cells: next }
  })
}

// ============================================================
// Step 3. Group rows into days
// ============================================================

function groupIntoDays(rows: RawRow[]): ParsedDay[] {
  const map = new Map<string, ParsedDay>()
  const order: string[] = []

  for (const r of rows) {
    const dateRaw = r.cells[0]
    const date = normalizeDate(dateRaw)
    if (!date) continue

    const taskNoRaw = r.cells[3]
    if (!taskNoRaw) continue // NO. 없는 행은 스킵

    if (!map.has(date)) {
      map.set(date, {
        reportDate: date,
        workHours: r.cells[1] || null,
        tasks: [],
      })
      order.push(date)
    }
    const day = map.get(date)!
    if (!day.workHours && r.cells[1]) day.workHours = r.cells[1]

    const content = r.cells[5]
    if (!content) continue

    day.tasks.push({
      taskNo: taskNoRaw,
      category: r.cells[2] || null,
      content,
      status: STATUS_MAP[r.cells[4]] ?? null,
      taskIssue: r.cells[6] || null,
      extractedLots: extractLots(content),
      extractedQtys: extractQtys(content),
    })
  }

  return order.map((d) => map.get(d)!).filter((d) => d.tasks.length > 0)
}

// ============================================================
// Helpers
// ============================================================

export function normalizeDate(raw: string): string | null {
  if (!raw) return null
  const s = raw.trim()
  // YYYY-MM-DD
  const m1 = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/)
  if (m1) {
    const y = m1[1]
    const mm = m1[2].padStart(2, '0')
    const dd = m1[3].padStart(2, '0')
    return `${y}-${mm}-${dd}`
  }
  return null
}

export function extractLots(text: string): string[] {
  const found = new Set<string>()
  const patterns = [/\b\d+\s*LOT\b/gi, /\bLOT[-\s][\w-]+\b/gi]
  for (const p of patterns) {
    const matches = text.match(p)
    if (matches) matches.forEach((m) => found.add(m.replace(/\s+/g, ' ').trim()))
  }
  return Array.from(found)
}

export function extractQtys(text: string): string[] {
  const found = new Set<string>()
  const regex = /\d+(?:[.,]\d+)?\s*(?:개|EA|ea|건|kg|g|ml|L|박스|BOX|box|pcs|PCS)\b/g
  const matches = text.match(regex)
  if (matches) matches.forEach((m) => found.add(m.trim()))
  return Array.from(found)
}
