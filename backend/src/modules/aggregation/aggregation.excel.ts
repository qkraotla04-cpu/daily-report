import ExcelJS from 'exceljs'
import { AggregationRow } from './aggregation.service'

const STATUS_KOR: Record<string, string> = {
  COMPLETED: '완료',
  IN_PROGRESS: '진행중',
  ON_HOLD: '보류',
}

const STATUS_FILL: Record<string, string> = {
  COMPLETED: 'FFD1FAE5', // emerald-100
  IN_PROGRESS: 'FFFEF3C7', // amber-100
  ON_HOLD: 'FFE2E8F0', // slate-200
}

export async function buildAggregationWorkbook(
  isoDate: string,
  rows: AggregationRow[]
): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'L&K Biomed 업무일지 시스템'
  wb.created = new Date()

  const ws = wb.addWorksheet(`업무일지_${isoDate}`)

  // 제목
  ws.mergeCells('A1:H1')
  const titleCell = ws.getCell('A1')
  titleCell.value = `일일 업무일지 취합본 (${isoDate})`
  titleCell.font = { name: '맑은 고딕', size: 14, bold: true }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 28

  // 헤더 (3행)
  const headers = ['No', '담당자', '근무시간', 'NO.', '업무명', '상태', '상세업무내용', '이슈/특이사항']
  const headerRow = ws.getRow(3)
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h
  })
  headerRow.eachCell((cell) => {
    cell.font = { name: '맑은 고딕', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
  })
  headerRow.height = 26

  // 데이터
  let rowIdx = 4
  rows.forEach((row, userIdx) => {
    const submitted = !!row.report
    if (!submitted) {
      const r = ws.getRow(rowIdx)
      r.getCell(1).value = userIdx + 1
      r.getCell(2).value = `${row.user.name} (${row.user.employeeNo})`
      r.getCell(3).value = ''
      ws.mergeCells(rowIdx, 4, rowIdx, 8)
      const c = r.getCell(4)
      c.value = '⚠️ 미제출'
      c.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFB91C1C' } }
      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { vertical: 'top', wrapText: true }
        cell.border = thinBorder()
        if (!cell.fill || cell.fill.type === 'pattern') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
        }
      })
      rowIdx++
      return
    }

    const tasks = row.report!.tasks
    const startRow = rowIdx
    if (tasks.length === 0) {
      rowIdx++
      return
    }
    tasks.forEach((t, i) => {
      const r = ws.getRow(rowIdx)
      if (i === 0) {
        r.getCell(1).value = userIdx + 1
        r.getCell(2).value = `${row.user.name} (${row.user.employeeNo})`
        r.getCell(3).value = row.report!.workHours ?? ''
      }
      r.getCell(4).value = t.taskNo
      r.getCell(5).value = t.category ?? ''
      r.getCell(6).value = STATUS_KOR[t.status] ?? t.status
      r.getCell(7).value = t.content
      r.getCell(8).value = t.taskIssue ?? ''

      // 상태 셀 색상
      const fillArgb = STATUS_FILL[t.status]
      if (fillArgb) {
        r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } }
      }

      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = cell.font ?? { name: '맑은 고딕', size: 10 }
        cell.alignment = { vertical: 'top', wrapText: true }
        cell.border = thinBorder()
      })
      rowIdx++
    })
    // 담당자/근무시간 셀 병합
    if (tasks.length > 1) {
      ws.mergeCells(startRow, 1, startRow + tasks.length - 1, 1)
      ws.mergeCells(startRow, 2, startRow + tasks.length - 1, 2)
      ws.mergeCells(startRow, 3, startRow + tasks.length - 1, 3)
      ws.getCell(startRow, 1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      ws.getCell(startRow, 2).alignment = { vertical: 'middle', wrapText: true }
      ws.getCell(startRow, 3).alignment = { vertical: 'middle', wrapText: true }
    }
  })

  // 컬럼 너비
  const widths = [5, 18, 14, 8, 22, 10, 50, 26]
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })

  return wb.xlsx.writeBuffer()
}

function thinBorder(): ExcelJS.Borders {
  const t = { style: 'thin' as const, color: { argb: 'FFCCCCCC' } }
  return { top: t, bottom: t, left: t, right: t } as ExcelJS.Borders
}
