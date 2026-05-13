'use client'

import { usePathname } from 'next/navigation'
import AdBanner from './AdBanner'

/**
 * 하단 고정 광고 — 리더 페이지(/book/[id] but NOT /book/[id]/info)에서는 숨김
 */
export default function BottomAd() {
  const pathname = usePathname()

  // /book/123 (리더) → 숨김, /book/123/info → 표시
  const isReaderPage = /^\/book\/[^/]+$/.test(pathname)
  if (isReaderPage) return null

  return (
    <div
      className="w-full flex items-center justify-center py-2"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: 'color-mix(in oklch, var(--paper, #FAFAF7) 92%, transparent)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid var(--paper-3, #E8E6DF)',
      }}
    >
      <AdBanner slot="4978135753" width={728} height={90} />
    </div>
  )
}
