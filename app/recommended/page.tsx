'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AdBanner from '@/components/AdBanner'
import type { CatalogBook } from '@/lib/catalog'
import { getCatalogCoverUrl, getWeeklyRecommended, getWeekSeed } from '@/lib/catalog'
import koreanTitlesRaw from '@/lib/korean-titles.json'

const KOREAN_TITLES: Record<string, string> = koreanTitlesRaw as Record<string, string>

function BookCover({ book }: { book: CatalogBook }) {
  const [imgError, setImgError] = useState(false)
  const cover = getCatalogCoverUrl(book.id)

  if (!imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cover}
        alt={book.title}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    )
  }
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4"
         style={{ background: 'linear-gradient(160deg, #F5F0EB 0%, #E8E2DB 100%)' }}>
      <span className="text-3xl">📖</span>
      <p className="text-[#8C8C8C] text-xs text-center leading-snug line-clamp-2" style={{ fontFamily: 'var(--serif)' }}>{book.title}</p>
    </div>
  )
}

function CatalogCard({ book, rank }: { book: CatalogBook; rank: number }) {
  const router = useRouter()
  const koTitle = KOREAN_TITLES[String(book.id)]

  return (
    <div
      onClick={() => router.push(`/book/${book.id}/info`)}
      className="group cursor-pointer"
    >
      <div className="relative">
        <div className="aspect-[2/3] rounded-lg overflow-hidden bg-[#F5F5F3]">
          <BookCover book={book} />
        </div>
        <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-[#1A1A1A] text-white text-[11px] font-bold flex items-center justify-center">
          {rank}
        </div>
      </div>
      <div className="pt-3 space-y-1">
        <h3 className="text-[#1A1A1A] text-[13px] font-semibold leading-tight line-clamp-2">{book.title}</h3>
        {koTitle && <p className="text-[#8C8C8C] text-[11px]">{koTitle}</p>}
        <p className="text-[#B0B0B0] text-[11px]">{book.author}</p>
      </div>
    </div>
  )
}

function getWeekLabel(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
  return `${now.getFullYear()}년 ${week}주차`
}

export default function RecommendedPage() {
  const [allBooks, setAllBooks] = useState<CatalogBook[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((data: CatalogBook[]) => { setAllBooks(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const weekly = useMemo(() => getWeeklyRecommended(allBooks, 12), [allBooks])
  const weekLabel = getWeekLabel()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFFFFF' }}>

      {/* 헤더 */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur-md" style={{ borderBottom: '1px solid #F0F0EE' }}>
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-[#8C8C8C] hover:text-[#1A1A1A] transition-colors text-[13px] font-medium group">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M15 19l-7-7 7-7" />
            </svg>
            홈
          </Link>
          <Link href="/" className="text-[#1A1A1A] text-lg tracking-tight" style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>
            Purplelica
          </Link>
          <div className="w-16" />
        </div>
      </nav>

      {/* 광고 */}
      <div className="flex items-center justify-center py-2" style={{ background: '#FAFAF8' }}>
        <AdBanner slot="4978135753" width={320} height={50} />
      </div>

      {/* 히어로 */}
      <section className="py-12 sm:py-16" style={{ background: '#FAFAF8' }}>
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#B0B0B0] mb-4">
            Weekly Picks · {weekLabel}
          </p>
          <h1 className="text-[#1A1A1A] mb-3" style={{
            fontFamily: 'var(--serif)',
            fontSize: 'clamp(28px, 3.5vw, 42px)',
            fontWeight: 500,
            lineHeight: 1.2,
          }}>
            이번 주 추천 클래식
          </h1>
          <p className="text-[#8C8C8C] text-[15px] max-w-md mx-auto">
            매주 다른 책 12권이 선정됩니다. 한 권씩 정복해보세요.
          </p>
        </div>
      </section>

      {/* 추천 도서 그리드 */}
      <section className="flex-1 py-10 sm:py-14">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-8">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[2/3] bg-[#F5F5F3] rounded-lg" />
                  <div className="pt-3 space-y-2">
                    <div className="h-3 bg-[#F5F5F3] rounded" />
                    <div className="h-2.5 bg-[#F5F5F3] rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-8">
              {weekly.map((book, idx) => (
                <CatalogCard key={book.id} book={book} rank={idx + 1} />
              ))}
            </div>
          )}

          {/* MBTI 추천 배너 */}
          <Link href="/recommended/mbti" className="block mt-14">
            <div className="rounded-2xl p-6 sm:p-8 text-center transition-all duration-200 hover:shadow-md"
                 style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)' }}>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/50 mb-2">
                MBTI × Classic Literature
              </p>
              <p className="text-white text-[17px] sm:text-[19px] font-semibold mb-1" style={{ fontFamily: 'var(--serif)' }}>
                내 MBTI에 맞는 영어 원서는?
              </p>
              <p className="text-white/60 text-[13px]">
                16가지 성격 유형별 장르 궁합 &rarr;
              </p>
            </div>
          </Link>

          {/* 안내 */}
          <div className="mt-6 rounded-xl p-6 text-center" style={{ background: '#FAFAF8', border: '1px solid #F0F0EE' }}>
            <p className="text-[#1A1A1A] text-[15px] font-semibold mb-1">매주 자동 교체</p>
            <p className="text-[#8C8C8C] text-[13px] leading-relaxed">
              추천 목록은 전체 100권 중에서 매주 새롭게 선정됩니다.
              100권 모두 언제든지{' '}
              <Link href="/" className="text-[#1A1A1A] underline underline-offset-2 hover:no-underline transition-all">
                홈에서 바로 읽기
              </Link>{' '}
              가능합니다.
            </p>
          </div>

          {/* 전체 목록 바로가기 */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-[15px] font-semibold transition-all duration-200 hover:opacity-85"
              style={{ background: '#1A1A1A', color: '#FFFFFF' }}
            >
              전체 100권 보기 &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="py-8" style={{ borderTop: '1px solid #F0F0EE' }}>
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 text-center space-y-1">
          <p className="text-[#B0B0B0] text-xs">
            본 서비스는{' '}
            <a href="https://www.gutenberg.org" target="_blank" rel="noopener noreferrer"
              className="text-[#8C8C8C] underline underline-offset-2 hover:text-[#1A1A1A] transition-colors">
              Project Gutenberg
            </a>
            에서 제공하는 저작권 만료 공개 도서를 활용합니다.
          </p>
          <p className="text-[#B0B0B0] text-xs">
            &copy; 2026 Purplelica Books
          </p>
        </div>
      </footer>
    </div>
  )
}
