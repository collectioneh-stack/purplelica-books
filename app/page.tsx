'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CatalogBook } from '@/lib/catalog'
import { getCatalogCoverUrl, getWeeklyRecommended } from '@/lib/catalog'
import koreanTitlesRaw from '@/lib/korean-titles.json'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, BookOpen, Sparkles, Users, Search, X, Menu } from 'lucide-react'

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

const coverGradients: Record<string, string> = {
  fiction: 'bg-gradient-to-br from-blue-600/80 via-blue-500/60 to-indigo-400/40',
  mystery: 'bg-gradient-to-br from-amber-700/80 via-amber-600/60 to-yellow-500/40',
  horror: 'bg-gradient-to-br from-red-800/80 via-red-600/60 to-rose-500/40',
  adventure: 'bg-gradient-to-br from-emerald-700/80 via-green-600/60 to-teal-400/40',
  philosophy: 'bg-gradient-to-br from-purple-700/80 via-violet-600/60 to-fuchsia-400/40',
  classic: 'bg-gradient-to-br from-slate-700/80 via-gray-600/60 to-zinc-400/40',
}

const genreLabels: Record<string, string> = {
  fiction: '소설', mystery: '미스터리', horror: '공포',
  adventure: '모험', philosophy: '철학', classic: '고전',
}

const genreColors: Record<string, string> = {
  fiction: 'bg-blue-50 text-blue-700',
  mystery: 'bg-amber-50 text-amber-700',
  horror: 'bg-red-50 text-red-700',
  adventure: 'bg-green-50 text-green-700',
  philosophy: 'bg-purple-50 text-purple-700',
  classic: 'bg-gray-50 text-gray-700',
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

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

/* ── 책 커버 (이미지 or 장르 그라데이션) ── */
function BookCover({ book }: { book: CatalogBook }) {
  const [imgError, setImgError] = useState(false)
  const cover = getCatalogCoverUrl(book.id)
  const genre = getBookGenre(book)

  if (!imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={cover} alt={book.title} className="w-full h-full object-cover" onError={() => setImgError(true)} />
    )
  }

  return (
    <div className={`w-full h-full flex items-center justify-center ${coverGradients[genre] || 'bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5'}`}>
      <BookOpen className="w-10 h-10 text-white/40" />
    </div>
  )
}

