'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CatalogBook } from '@/lib/catalog'
import { getCatalogCoverUrl, getWeeklyRecommended } from '@/lib/catalog'
import koreanTitlesRaw from '@/lib/korean-titles.json'

const KOREAN_TITLES: Record<string, string> = koreanTitlesRaw as Record<string, string>

/* ── 장르 ── */
const GENRES = [
  { label: '전체', value: '' },
  { label: '소설', value: 'fiction' },
  { label: '미스터리', value: 'mystery' },
  { label: '공포', value: 'horror' },
  { label: '모험', value: 'adventure' },
  { label: '철학', value: 'philosophy' },
  { label: '고전', value: 'classic' },
]

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

function matchesKorean(book: CatalogBook, q: string): boolean {
  const koTitle = KOREAN_TITLES[String(book.id)]
  if (!koTitle) return false
  const noSpace = q.replace(/\s/g, '')
  const koNoSpace = koTitle.replace(/\s/g, '')
  return koNoSpace.includes(noSpace) || noSpace.includes(koNoSpace)
}

/* ── 책 커버 ── */
function BookCover({ book }: { book: CatalogBook }) {
  const [imgError, setImgError] = useState(false)
  const cover = getCatalogCoverUrl(book.id)

  if (!imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={cover} alt={book.title} className="w-full h-full object-cover" onError={() => setImgError(true)} />
    )
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-4"
         style={{ background: 'linear-gradient(160deg, #F5F0EB 0%, #E8E2DB 100%)' }}>
      <span className="text-3xl">📖</span>
      <p className="text-[#8C8C8C] text-xs text-center leading-snug line-clamp-3" style={{ fontFamily: 'var(--serif)' }}>{book.title}</p>
    </div>
  )
}

/* ── 책 카드 ── */
function BookCard({ book }: { book: CatalogBook }) {
  const router = useRouter()
  const koTitle = KOREAN_TITLES[String(book.id)]

  return (
    <div onClick={() => router.push(`/book/${book.id}/info`)} className="group cursor-pointer w-full">
      <div className="aspect-[2/3] rounded-xl overflow-hidden bg-[#F5F5F3] shadow-[0_2px_12px_rgba(0,0,0,0.06)] group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 group-hover:-translate-y-1">
        <BookCover book={book} />
      </div>
      <div className="mt-3.5 px-0.5">
        <h3 className="text-[#1A1A1A] text-[14px] sm:text-[15px] font-semibold leading-snug line-clamp-2">
          {book.title}
        </h3>
        {koTitle && (
          <p className="text-[#8C8C8C] text-[12px] sm:text-[13px] mt-1 line-clamp-1">{koTitle}</p>
        )}
        <p className="text-[#B0B0B0] text-[12px] mt-0.5">{book.author}</p>
      </div>
    </div>
  )
}

