import { filterBookmarksByOperationalMode, OPERATIONAL_READING_PRESETS, type OperationalReadingMode } from '@/lib/operational-reading'
import type { ModelBookmarkDTO } from '@/client'

interface WorkflowFilterBarProps {
  activeMode: OperationalReadingMode
  bookmarks: ModelBookmarkDTO[]
  onSelect: (mode: OperationalReadingMode) => void
}

export function WorkflowFilterBar({ activeMode, bookmarks, onSelect }: WorkflowFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPERATIONAL_READING_PRESETS.map((preset) => {
        const count = preset.mode === 'all' ? bookmarks.length : filterBookmarksByOperationalMode(bookmarks, preset.mode).length
        const isActive = activeMode === preset.mode

        return (
          <button
            key={preset.mode}
            type="button"
            className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.98] ${
              isActive
                ? 'border-[#D7BBA6] bg-[#F8F1E7] text-[#2B1B10]'
                : 'border-[#E7D8C7] bg-[#FFFCF8] text-[#7A6251] hover:border-[#D7BBA6] hover:bg-[#FCF6EE] hover:text-[#2B1B10]'
            }`}
            onClick={() => onSelect(preset.mode)}
            title={preset.description}
          >
            <span className="font-medium">{preset.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] ${isActive ? 'bg-white text-[#6B4D39]' : 'bg-[#F4E9DC] text-[#8A6A53]'}`}>
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
