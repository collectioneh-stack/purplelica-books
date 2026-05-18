'use client'

import AdBanner from './AdBanner'

/**
 * 상단 광고 — 모든 페이지에서 상단 고정 노출
 */
export default function TopAd() {
  return (
    <div
      className="w-full flex items-center justify-center"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'var(--paper-2, #F2F1EC)',
        borderBottom: '1px solid var(--paper-3, #E8E6DF)',
        height: '94px',
      }}
    >
      <AdBanner slot="4978135753" width={728} height={90} />
    </div>
  )
}