/* ── 메인 페이지 ── */
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
  const featured = weekly[0] ?? null

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

  const isSearching = !!(query || genre)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFFFFF' }}>

      {/* ── 네비게이션 ── */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur-md" style={{ borderBottom: '1px solid #F0F0EE' }}>
        <div className="max-w-[1080px] mx-auto px-5 sm:px-8 h-16 flex items-center gap-5">
          <Link href="/" className="shrink-0">
            <span className="text-[#1A1A1A] text-lg tracking-tight" style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>
              Purplelica
            </span>
          </Link>

          <div className="flex-1 max-w-sm">
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-[#B0B0B0] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="책 제목, 작가 검색"
                className="w-full text-sm py-2.5 bg-[#F5F5F3] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#E8E8E6] transition-all placeholder:text-[#B0B0B0]"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.25rem' }}
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0B0B0] hover:text-[#4A4A4A]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          </div>

          <Link href="/recommended" className="hidden sm:block text-[13px] font-medium text-[#4A4A4A] hover:text-[#1A1A1A] transition-colors">
            추천
          </Link>
          <Link href="/recommended/mbti" className="hidden sm:block text-[13px] font-medium text-[#4A4A4A] hover:text-[#1A1A1A] transition-colors">
            MBTI
          </Link>
        </div>
      </nav>

      {/* ── 히어로 (검색 안 할 때) ── */}
      {!isSearching && !loading && (
        <section className="py-16 sm:py-24" style={{ background: '#FAFAF8' }}>
          <div className="max-w-[1080px] mx-auto px-5 sm:px-8 text-center">
            <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-[#B0B0B0] mb-5">
              Classic Literature · {allBooks.length} Works
            </p>
            <h1 className="text-[#1A1A1A] mb-5" style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(28px, 5vw, 46px)',
              fontWeight: 400,
              lineHeight: 1.25,
              letterSpacing: '-0.02em',
            }}>
              원서의 즐거움을,<br />
              <span style={{ fontWeight: 600 }}>가장 쉽게</span>
            </h1>
            <p className="text-[#8C8C8C] text-[15px] sm:text-[16px] leading-relaxed max-w-md mx-auto mb-10">
              AI 번역과 단어 풀이로 영어 원서의 벽을 낮췄습니다.<br className="hidden sm:block" />
              회원가입 없이, 지금 바로 읽어보세요.
            </p>

            {/* 숫자 신뢰 지표 */}
            <div className="flex items-center justify-center gap-6 sm:gap-10">
              {[
                { num: `${allBooks.length}`, label: '클래식 작품' },
                { num: '3', label: '읽기 모드' },
                { num: '0', label: '원, 완전 무료' },
              ].map(({ num, label }) => (
                <div key={label}>
                  <div className="text-[#1A1A1A] text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'var(--serif)' }}>{num}</div>
                  <div className="text-[#B0B0B0] text-[11px] sm:text-[12px] mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 이번 주 추천 (검색 안 할 때) ── */}
      {!isSearching && !loading && weekly.length > 0 && (
        <section className="py-14 sm:py-20">
          <div className="max-w-[1080px] mx-auto px-5 sm:px-8">

            <div className="flex items-baseline justify-between mb-10">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#B0B0B0] mb-2">Weekly Picks</p>
                <h2 className="text-[#1A1A1A] text-2xl sm:text-[28px] font-semibold" style={{ fontFamily: 'var(--serif)' }}>
                  이번 주 추천
                </h2>
              </div>
              <Link href="/recommended" className="text-[13px] font-medium text-[#8C8C8C] hover:text-[#1A1A1A] transition-colors">
                전체 보기 &rarr;
              </Link>
            </div>

            {/* 첫 번째 책 피처드 + 나머지 그리드 */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 lg:gap-14">
              {/* 피처드 카드 */}
              {featured && (
                <Link href={`/book/${featured.id}/info`} className="group">
                  <div className="flex gap-6 sm:gap-8 p-6 sm:p-8 rounded-2xl transition-all duration-300 hover:shadow-lg"
                       style={{ background: '#FAFAF8', border: '1px solid #F0F0EE' }}>
                    <div className="w-32 sm:w-40 shrink-0 aspect-[2/3] rounded-xl overflow-hidden bg-[#F5F5F3] shadow-sm">
                      <BookCover book={featured} />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#B0B0B0] mb-3">Editor&apos;s Pick</p>
                      <h3 className="text-[#1A1A1A] text-lg sm:text-xl font-semibold leading-snug line-clamp-2 mb-2"
                          style={{ fontFamily: 'var(--serif)' }}>
                        {featured.title}
                      </h3>
                      {KOREAN_TITLES[String(featured.id)] && (
                        <p className="text-[#8C8C8C] text-[14px] mb-1">{KOREAN_TITLES[String(featured.id)]}</p>
                      )}
                      <p className="text-[#B0B0B0] text-[13px] mb-5">{featured.author}</p>
                      <span className="inline-flex items-center gap-2 text-[#1A1A1A] text-[14px] font-semibold group-hover:gap-3 transition-all">
                        읽기 시작
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </span>
                    </div>
                  </div>
                </Link>
              )}

              {/* 나머지 추천 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-x-5 gap-y-8">
                {weekly.slice(1, 7).map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 전체 목록 ── */}
      <section className="py-14 sm:py-20 flex-1" style={{ background: isSearching ? '#FFFFFF' : '#FAFAF8' }}>
        <div className="max-w-[1080px] mx-auto px-5 sm:px-8">

          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-[#1A1A1A] text-2xl sm:text-[28px] font-semibold" style={{ fontFamily: 'var(--serif)' }}>
              {isSearching ? '검색 결과' : '전체 목록'}
            </h2>
            <span className="text-[#B0B0B0] text-[13px]">{filtered.length}권</span>
          </div>

          {/* 장르 탭 */}
          <div className="flex gap-2 flex-wrap mb-10 sm:mb-12">
            {GENRES.map((g) => (
              <button
                key={g.value}
                onClick={() => setGenre(genre === g.value ? '' : g.value)}
                className={`px-5 py-2.5 rounded-full text-[13px] font-medium transition-all ${
                  genre === g.value
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-white text-[#4A4A4A] hover:bg-[#EBEBEA]'
                }`}
                style={genre !== g.value ? { border: '1px solid #E8E8E6' } : {}}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* 그리드 */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[2/3] bg-white rounded-xl" />
                  <div className="mt-3.5 space-y-2">
                    <div className="h-4 rounded bg-white" />
                    <div className="h-3 rounded bg-white w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-[#1A1A1A] text-lg font-semibold mb-2">결과 없음</p>
              <p className="text-[#8C8C8C] text-sm">다른 키워드로 검색해보세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
              {filtered.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 푸터 ── */}
      <footer className="py-10" style={{ borderTop: '1px solid #F0F0EE' }}>
        <div className="max-w-[1080px] mx-auto px-5 sm:px-8 text-center space-y-2">
          <span className="text-[#1A1A1A] text-sm font-semibold" style={{ fontFamily: 'var(--serif)' }}>Purplelica Books</span>
          <p className="text-[#B0B0B0] text-xs">
            본 서비스는{' '}
            <a href="https://www.gutenberg.org" target="_blank" rel="noopener noreferrer"
              className="text-[#8C8C8C] hover:text-[#1A1A1A] underline underline-offset-2 transition-colors">
              Project Gutenberg
            </a>
            에서 제공하는 저작권 만료 공개 도서를 활용합니다.
          </p>
          <p className="text-[#B0B0B0] text-xs">&copy; 2026 Purplelica Books</p>
        </div>
      </footer>
    </div>
  )
}
