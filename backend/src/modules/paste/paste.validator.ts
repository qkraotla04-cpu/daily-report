// Quality validation — annotates ParsedPasteResult with per-task and global warnings
import type { ParsedPasteResult } from './paste.parser'

// Matches HH:MM~HH:MM, HH:MM-HH:MM, HH:MM–HH:MM (with optional spaces)
const RX_HOURS = /^\d{1,2}\s*:\s*\d{2}\s*[~\-–]\s*\d{1,2}\s*:\s*\d{2}/

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function validateAndAnnotate(result: ParsedPasteResult): ParsedPasteResult {
  const today = todayIso()
  const warnings: string[] = []

  const days = result.days.map((day) => {
    const label = `[${day.reportDate}]`

    // Future date
    if (day.reportDate > today) {
      warnings.push(`${label} 미래 날짜로 등록됩니다.`)
    }

    // Work hours format
    if (day.workHours && !RX_HOURS.test(day.workHours)) {
      warnings.push(`${label} 근무시간 형식 이상: "${day.workHours}"`)
    }

    // Duplicate task NO within same day
    const nos = day.tasks.map((t) => t.taskNo)
    const dups = new Set(nos.filter((n, i) => nos.indexOf(n) !== i))
    for (const dup of dups) {
      warnings.push(`${label} NO.${dup} 번호 중복`)
    }

    // Per-task validation
    const tasks = day.tasks.map((task) => {
      const tw: string[] = []
      if (!task.status) tw.push('진행상태 누락')
      const len = task.content.trim().length
      if (len < 10) tw.push(`상세내용 너무 짧음 (${len}자)`)
      if (tw.length > 0) {
        for (const w of tw) warnings.push(`${label} NO.${task.taskNo} ${w}`)
        return { ...task, warnings: tw }
      }
      return task
    })

    return { ...day, tasks }
  })

  return { days, warnings }
}
