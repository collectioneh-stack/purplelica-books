import type { Metadata } from 'next'
import Script from 'next/script'
import AdBanner from '@/components/AdBanner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Purplelica Books — 영어 원서 읽기',
  description: '영어 고전 7만 권 무료 · AI 단어 설명 · 한국어 번역 · 인물 관계도',
  verification: {
    google: '-lT4p_Vn3OdhYuWDCTyoEoAG8tBMmB302Gw_lgnTL64',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="google-site-verification" content="-lT4p_Vn3OdhYuWDCTyoEoAG8tBMmB302Gw_lgnTL64" />
      </head>
      <body>
        <div className="w-full flex items-center justify-center py-1 relative" style={{ background: '#FAFAF8' }}>
          <a href="/" className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-[#EBEBEA] transition-colors group z-10">
            <svg className="w-4 h-4 text-[#8C8C8C] group-hover:text-[#1A1A1A] group-hover:-translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-[#4A4A4A] text-[13px] font-semibold tracking-tight hidden sm:inline" style={{ fontFamily: 'Georgia, serif' }}>Purplelica</span>
          </a>
          <AdBanner slot="4978135753" width={728} height={90} />
        </div>
        {children}
      </body>
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1690002331948394"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
    </html>
  )
}
