import { describe, it, expect } from 'vitest'
import {
  parsePastedExcel,
  normalizeDate,
  extractLots,
  extractQtys,
} from '../modules/paste/paste.parser'

// ── normalizeDate ─────────────────────────────────────────────

describe('normalizeDate', () => {
  it('YYYY-MM-DD 형식 그대로 반환', () => {
    expect(normalizeDate('2024-05-01')).toBe('2024-05-01')
  })
  it('YYYY.MM.DD 형식 변환', () => {
    expect(normalizeDate('2024.5.1')).toBe('2024-05-01')
  })
  it('YYYY/MM/DD 형식 변환', () => {
    expect(normalizeDate('2024/12/31')).toBe('2024-12-31')
  })
  it('한 자리 월/일 패딩', () => {
    expect(normalizeDate('2024-1-7')).toBe('2024-01-07')
  })
  it('빈 문자열 → null', () => {
    expect(normalizeDate('')).toBeNull()
  })
  it('인식 불가 형식 → null', () => {
    expect(normalizeDate('완료')).toBeNull()
  })
})

// ── extractLots ───────────────────────────────────────────────

describe('extractLots', () => {
  it('숫자 LOT 패턴 추출', () => {
    expect(extractLots('3 LOT 검사 완료')).toEqual(['3 LOT'])
  })
  it('LOT- 접두어 패턴 추출', () => {
    expect(extractLots('LOT-ABC123 출고')).toEqual(['LOT-ABC123'])
  })
  it('복수 LOT 추출', () => {
    const result = extractLots('2 LOT 및 LOT-XYZ 처리')
    expect(result).toContain('2 LOT')
    expect(result).toContain('LOT-XYZ')
  })
  it('LOT 없으면 빈 배열', () => {
    expect(extractLots('일반 업무 처리')).toEqual([])
  })
  it('중복 LOT 하나만 반환', () => {
    const result = extractLots('3 LOT 검사 후 3 LOT 포장')
    expect(result.filter((l) => l === '3 LOT').length).toBe(1)
  })
})

// ── extractQtys ───────────────────────────────────────────────

describe('extractQtys', () => {
  it('개 단위 추출', () => {
    expect(extractQtys('120개 검사')).toEqual(['120개'])
  })
  it('EA 단위 추출', () => {
    expect(extractQtys('50EA 출고')).toEqual(['50EA'])
  })
  it('복수 단위 추출', () => {
    const result = extractQtys('120개 검사, 3박스 포장')
    expect(result).toContain('120개')
    expect(result).toContain('3박스')
  })
  it('수량 없으면 빈 배열', () => {
    expect(extractQtys('일반 업무')).toEqual([])
  })
})

// ── parsePastedExcel (TSV) ────────────────────────────────────

describe('parsePastedExcel - TSV', () => {
  const makeTSV = (rows: string[][]) =>
    rows.map((r) => r.join('\t')).join('\n')

  const HEADER = ['작성일', '근무시간', '업무명', 'NO.', '진행상태', '상세업무내용', '이슈']

  it('빈 입력 → 오류', () => {
    expect(() => parsePastedExcel('')).toThrow()
  })

  it('기본 TSV 파싱', () => {
    const tsv = makeTSV([
      HEADER,
      ['2024-05-01', '08:30~17:30', '입출고 업무', '1', '완료', '입고 120개 처리', ''],
    ])
    const result = parsePastedExcel(tsv)
    expect(result.days).toHaveLength(1)
    expect(result.days[0].reportDate).toBe('2024-05-01')
    expect(result.days[0].tasks).toHaveLength(1)
    expect(result.days[0].tasks[0].status).toBe('COMPLETED')
    expect(result.days[0].tasks[0].taskNo).toBe('1')
  })

  it('상태 매핑 — 진행중', () => {
    const tsv = makeTSV([
      HEADER,
      ['2024-05-02', '', '개발', '1', '진행중', '기능 구현 중', ''],
    ])
    const result = parsePastedExcel(tsv)
    expect(result.days[0].tasks[0].status).toBe('IN_PROGRESS')
  })

  it('상태 매핑 — 보류', () => {
    const tsv = makeTSV([
      HEADER,
      ['2024-05-02', '', '개발', '1', '보류', '일정 지연', ''],
    ])
    const result = parsePastedExcel(tsv)
    expect(result.days[0].tasks[0].status).toBe('ON_HOLD')
  })

  it('다중 날짜 파싱', () => {
    const tsv = makeTSV([
      HEADER,
      ['2024-05-01', '', '업무A', '1', '완료', '내용1', ''],
      ['2024-05-02', '', '업무B', '1', '완료', '내용2', ''],
    ])
    const result = parsePastedExcel(tsv)
    expect(result.days).toHaveLength(2)
  })

  it('병합 셀 forward-fill', () => {
    const tsv = makeTSV([
      HEADER,
      ['2024-05-01', '08:00~17:00', '업무명', '1', '완료', '내용1', ''],
      ['', '', '', '2', '진행중', '내용2', ''],
    ])
    const result = parsePastedExcel(tsv)
    expect(result.days).toHaveLength(1)
    expect(result.days[0].tasks).toHaveLength(2)
    // forward fill: 두 번째 행도 같은 날짜
    expect(result.days[0].reportDate).toBe('2024-05-01')
  })

  it('상세내용 비어있는 행 스킵', () => {
    const tsv = makeTSV([
      HEADER,
      ['2024-05-01', '', '업무', '1', '완료', '', ''],  // content 빔
      ['', '', '', '2', '완료', '내용있음', ''],
    ])
    const result = parsePastedExcel(tsv)
    expect(result.days[0].tasks).toHaveLength(1)
    expect(result.days[0].tasks[0].content).toBe('내용있음')
  })

  it('LOT 자동 추출', () => {
    const tsv = makeTSV([
      HEADER,
      ['2024-05-01', '', '검사', '1', '완료', '5 LOT 검사 완료', ''],
    ])
    const result = parsePastedExcel(tsv)
    expect(result.days[0].tasks[0].extractedLots).toContain('5 LOT')
  })

  it('수량 자동 추출', () => {
    const tsv = makeTSV([
      HEADER,
      ['2024-05-01', '', '출고', '1', '완료', '120개 출고 처리', ''],
    ])
    const result = parsePastedExcel(tsv)
    expect(result.days[0].tasks[0].extractedQtys).toContain('120개')
  })

  it('이슈 필드 파싱', () => {
    const tsv = makeTSV([
      HEADER,
      ['2024-05-01', '', '업무', '1', '완료', '내용', '이슈 발생'],
    ])
    const result = parsePastedExcel(tsv)
    expect(result.days[0].tasks[0].taskIssue).toBe('이슈 발생')
  })

  it('헤더만 있고 데이터 없으면 오류', () => {
    const tsv = makeTSV([HEADER])
    expect(() => parsePastedExcel(tsv)).toThrow()
  })
})
