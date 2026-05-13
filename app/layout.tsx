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
        <div className="w-full flex items-center justify-center py-1 bg-background">
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
