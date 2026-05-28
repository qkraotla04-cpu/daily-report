import type { TaskStatus, TaskCategory, WorkTaskDto } from '../api/reports'

interface Props {
  task: WorkTaskDto
  onChange: (next: WorkTaskDto) => void
  onRemove: () => void
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'COMPLETED', label: '완료', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'IN_PROGRESS', label: '진행중', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'ON_HOLD', label: '보류', color: 'bg-amber-100 text-amber-700 border-amber-300' },
]

const CATEGORY_OPTIONS: { value: TaskCategory | ''; label: string }[] = [
  { value: '', label: '미지정' },
  { value: 'PRODUCTION', label: '생산' },
  { value: 'OUTSOURCING', label: '외주' },
  { value: 'QC', label: 'QC' },
  { value: 'MEETING', label: '회의' },
  { value: 'ETC', label: '기타' },
]

export default function TaskRowEditor({ task, onChange, onRemove }: Props) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
          {task.taskNo}
        </div>

        <div className="flex-1 grid grid-cols-2 gap-2">
          <select
            value={task.status}
            onChange={(e) => onChange({ ...task, status: e.target.value as TaskStatus })}
            className={`text-sm border rounded-md px-2 py-1.5 font-medium ${
              STATUS_OPTIONS.find((s) => s.value === task.status)?.color || ''
            }`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={task.category || ''}
            onChange={(e) =>
              onChange({
                ...task,
                category: (e.target.value || null) as TaskCategory | null,
              })
            }
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 text-gray-400 hover:text-red-500 text-sm px-2 py-1"
          title="삭제"
        >
          ✕
        </button>
      </div>

      <textarea
        value={task.content}
        onChange={(e) => onChange({ ...task, content: e.target.value })}
        rows={Math.max(2, task.content.split('\n').length)}
        placeholder="업무 내용 입력 (계층 구조는 ' - '로 시작)"
        className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {(task.extractedLots && task.extractedLots.length > 0) ||
      (task.extractedQtys && task.extractedQtys.length > 0) ? (
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          {task.extractedLots?.map((lot, i) => (
            <span
              key={`lot-${i}`}
              className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200"
            >
              LOT: {lot}
            </span>
          ))}
          {task.extractedQtys?.map((qty, i) => (
            <span
              key={`qty-${i}`}
              className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200"
            >
              {qty}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