/* ── 책 카드 (리뉴얼 디자인) ── */
function BookCard({ book, index = 0 }: { book: CatalogBook; index?: number }) {
  const router = useRouter()
  const koTitle = KOREAN_TITLES[String(book.id)]
  const genre = getBookGenre(book)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <div onClick={() => router.push(`/book/${book.id}/info`)} className="group cursor-pointer flex flex-col">
        <div className="aspect-[3/4] rounded-xl mb-3 overflow-hidden relative group-hover:shadow-lg transition-all">
          <BookCover book={book} />
        </div>
        <h3 className="text-sm font-semibold leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-2">
          {koTitle || book.title}
        </h3>
        <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">{book.title}</p>
        <p className="text-xs text-muted-foreground mb-1.5">{book.author}</p>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full w-fit ${genreColors[genre] || 'bg-gray-50 text-gray-700'}`}>
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <nav className="container flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 group">
          <BookOpen className="w-6 h-6 text-primary transition-transform group-hover:scale-110" />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Purplelica <span className="text-primary">Books</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/recommended" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            추천
          </Link>
          <Link href="/recommended/mbti" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            MBTI 추천
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div ref={searchRef} className="relative">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-full hover:bg-accent transition-colors"
            >
              {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </button>

            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-80 bg-card rounded-xl shadow-xl border border-border p-3"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="책 제목, 작가 검색..."
                    className="w-full px-4 py-2.5 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-full hover:bg-accent transition-colors"
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
            className="md:hidden border-t border-border bg-background"
          >
            <div className="container py-4 flex flex-col gap-3">
              <Link href="/recommended" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium py-2 text-muted-foreground hover:text-primary transition-colors">
                추천
              </Link>
              <Link href="/recommended/mbti" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium py-2 text-muted-foreground hover:text-primary transition-colors">
                MBTI 추천
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
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
  const editorPicks = useMemo(() => weekly.slice(0, 2), [weekly])

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
    <div className="min-h-screen flex flex-col">
      <Navbar query={query} setQuery={setQuery} />

      {/* ── Hero Section ── */}
      {!isSearching && !loading && (
        <section className="pt-32 pb-20 md:pt-44 md:pb-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent" />
          <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/[0.03] rounded-full blur-3xl" />

          <div className="container relative">
            <motion.div {...fadeUp} className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-medium mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Public Domain · 완전 무료 · 회원가입 불필요
              </div>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.15] mb-6">
                세계 고전 문학을
                <br />
                <span className="text-primary">가장 우아하게</span> 읽는 법
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
                저작권이 만료된 영어 원서를 한글 번역과 함께 제공합니다.
                <br className="hidden md:block" />
                회원가입 없이, 지금 바로 읽어보세요.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => document.getElementById('all-books')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  도서 탐색하기
                  <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  href="/recommended/mbti"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-secondary text-secondary-foreground rounded-xl font-medium text-sm hover:bg-accent transition-colors"
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
              className="mt-16 grid grid-cols-3 max-w-lg mx-auto"
            >
              {[
                { icon: BookOpen, value: String(allBooks.length), label: '클래식 작품' },
                { icon: Users, value: '무료', label: '완전 무료' },
                { icon: Sparkles, value: '한·영', label: '병렬 읽기' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <stat.icon className="w-5 h-5 mx-auto mb-2 text-primary/60" />
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ── Editor's Pick ── */}
      {!isSearching && !loading && editorPicks.length > 0 && (
        <section className="py-16 bg-secondary/30">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Editor&apos;s Pick</p>
                <h2 className="text-2xl font-bold">에디터 추천</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {editorPicks.map((book) => {
                const koTitle = KOREAN_TITLES[String(book.id)]
                const genre = getBookGenre(book)
                return (
                  <Link
                    key={book.id}
                    href={`/book/${book.id}/info`}
                    className="group flex gap-6 p-6 bg-card rounded-2xl border border-border hover:border-primary/20 hover:shadow-lg transition-all"
                  >
                    <div className={`w-24 h-36 rounded-xl flex-shrink-0 overflow-hidden ${coverGradients[genre] || 'bg-gradient-to-br from-primary/30 to-primary/5'}`}>
                      <BookCover book={book} />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <p className="text-xs font-medium text-primary mb-2">EDITOR&apos;S PICK</p>
                      <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">
                        {koTitle || book.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">{book.title}</p>
                      <p className="text-sm text-muted-foreground">{book.author}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Weekly Picks ── */}
      {!isSearching && !loading && weekly.length > 0 && (
        <section className="py-16">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Weekly Picks</p>
                <h2 className="text-2xl font-bold">이번 주 추천</h2>
              </div>
              <Link href="/recommended" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                전체 보기 <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {weekly.slice(0, 5).map((book, i) => (
                <BookCard key={book.id} book={book} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── MBTI CTA ── */}
      {!isSearching && !loading && (
        <section className="py-20">
          <div className="container">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-10 md:p-16 text-center">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
              <h2 className="text-2xl md:text-3xl font-bold mb-4 relative">
                내 MBTI에 맞는 책은?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto relative">
                16가지 성격 유형별로 엄선한 고전 문학을 추천받아 보세요.
              </p>
              <Link
                href="/recommended/mbti"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] relative"
              >
                MBTI 추천 보기
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── 전체 도서 ── */}
      <section id="all-books" className={`py-16 flex-1 ${isSearching ? '' : 'bg-secondary/20'}`}>
        <div className="container">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">
              {isSearching ? '검색 결과' : '전체 도서'}
            </h2>
            <span className="text-sm text-muted-foreground">{filtered.length}권</span>
          </div>

          {/* Genre Filter Pills */}
          <div className="flex flex-wrap gap-2 mb-10">
            {GENRES.map((g) => (
              <button
                key={g.value}
                onClick={() => setGenre(genre === g.value ? '' : g.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  genre === g.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Book Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] bg-muted rounded-xl mb-3" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-lg font-semibold mb-2">결과 없음</p>
              <p className="text-sm text-muted-foreground">다른 키워드로 검색해보세요</p>
            </div>
          ) : (
            <motion.div
              key={genre}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
            >
              {filtered.map((book, i) => (
                <BookCard key={book.id} book={book} index={i} />
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-secondary/30">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="text-lg font-semibold">
                  Purplelica <span className="text-primary">Books</span>
                </span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                저작권이 만료된 세계 고전 문학을<br />
                한글 번역과 영어 원문으로 무료 제공합니다.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">탐색</h4>
              <div className="flex flex-col gap-2">
                <Link href="/recommended" className="text-sm text-muted-foreground hover:text-primary transition-colors">추천</Link>
                <Link href="/recommended/mbti" className="text-sm text-muted-foreground hover:text-primary transition-colors">MBTI 추천</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">안내</h4>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p>회원가입 없이 무료로 이용 가능합니다.</p>
                <p>모든 도서는 공공도메인(Public Domain) 작품입니다.</p>
                <a href="https://www.gutenberg.org" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  원문 출처: Project Gutenberg
                </a>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              &copy; 2026 Purplelica Books. All translations are provided for educational purposes.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
