'use client'

import { useState, useEffect, useCallback } from 'react'
import BookCard from '@/components/BookCard'
import AdBanner from '@/components/AdBanner'
import { searchBooks, getPopularBooks, type GutenbergBook } from '@/lib/gutenberg'

const GENRES = [
  { label: '전체', value: '' },
  { label: '소설', value: 'Fiction' },
  { label: '미스터리', value: 'Detective' },
  { label: '모험', value: 'Adventure' },
  { label: '로맨스', value: 'Love stories' },
  { label: '공상과학', value: 'Science fiction' },
]

export default function Home() {
  const [books, setBooks] = useState<GutenbergBook[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [genre, setGenre] = useState('')
  const [apiError, setApiError] = useState(false)
  const [isFallback, setIsFallback] = useState(false)

  const load = useCallback(async (q: string) => {
    setLoading(true)
    setApiError(false)
    try {
      const result = q ? await searchBooks(q) : await getPopularBooks()
      setBooks(result.results)
      setIsFallback(!!(result as { _fallback?: boolean })._fallback)
    } catch {
      setApiError(true)
      setIsFallback(false)
      setBooks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load('') }, [load])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const hasKorean = /[\uAC00-\uD7A3]/.test(query)
    let searchQuery = query
    if (hasKorean && query.trim()) {
      try {
        const res = await fetch('/api/translate-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        })
        const data = await res.json()
        searchQuery = data.english
      } catch {
        searchQuery = query
      }
    }
    load(genre ? `${searchQuery} ${genre}`.trim() : searchQuery)
  }

  const handleGenre = (g: string) => {
    setGenre(g)
    load(g ? `${query} ${g}`.trim() : query)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* 헤더 */}
      <header className="bg-violet-950 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xl">📖</span>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">Purplelica Books</span>
              <span className="hidden sm:inline text-violet-400 text-xs ml-2">영어 원서 읽기</span>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="제목, 작가 검색 (한글도 가능)..."
                className="w-full bg-violet-900/60 border border-violet-700 text-white text-sm rounded-xl px-4 py-2 pr-10 outline-none focus:border-violet-400 placeholder:text-violet-400/50 transition-colors"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400 hover:text-white transition-colors text-sm">
                🔍
              </button>
            </div>
          </form>
        </div>

        {/* 헤더 하단 광고 띠 — 320×50 고정 */}
        <div className="bg-violet-900/30 border-t border-violet-800/40 h-[50px] flex items-center justify-center">
          <AdBanner slot="4978135753" width={320} height={50} />
        </div>
      </header>

      {/* 히어로 */}
      <section className="bg-violet-950 pt-10 pb-14">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-violet-800/40 border border-violet-700/60 text-violet-300 text-xs font-medium px-4 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
            Project Gutenberg · 무료 영어 원서 7만 권
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
            영어 원서로<br />
            <span className="text-violet-300">실력</span>과 <span className="text-violet-300">독서 습관</span>을 동시에
          </h1>
          <p className="text-violet-300/70 text-base mb-8 max-w-lg mx-auto">
            모르는 단어 클릭 → AI 즉시 설명 · 한국어 번역 · 인물 관계도
          </p>
          <form onSubmit={handleSearch} className="max-w-lg mx-auto flex gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="읽고 싶은 책을 검색하세요..."
              className="flex-1 bg-white/10 border border-violet-600 text-white text-sm rounded-xl px-5 py-3 outline-none focus:border-violet-300 placeholder:text-violet-400/50 transition-colors"
            />
            <button type="submit" className="bg-violet-500 hover:bg-violet-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm shrink-0">
              검색
            </button>
          </form>
        </div>
      </section>

      {/* 책 그리드 섹션 */}
      <section className="bg-violet-50 flex-1 py-8">
        <div className="max-w-6xl mx-auto px-4">

          {/* 장르 필터 */}
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <span className="text-violet-950 font-semibold text-sm mr-1">장르</span>
            {GENRES.map((g) => (
              <button
                key={g.value}
                onClick={() => handleGenre(g.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  genre === g.value
                    ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                    : 'bg-white border-violet-200 text-violet-700 hover:border-violet-400 hover:bg-violet-50'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* 폴백 안내 */}
          {isFallback && (
            <div className="mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>도서 검색 서버가 일시적으로 응답하지 않아 인기 책 목록을 표시합니다. 검색은 잠시 후 다시 시도해주세요.</span>
            </div>
          )}

          {/* 책 그리드 */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl animate-pulse shadow-sm">
                  <div className="aspect-[2/3] bg-violet-100 rounded-t-2xl" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-violet-100 rounded" />
                    <div className="h-2 bg-violet-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : apiError ? (
            <div className="text-center py-20 space-y-3">
              <div className="text-4xl">⚠️</div>
              <p className="text-violet-300 font-semibold">도서 API 서버에 연결할 수 없습니다</p>
              <p className="text-violet-500 text-sm">Project Gutenberg 외부 API가 일시적으로 응답하지 않습니다.<br />잠시 후 다시 시도해주세요.</p>
              <button
                onClick={() => load(query || genre)}
                className="mt-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-xl transition-colors"
              >
                다시 시도
              </button>
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-20 text-violet-400">
              <div className="text-4xl mb-3">📭</div>
              검색 결과가 없습니다
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}

          {/* 기능 소개 */}
          <div className="mt-12 pt-8 border-t border-violet-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: '💡', title: 'AI 단어 팝업', desc: '모르는 단어 드래그 → 발음·의미·예문 즉시 표시' },
              { icon: '🔄', title: '한국어 번역', desc: '기본값 한국어 · 영한 병렬 · 영어 전용 선택 가능' },
              { icon: '🗺️', title: '인물 관계도', desc: 'AI가 등장인물과 관계를 자동으로 시각화' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white border border-violet-100 rounded-2xl p-5 space-y-2">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-xl">{icon}</div>
                <div className="text-violet-950 font-semibold text-sm">{title}</div>
                <div className="text-violet-500 text-xs leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-violet-950 py-6 text-center space-y-1">
        <p className="text-violet-400/70 text-sm">
          본 서비스는{' '}
          <a
            href="https://www.gutenberg.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-violet-300 transition-colors"
          >
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
