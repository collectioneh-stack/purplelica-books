import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'Purplelica Books — 영어 원서 읽기',
  description: '영어 고전 7만 권 무료 · AI 단어 설명 · 한국어 번역 · 인물 관계도',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={geist.variable}>
      <body className="min-h-screen bg-stone-950 text-white antialiased">
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
