'use client'

import { useEffect } from 'react'

interface AdBannerProps {
  slot: string
  width?: number
  height?: number
  className?: string
}

export default function AdBanner({ slot, width, height, className = '' }: AdBannerProps) {
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any
      ;(w.adsbygoogle = w.adsbygoogle || []).push({})
    } catch {}
  }, [])

  // 고정 사이즈 지정 시
  if (width && height) {
    return (
      <div className={`overflow-hidden ${className}`}>
        <ins
          className="adsbygoogle"
          style={{ display: 'inline-block', width: `${width}px`, height: `${height}px` }}
          data-ad-client="ca-pub-1690002331948394"
          data-ad-slot={slot}
        />
      </div>
    )
  }

  // 반응형 (기본)
  return (
    <div className={`overflow-hidden ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-1690002331948394"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
