'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import AdBanner from '@/components/AdBanner'
import type { CatalogBook } from '@/lib/catalog'
import { getCatalogCoverUrl, getWeeklyRecommended, getWeekSeed } from '@/lib/catalog'

function CatalogCard({ book }: { book: CatalogBook }) {
  const [imgError, setImgError] = useState(false)
  const cover = getCatalogCoverUrl(book.id)

  return (
    <Link href={`/book/${book.id}`}>
      <div className="group bg-white border border-violet-100 rounded-2xl overflow-hidden hover:border-violet-300 hover:shadow-xl hover:shadow-violet-100/60 transition-all duration-200 cursor-pointer">
        <div className="aspect-[2/3] bg-violet-50 overflow-hidden relative">
          {!imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-violet-200">📚</div>
          )}
        </div>
        <div className="p-4 space-y-1">
          <h3 className="text-violet-950 text-sm font-semibold leading-tight line-clamp-2">{book.title}</h3>
          <p className="text-violet-400 text-xs">{book.author}</p>
          <p className="text-violet-300 text-xs">{book.year > 0 ? book.year : '고전'}</p>
        </div>
      </div>
    </Link>
  )
}

// Returns current week label e.g. "2026년 18주차"
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
  const nextSeed = getWeekSeed() + 1 // just to show "next week changes"

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* 헤더 */}
      <header className="bg-violet-950 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-violet-400 hover:text-white transition-colors text-sm shrink-0">
            ← 홈
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <span className="text-white font-bold text-lg tracking-tight">이번 주 추천</span>
            <span className="text-violet-400 text-sm">{weekLabel}</span>
          </div>
        </div>
        <div className="bg-violet-900/30 border-t border-violet-800/40 h-[50px] flex items-center justify-center">
          <AdBanner slot="4978135753" width={320} height={50} />
        </div>
      </header>

      {/* 히어로 */}
      <section className="bg-violet-950 pt-10 pb-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-violet-800/40 border border-violet-700/60 text-violet-300 text-xs font-medium px-4 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            {weekLabel} · 매주 월요일 자동 교체
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-3">
            이번 주 추천 클래식
          </h1>
          <p className="text-violet-300/70 text-sm max-w-md mx-auto">
            매주 다른 책 12권이 선정됩니다. 한 권씩 정복해보세요.
          </p>
        </div>
      </section>

      {/* 추천 도서 그리드 */}
      <section className="bg-violet-50 flex-1 py-10">
        <div className="max-w-6xl mx-auto px-4">

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl animate-pulse shadow-sm">
                  <div className="aspect-[2/3] bg-violet-100 rounded-t-2xl" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-violet-100 rounded" />
                    <div className="h-2 bg-violet-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
              {weekly.map((book, idx) => (
                <div key={book.id} className="relative">
                  <div className="absolute -top-2 -left-2 z-10 w-7 h-7 bg-violet-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md">
                    {idx + 1}
                  </div>
                  <CatalogCard book={book} />
                </div>
              ))}
            </div>
          )}

          {/* 안내 */}
          <div className="mt-12 bg-violet-100 border border-violet-200 rounded-2xl p-6 text-center">
            <div className="text-2xl mb-2">🔄</div>
            <p className="text-violet-800 font-semibold text-sm mb-1">매주 자동 교체</p>
            <p className="text-violet-600 text-xs">
              추천 목록은 전체 100권 중에서 매주 새롭게 선정됩니다.<br />
              100권 모두 언제든지{' '}
              <Link href="/" className="underline hover:text-violet-800 transition-colors">
                홈에서 바로 읽기
              </Link>{' '}
              가능합니다.
            </p>
          </div>

          {/* 전체 목록 바로가기 */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              전체 100권 보기 →
            </Link>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-violet-950 py-6 text-center space-y-1">
        <p className="text-violet-400/70 text-sm">
          본 서비스는{' '}
          <a href="https://www.gutenberg.org" target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-violet-300 transition-colors">
            Project Gutenberg
          </a>
          에서 제공하는 저작권 만료 공개 도서를 활용합니다.
        </p>
        <p className="text-violet-500/50 text-xs">
          Powered by Project Gutenberg · © 2026 Purplelica Books
        </p>
      </footer>
    </div>
  )
}
