'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CatalogBook } from '@/lib/catalog'
import { getCatalogCoverUrl, getWeeklyRecommended } from '@/lib/catalog'
import koreanTitlesRaw from '@/lib/korean-titles.json'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, BookOpen, Search, X, Menu } from 'lucide-react'

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

const genreLabels: Record<string, string> = {
  fiction: '소설', mystery: '미스터리', horror: '공포',
  adventure: '모험', philosophy: '철학', classic: '고전',
}

function getBookGenre(book: CatalogBook): string {
  const haystack = `${book.title} ${book.author}`.toLowerCase()
  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    if (keywords.some((kw) => haystack.includes(kw.toLowerCase()))) return genre
  }
  return 'fiction'
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

/* ── Eyebrow 라벨 ── */
function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={className}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        letterSpacing: '0.16em',
        textTransform: 'uppercase' as const,
        color: 'var(--ink-3)',
      }}
    >
      {children}
    </span>
  )
}

/* ── 좌표 라벨 ── */
function Coord({ text }: { text: string }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10.5px',
        letterSpacing: '0.04em',
        color: 'var(--ink-4)',
      }}
    >
      {text}
    </span>
  )
}

/* ── 책 커버 ── */
function BookCover({ book, className = '' }: { book: CatalogBook; className?: string }) {
  const [imgError, setImgError] = useState(false)
  const cover = getCatalogCoverUrl(book.id)

  if (!imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cover}
        alt={book.title}
        className={`w-full h-full object-cover ${className}`}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center p-4 ${className}`}
      style={{
        background: `repeating-linear-gradient(135deg, rgba(0,0,0,0.04) 0 2px, transparent 2px 8px), var(--accent-soft)`,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--accent-ink)',
          textAlign: 'center',
          lineHeight: 1.3,
        }}
      >
        {book.title}
      </span>
    </div>
  )
}

/* ── 책 카드 ── */
function BookCard({ book, index = 0 }: { book: CatalogBook; index?: number }) {
  const router = useRouter()
  const koTitle = KOREAN_TITLES[String(book.id)]
  const genre = getBookGenre(book)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <div
        onClick={() => router.push(`/book/${book.id}/info`)}
        className="group cursor-pointer flex flex-col"
      >
        <div
          className="aspect-[3/4.3] mb-3 overflow-hidden"
          style={{ borderRadius: '4px', transition: 'transform 0.25s cubic-bezier(.2,.7,.3,1)' }}
        >
          <div className="w-full h-full group-hover:-translate-y-1 transition-transform duration-300">
            <BookCover book={book} />
          </div>
        </div>
        <h3
          className="leading-tight mb-1 group-hover:opacity-70 transition-opacity line-clamp-2"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '15px',
            fontWeight: 500,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {koTitle || book.title}
        </h3>
        <p
          className="line-clamp-1 mb-1"
          style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--ink-4)' }}
        >
          {book.title}
        </p>
        <p
          style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--ink-4)', letterSpacing: '0.02em' }}
        >
          {book.author}
        </p>
        <span
          className="mt-1.5 w-fit"
          style={{
            background: 'var(--accent-soft)',
            color: 'var(--accent-ink)',
            fontSize: '11px',
            padding: '3px 10px',
            borderRadius: '999px',
            fontWeight: 500,
          }}
        >
          {genreLabels[genre] || '소설'}
        </span>
      </div>
    </motion.div>
  )
}

/* ── Navbar ── */
function Navbar({ query, setQuery }: { query: string; setQuery: (q: string) => void }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen && inputRef.current) inputRef.current.focus()
  }, [searchOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'color-mix(in oklch, var(--paper) 85%, transparent)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--paper-3)',
      }}
    >
      <nav className="container flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-3 group">
          <BookOpen className="w-5 h-5" style={{ color: 'var(--accent-purple)' }} />
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '18px',
              fontWeight: 500,
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
            }}
          >
            Purplelica <span style={{ color: 'var(--accent-purple)' }}>Books</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <Coord text="51.50°N · 0.12°W" />
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-6 mr-4">
            <Link
              href="/recommended"
              className="transition-colors"
              style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 500, color: 'var(--ink-3)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-3)')}
            >
              추천
            </Link>
            <Link
              href="/recommended/mbti"
              className="transition-colors"
              style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 500, color: 'var(--ink-3)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-3)')}
            >
              MBTI 추천
            </Link>
          </div>

          <div ref={searchRef} className="relative">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-full transition-colors"
              style={{ color: 'var(--ink-3)' }}
            >
              {searchOpen ? <X className="w-4.5 h-4.5" /> : <Search className="w-4.5 h-4.5" />}
            </button>

            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-80 p-3"
                  style={{
                    background: 'var(--paper)',
                    borderRadius: '4px',
                    border: '1px solid var(--paper-3)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                  }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="책 제목, 작가 검색..."
                    className="w-full px-4 py-2.5 outline-none"
                    style={{
                      background: 'var(--paper-2)',
                      borderRadius: '4px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '14px',
                      color: 'var(--ink)',
                      border: '1px solid var(--paper-3)',
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-full transition-colors"
            style={{ color: 'var(--ink-3)' }}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden"
            style={{ borderTop: '1px solid var(--paper-3)', background: 'var(--paper)' }}
          >
            <div className="container py-4 flex flex-col gap-3">
              <Link
                href="/recommended"
                onClick={() => setMobileMenuOpen(false)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: 'var(--ink-3)', padding: '8px 0' }}
              >
                추천
              </Link>
              <Link
                href="/recommended/mbti"
                onClick={() => setMobileMenuOpen(false)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: 'var(--ink-3)', padding: '8px 0' }}
              >
                MBTI 추천
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

/* ── 특집 카드 (오늘의 좌표) ── */
function FeaturedBook({ book }: { book: CatalogBook }) {
  const koTitle = KOREAN_TITLES[String(book.id)]

  return (
    <Link
      href={`/book/${book.id}/info`}
      className="group flex flex-col md:flex-row gap-8 p-8 md:p-10 transition-all"
      style={{
        background: 'var(--paper-2)',
        borderRadius: '4px',
        border: '1px solid var(--paper-3)',
      }}
    >
      <div
        className="w-full md:w-48 flex-shrink-0 aspect-[3/4.3] overflow-hidden"
        style={{ borderRadius: '4px' }}
      >
        <BookCover book={book} />
      </div>
      <div className="flex flex-col justify-center min-w-0">
        <Eyebrow className="mb-3">Today&apos;s Coordinates</Eyebrow>
        <h3
          className="mb-2 group-hover:opacity-70 transition-opacity"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(24px, 3vw, 36px)',
            fontWeight: 400,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
          }}
        >
          {koTitle || book.title}
        </h3>
        <p
          className="mb-2"
          style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', color: 'var(--ink-3)', fontStyle: 'italic' }}
        >
          {book.title}
        </p>
        <p
          style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-4)', letterSpacing: '0.04em' }}
        >
          {book.author}
        </p>
        <div className="mt-5 flex items-center gap-2" style={{ color: 'var(--accent-purple)' }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600 }}>읽기 시작하기</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  )
}

/* ── 기능 소개 ── */
function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="p-6" style={{ background: 'var(--paper-2)', borderRadius: '4px', border: '1px solid var(--paper-3)' }}>
      <span className="text-2xl mb-3 block">{icon}</span>
      <h4
        className="mb-2"
        style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.01em' }}
      >
        {title}
      </h4>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--ink-3)', lineHeight: 1.6 }}>
        {desc}
      </p>
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
  const featured = useMemo(() => weekly[0] ?? null, [weekly])

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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--paper)' }}>
      <Navbar query={query} setQuery={setQuery} />

      {/* ── Hero ── */}
      {!isSearching && !loading && (
        <section className="pt-28 pb-16 md:pt-40 md:pb-24 relative overflow-hidden">
          {/* 등고선 SVG 배경 */}
          <svg
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none"
            width="800" height="800" viewBox="0 0 800 800"
          >
            {[100, 160, 230, 310, 400].map((r) => (
              <circle key={r} cx="400" cy="400" r={r} fill="none" stroke="var(--ink)" strokeWidth="1" />
            ))}
            <line x1="400" y1="0" x2="400" y2="800" stroke="var(--ink)" strokeWidth="0.5" />
            <line x1="0" y1="400" x2="800" y2="400" stroke="var(--ink)" strokeWidth="0.5" />
          </svg>

          <div className="container relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl mx-auto text-center"
            >
              <Eyebrow className="mb-5 block">Public Domain · Free · No Sign-up</Eyebrow>

              <h1
                className="mb-6"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(36px, 6vw, 80px)',
                  fontWeight: 400,
                  color: 'var(--ink)',
                  letterSpacing: '-0.03em',
                  lineHeight: 0.95,
                }}
              >
                세계 고전 문학의
                <br />
                <span style={{ fontStyle: 'italic', color: 'var(--accent-purple)' }}>좌표를 찾다</span>
              </h1>

              <p
                className="mb-10 max-w-xl mx-auto"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'clamp(15px, 1.2vw, 17px)',
                  color: 'var(--ink-3)',
                  lineHeight: 1.7,
                }}
              >
                저작권이 만료된 영어 원서를 한글 번역과 함께.
                <br />
                회원가입 없이, 지금 바로 읽어보세요.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => document.getElementById('all-books')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'var(--ink)',
                    color: 'var(--paper)',
                    height: '44px',
                    padding: '0 22px',
                    borderRadius: '999px',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  도서 탐색하기
                  <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  href="/recommended/mbti"
                  className="inline-flex items-center gap-2 transition-colors"
                  style={{
                    background: 'transparent',
                    color: 'var(--ink)',
                    height: '44px',
                    padding: '0 22px',
                    borderRadius: '999px',
                    border: '1px solid var(--ink)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  MBTI별 추천 받기
                </Link>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-16 grid grid-cols-3 max-w-md mx-auto"
              style={{ borderTop: '1px solid var(--rule)', paddingTop: '24px' }}
            >
              {[
                { value: String(allBooks.length), label: '클래식 작품' },
                { value: '무료', label: '완전 무료' },
                { value: '한·영', label: '병렬 읽기' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 400, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                    {stat.value}
                  </p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--ink-4)', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: '4px' }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ── 오늘의 좌표 ── */}
      {!isSearching && !loading && featured && (
        <section className="py-12" style={{ borderTop: '1px solid var(--paper-3)' }}>
          <div className="container">
            <FeaturedBook book={featured} />
          </div>
        </section>
      )}

      {/* ── 이번 주 추천 ── */}
      {!isSearching && !loading && weekly.length > 1 && (
        <section className="py-14" style={{ borderTop: '1px solid var(--paper-3)' }}>
          <div className="container">
            <div className="flex items-end justify-between mb-8">
              <div>
                <Eyebrow className="mb-2 block">Weekly Picks</Eyebrow>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'clamp(24px, 3vw, 36px)',
                    fontWeight: 400,
                    color: 'var(--ink)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  이번 주 추천
                </h2>
              </div>
              <Link
                href="/recommended"
                className="flex items-center gap-1 transition-colors"
                style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 500, color: 'var(--ink-4)' }}
              >
                전체 보기 <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
              {weekly.slice(1, 7).map((book, i) => (
                <BookCard key={book.id} book={book} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 기능 소개 3열 ── */}
      {!isSearching && !loading && (
        <section className="py-14" style={{ borderTop: '1px solid var(--paper-3)' }}>
          <div className="container">
            <div className="text-center mb-10">
              <Eyebrow className="mb-2 block">Features</Eyebrow>
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(24px, 3vw, 36px)',
                  fontWeight: 400,
                  color: 'var(--ink)',
                  letterSpacing: '-0.02em',
                }}
              >
                모든 책에 포함된 기능
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <FeatureCard
                icon="📖"
                title="영한 병렬 읽기"
                desc="영어 원문과 한국어 번역을 나란히. 모르는 문장을 바로 확인하세요."
              />
              <FeatureCard
                icon="🗺️"
                title="인물 관계도"
                desc="등장인물의 관계를 지도처럼 한눈에. 복잡한 고전도 쉽게 따라갈 수 있습니다."
              />
              <FeatureCard
                icon="💡"
                title="AI 단어 설명"
                desc="모르는 단어를 클릭하면 AI가 문맥에 맞는 뜻과 예문을 알려줍니다."
              />
            </div>
          </div>
        </section>
      )}

      {/* ── MBTI CTA ── */}
      {!isSearching && !loading && (
        <section className="py-16">
          <div className="container">
            <div
              className="relative overflow-hidden p-10 md:p-16 text-center"
              style={{
                background: 'linear-gradient(135deg, var(--accent-deep), var(--accent-ink))',
                borderRadius: '4px',
              }}
            >
              <Eyebrow className="mb-4 block" >
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Personality × Literature</span>
              </Eyebrow>
              <h2
                className="mb-4"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(24px, 3vw, 40px)',
                  fontWeight: 400,
                  color: 'var(--paper)',
                  letterSpacing: '-0.02em',
                }}
              >
                내 MBTI에 맞는 책은?
              </h2>
              <p
                className="mb-8 max-w-md mx-auto"
                style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}
              >
                16가지 성격 유형별로 엄선한 고전 문학을 추천받아 보세요.
              </p>
              <Link
                href="/recommended/mbti"
                className="inline-flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'var(--paper)',
                  color: 'var(--accent-deep)',
                  height: '48px',
                  padding: '0 26px',
                  borderRadius: '999px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '14.5px',
                  fontWeight: 600,
                }}
              >
                MBTI 추천 보기
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── 전체 도서 ── */}
      <section
        id="all-books"
        className={`py-14 flex-1 ${isSearching ? 'pt-28' : ''}`}
        style={{ borderTop: isSearching ? 'none' : '1px solid var(--paper-3)' }}
      >
        <div className="container">
          <div className="flex items-end justify-between mb-4">
            <div>
              {!isSearching && <Eyebrow className="mb-2 block">Catalog</Eyebrow>}
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(24px, 3vw, 36px)',
                  fontWeight: 400,
                  color: 'var(--ink)',
                  letterSpacing: '-0.02em',
                }}
              >
                {isSearching ? '검색 결과' : '전체 도서'}
              </h2>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-4)', letterSpacing: '0.04em' }}>
              {filtered.length}권
            </span>
          </div>

          {/* Genre Filter Chips */}
          <div className="flex flex-wrap gap-2 mb-10">
            {GENRES.map((g) => (
              <button
                key={g.value}
                onClick={() => setGenre(genre === g.value ? '' : g.value)}
                className="transition-all"
                style={{
                  height: '28px',
                  padding: '0 12px',
                  borderRadius: '999px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  background: genre === g.value ? 'var(--ink)' : 'transparent',
                  color: genre === g.value ? 'var(--paper)' : 'var(--ink-3)',
                  border: `1px solid ${genre === g.value ? 'var(--ink)' : 'var(--ink-5)'}`,
                }}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Book Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4.3] mb-3" style={{ background: 'var(--paper-2)', borderRadius: '4px' }} />
                  <div className="h-4 mb-2" style={{ background: 'var(--paper-2)', borderRadius: '2px', width: '75%' }} />
                  <div className="h-3" style={{ background: 'var(--paper-2)', borderRadius: '2px', width: '50%' }} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: 'var(--ink)', marginBottom: '8px' }}>
                결과 없음
              </p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--ink-4)' }}>
                다른 키워드로 검색해보세요
              </p>
            </div>
          ) : (
            <motion.div
              key={genre}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5"
            >
              {filtered.map((book, i) => (
                <BookCard key={book.id} book={book} index={i} />
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--rule)', background: 'var(--paper-2)', paddingBottom: '100px' }}>
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} />
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', fontWeight: 500, color: 'var(--ink)' }}>
                  Purplelica <span style={{ color: 'var(--accent-purple)' }}>Books</span>
                </span>
              </Link>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--ink-3)', lineHeight: 1.7 }}>
                저작권이 만료된 세계 고전 문학을
                <br />
                한글 번역과 영어 원문으로 무료 제공합니다.
              </p>
            </div>
            <div>
              <h4 style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                탐색
              </h4>
              <div className="flex flex-col gap-2">
                <Link href="/recommended" style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--ink-3)' }}>추천</Link>
                <Link href="/recommended/mbti" style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--ink-3)' }}>MBTI 추천</Link>
              </div>
            </div>
            <div>
              <h4 style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                안내
              </h4>
              <div className="flex flex-col gap-2" style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--ink-3)' }}>
                <p>회원가입 없이 무료로 이용 가능합니다.</p>
                <p>모든 도서는 공공도메인(Public Domain) 작품입니다.</p>
                <a href="https://www.gutenberg.org" target="_blank" rel="noopener noreferrer" className="transition-colors hover:underline">
                  원문 출처: Project Gutenberg
                </a>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6" style={{ borderTop: '1px solid var(--paper-3)' }}>
            <p className="text-center" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--ink-5)', letterSpacing: '0.04em' }}>
              &copy; 2026 Purplelica Books. All translations are provided for educational purposes.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
