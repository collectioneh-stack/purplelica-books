'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import AdBanner from '@/components/AdBanner'
import type { CatalogBook } from '@/lib/catalog'
import { getCatalogCoverUrl, getWeeklyRecommended } from '@/lib/catalog'
import koreanTitlesRaw from '@/lib/korean-titles.json'

const KOREAN_TITLES: Record<string, string> = koreanTitlesRaw as Record<string, string>

const GENRES = [
  { label: '전체', value: '' },
  { label: '소설', value: 'fiction' },
  { label: '미스터리', value: 'mystery' },
  { label: '공포', value: 'horror' },
  { label: '모험', value: 'adventure' },
  { label: '철학', value: 'philosophy' },
  { label: '고전', value: 'classic' },
]

function matchesKorean(book: CatalogBook, q: string): boolean {
  const koTitle = KOREAN_TITLES[String(book.id)]
  if (!koTitle) return false
  const noSpace = q.replace(/\s/g, '')
  const koNoSpace = koTitle.replace(/\s/g, '')
  return koNoSpace.includes(noSpace) || noSpace.includes(koNoSpace)
}

// Genre keyword mapping (author/title based heuristic)
const GENRE_KEYWORDS: Record<string, string[]> = {
  fiction:     ['Dickens', 'Austen', 'Tolstoy', 'Dostoevsky', 'Hugo', 'Joyce', 'Brontë', 'Hardy', 'James', 'Wharton', 'Chopin', 'Forster', 'Alcott', 'Montgomery', 'Burnett', 'Cather'],
  mystery:     ['Doyle', 'Sherlock', 'Scarlet', 'Baskervilles', 'Study'],
  horror:      ['Frankenstein', 'Dracula', 'Strange Case', 'Yellow Wallpaper', 'Great God Pan', 'Sleepy Hollow', 'Phantom'],
  adventure:   ['Huckleberry', 'Tom Sawyer', 'Treasure Island', 'Call of the Wild', 'Sea-Wolf', 'White Fang', 'Jungle Book', 'Around the World', 'Twenty Thousand', 'Time Machine', 'War of the Worlds', 'Island of Doctor Moreau'],
  philosophy:  ['Nietzsche', 'Aurelius', 'Plato', 'Hobbes', 'Tao', 'Art of War', 'Prince', 'Leviathan', 'Meditations', 'Zarathustra', 'Beyond Good'],
  classic:     ['Homer', 'Odyssey', 'Iliad', 'Dante', 'Cervantes', 'Quixote', 'Arabian', 'Aesop', 'Grimm', 'Alighieri'],
}

function matchesGenre(book: CatalogBook, genre: string): boolean {
  if (!genre) return true
  const keywords = GENRE_KEYWORDS[genre] ?? []
  const haystack = `${book.title} ${book.author}`.toLowerCase()
  return keywords.some((kw) => haystack.includes(kw.toLowerCase()))
}

function CatalogCard({ book }: { book: CatalogBook }) {
  const [imgError, setImgError] = useState(false)
  const cover = getCatalogCoverUrl(book.id)

  return (
    <Link href={`/book/${book.id}`}>
      <div className="group bg-white border border-violet-100 rounded-2xl overflow-hidden hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100/50 transition-all duration-200 cursor-pointer">
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
            <div className="w-full h-full flex items-center justify-center text-4xl text-violet-200">
              📚
            </div>
          )}
          <div className="absolute bottom-2 right-2 bg-violet-950/75 backdrop-blur text-violet-200 text-[10px] px-2 py-0.5 rounded-full">
            {book.year > 0 ? book.year : '고전'}
          </div>
        </div>
        <div className="p-3 space-y-1">
          <h3 className="text-violet-950 text-sm font-semibold leading-tight line-clamp-2">{book.title}</h3>
          {KOREAN_TITLES[String(book.id)] && (
            <p className="text-violet-600 text-xs font-medium leading-tight">{KOREAN_TITLES[String(book.id)]}</p>
          )}
          <p className="text-violet-400 text-xs">{book.author}</p>
        </div>
      </div>
    </Link>
  )
}

export default function Home() {
  const [allBooks, setAllBooks] = useState<CatalogBook[]>([])
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((data: CatalogBook[]) => { setAllBooks(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const weekly = useMemo(() => getWeeklyRecommended(allBooks, 8), [allBooks])

  const filtered = useMemo(() => {
    let books = allBooks
    if (genre) books = books.filter((b) => matchesGenre(b, genre))
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      books = books.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          matchesKorean(b, q)
      )
    }
    return books
  }, [allBooks, genre, query])

  const showingAll = !query && !genre

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

          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="제목, 작가 검색..."
                className="w-full bg-violet-900/60 border border-violet-700 text-white text-sm rounded-xl px-4 py-2 pr-10 outline-none focus:border-violet-400 placeholder:text-violet-400/50 transition-colors"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400 hover:text-white transition-colors text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <Link
            href="/recommended"
            className="shrink-0 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors hidden sm:block"
          >
            이번 주 추천
          </Link>
        </div>

        {/* 광고 띠 */}
        <div className="bg-violet-900/30 border-t border-violet-800/40 h-[50px] flex items-center justify-center">
          <AdBanner slot="4978135753" width={320} height={50} />
        </div>
      </header>

      {/* 히어로 */}
      <section className="bg-violet-950 pt-10 pb-14">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-violet-800/40 border border-violet-700/60 text-violet-300 text-xs font-medium px-4 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
            인기 클래식 100권 · 즉시 읽기 가능
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
            영어 원서로<br />
            <span className="text-violet-300">실력</span>과 <span className="text-violet-300">독서 습관</span>을 동시에
          </h1>
          <p className="text-violet-300/70 text-base mb-8 max-w-lg mx-auto">
            모르는 단어 클릭 → AI 즉시 설명 · 한국어 번역 · 인물 관계도
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/recommended"
              className="bg-violet-500 hover:bg-violet-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              이번 주 추천 →
            </Link>
          </div>
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
                onClick={() => setGenre(genre === g.value ? '' : g.value)}
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

          {/* 이번 주 추천 — 필터 없을 때만 표시 */}
          {showingAll && !loading && weekly.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-violet-950 font-bold text-lg">
                  ✨ 이번 주 추천
                  <span className="ml-2 text-violet-400 text-sm font-normal">매주 새로 교체</span>
                </h2>
                <Link href="/recommended" className="text-violet-600 hover:text-violet-800 text-sm font-medium transition-colors">
                  전체 보기 →
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-4">
                {weekly.map((book) => (
                  <CatalogCard key={book.id} book={book} />
                ))}
              </div>
            </div>
          )}

          {/* 전체 목록 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-violet-950 font-bold text-lg">
              {query || genre ? '검색 결과' : '전체 목록'}
              {!loading && (
                <span className="ml-2 text-violet-400 text-sm font-normal">{filtered.length}권</span>
              )}
            </h2>
          </div>

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
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-violet-400">
              <div className="text-4xl mb-3">📭</div>
              검색 결과가 없습니다
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filtered.map((book) => (
                <CatalogCard key={book.id} book={book} />
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
