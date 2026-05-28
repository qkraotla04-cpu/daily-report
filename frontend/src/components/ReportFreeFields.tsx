interface Props {
  workHours: string
  tomorrowPlan: string
  issues: string
  remarks: string
  onChange: (field: 'workHours' | 'tomorrowPlan' | 'issues' | 'remarks', value: string) => void
}

export default function ReportFreeFields({
  workHours,
  tomorrowPlan,
  issues,
  remarks,
  onChange,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">근무시간</label>
        <input
          type="text"
          value={workHours}
          onChange={(e) => onChange('workHours', e.target.value)}
          placeholder="예: 8:00 ~ 17:00"
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">명일 진행 예정</label>
        <textarea
          value={tomorrowPlan}
          onChange={(e) => onChange('tomorrowPlan', e.target.value)}
          rows={3}
          placeholder="내일 예정된 업무를 입력하세요"
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">이슈 및 특이사항</label>
        <textarea
          value={issues}
          onChange={(e) => onChange('issues', e.target.value)}
          rows={3}
          placeholder="문제점, 지연, 특이사항 등"
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          비고 <span className="text-xs text-gray-400 font-normal">(부장님 요청/지시사항)</span>
        </label>
        <textarea
          value={remarks}
          onChange={(e) => onChange('remarks', e.target.value)}
          rows={2}
          placeholder="상부 지시사항이 있으면 기록"
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}
