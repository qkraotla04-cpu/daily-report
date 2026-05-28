import { useState, ClipboardEvent, DragEvent } from 'react'

interface Props {
  onText: (text: string) => void      // 미리보기 전용
  onSubmit?: (text: string) => void   // 바로 제출 (미리보기 없이)
  isLoading?: boolean
  isSubmitting?: boolean
}

const PLACEHOLDER = `엑셀에서 본인 행 전체를 복사 → 여기에 Ctrl+V

예상 7개 열: 작성일 / 근무시간 / 업무명 / NO. / 진행상태 / 상세업무내용 / 이슈

· 병합 셀 자동 분해 (forward fill)
· 다중 일자 한 번에 일괄 처리
· 탭 / 줄바꿈 형식 모두 인식`

export default function PasteDropzone({ onText, onSubmit, isLoading, isSubmitting }: Props) {
  const [value, setValue] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text/plain')
    if (text) {
      e.preventDefault()
      setValue(text)
      setTimeout(() => onText(text), 50)
    }
  }

  const handlePreview = () => {
    if (value.trim()) onText(value)
  }

  const handleDirectSubmit = () => {
    if (value.trim()) onSubmit?.(value)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const text = e.dataTransfer.getData('text/plain')
    if (text) {
      setValue(text)
      onText(text)
    }
  }

  const busy = isLoading || isSubmitting
  const hasValue = value.trim().length > 0

  return (
    <div className="space-y-3">
      {/* 텍스트 영역 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-[1.5px] transition-colors ${
          isDragging
            ? 'border-accent bg-accent-soft'
            : 'border-ink bg-paper'
        }`}
        style={{ borderRadius: '2px' }}
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPaste={handlePaste}
          rows={8}
          disabled={busy}
          placeholder={PLACEHOLDER}
          className="w-full bg-transparent border-0 px-5 py-4 text-[13px] font-mono leading-relaxed resize-y focus:outline-none placeholder:text-ink-faint"
          style={{ borderRadius: '2px' }}
        />
      </div>

      {/* 버튼 행 */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-ink-muted font-mono tracking-wide">
          엑셀 선택 → Ctrl+C → 위 영역에 Ctrl+V
        </p>

        <div className="flex items-center gap-2">
          {/* 미리보기 (확인 후 제출) */}
          <button
            type="button"
            onClick={handlePreview}
            disabled={!hasValue || busy}
            className="px-4 py-2 text-[12px] font-mono uppercase tracking-[0.1em] border-[1.5px] border-ink text-ink hover:bg-cream-deep disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ borderRadius: '2px' }}
          >
            {isLoading ? '분석 중…' : '미리보기'}
          </button>

          {/* 바로 제출 */}
          {onSubmit && (
            <button
              type="button"
              onClick={handleDirectSubmit}
              disabled={!hasValue || busy}
              className="px-5 py-2 text-[12px] font-bold uppercase tracking-[0.1em] bg-accent text-white border-[1.5px] border-accent hover:bg-accent-deep hover:border-accent-deep disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ borderRadius: '2px' }}
            >
              {isSubmitting ? '저장 중…' : '제출 →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
