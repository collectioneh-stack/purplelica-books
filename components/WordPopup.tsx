'use client'

import { useEffect, useRef } from 'react'

interface WordData {
  word: string
  pronunciation: string
  meaning: string
  example: string
  example_ko: string
}

interface WordPopupProps {
  data: WordData | null
  loading: boolean
  position: { x: number; y: number }
  onClose: () => void
}

export default function WordPopup({ data, loading, position, onClose }: WordPopupProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // 뷰포트 기준 위치 조정
  const top = Math.min(position.y + 12, window.innerHeight - 240)
  const left = Math.min(Math.max(position.x - 120, 8), window.innerWidth - 264)

  return (
    <div
      ref={ref}
      style={{ top, left, position: 'fixed' }}
      className="z-50 w-64 bg-[#1a1630] border border-violet-800/60 rounded-2xl shadow-2xl shadow-violet-900/30 p-4 space-y-3"
    >
      {loading ? (
        <div className="flex items-center gap-2 text-violet-400 text-sm py-2">
          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          단어 분석 중...
        </div>
      ) : data ? (
        <>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-white font-bold text-base">{data.word}</span>
              <span className="text-violet-500 text-xs">{data.pronunciation}</span>
            </div>
            <p className="text-violet-300 text-sm font-medium mt-1">{data.meaning}</p>
          </div>
          <div className="border-t border-violet-900/50 pt-3 space-y-1">
            <p className="text-[#d4cfe8] text-xs leading-relaxed">{data.example}</p>
            <p className="text-violet-500 text-xs leading-relaxed">{data.example_ko}</p>
          </div>
        </>
      ) : (
        <p className="text-violet-600 text-sm">설명을 불러올 수 없습니다</p>
      )}
    </div>
  )
}
