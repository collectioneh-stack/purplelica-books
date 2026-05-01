'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AdBanner from '@/components/AdBanner'
import type { CatalogBook } from '@/lib/catalog'
import { getCatalogCoverUrl, getWeeklyRecommended } from '@/lib/catalog'
import koreanTitlesRaw from '@/lib/korean-titles.json'

const KOREAN_TITLES: Record<string, string> = koreanTitlesRaw as Record<string, string>

const BOOK_DESCRIPTIONS: Record<string, string> = {
  '84': '과학자 빅터 프랑켄슈타인이 새 생명을 창조했지만 그 존재로 인해 비극을 맞이하는 공포 소설. 메리 셸리의 불멸의 걸작으로 근대 SF의 시초.',
  '1342': '편견과 오만을 넘어선 엘리자베스 베넷과 다아시의 사랑 이야기. 제인 오스틴의 대표작이자 영문 로맨스 소설의 정수.',
  '11': '앨리스가 토끼를 따라 이상한 나라로 떨어지는 환상 동화. 어른도 즐길 수 있는 숨겨진 철학과 유머가 가득.',
  '2701': '선장 에이헤브의 흰 고래 모비딕에 대한 집착과 복수를 그린 대서사시. 인간의 야망과 자연의 위력을 탁월하게 묘사.',
  '1952': '드라큘라 백작과 그를 쫓는 영웅들의 대결. 뱀파이어 소설의 원형이자 고딕 공포의 영원한 걸작.',
  '98': '프랑스 혁명을 배경으로 런던과 파리 두 도시에 걸친 사랑과 희생의 이야기. 찰스 디킨스의 역사 대하소설.',
  '1661': '셜록 홈즈의 첫 등장. 피로 쓰인 수수께끼를 풀어가는 탐정 소설의 고전으로 추리 장르의 시초.',
  '74': '미시시피 강을 떠내려가는 허클베리 핀의 자유로운 모험기. 마크 트웨인이 그린 미국의 자유와 우정.',
  '2554': '가난한 청년의 살인과 그에 따른 죄의식을 심층 탐구한 심리 소설. 도스토예프스키의 철학적 걸작.',
  '76': '인디언 조의 보물을 찾아나서는 톰 소여의 유쾌한 모험기. 마크 트웨인의 활기찬 소년 성장 소설.',
  '5200': '하룻밤 사이에 벌레로 변해버린 그레고르의 이야기. 카프카의 부조리 문학 대표작으로 현대인의 소외를 상징.',
  '1080': '지킬 박사가 약물로 또 다른 자아 하이드를 만들어내는 이중 인격 공포 소설. 인간 내면의 선악을 탐구.',
  '174': '아름다운 청년 도리언 그레이의 타락과 절망을 그린 오스카 와일드의 유일한 장편소설. 미와 도덕의 충돌.',
  '120': '어른이 되기를 거부하는 피터 팬이 아이들을 이끌고 네버랜드로 가는 환상 동화.',
  '16': '앨리스가 거울 속 세계를 탐험하는 이상한 나라의 속편. 체스 게임을 배경으로 펼쳐지는 환상 모험.',
  '1260': '해양 탐험가 걸리버가 소인국·거인국·이상한 나라를 여행하는 풍자 소설. 인간 사회를 날카롭게 비판.',
  '345': '브램 스토커의 드라큘라. 서간문 형식으로 전개되는 뱀파이어 공포의 원전.',
  '1400': '샬럿 브론테의 자전적 소설. 고아 제인 에어가 역경을 딛고 사랑을 찾아가는 이야기.',
  '158': '에마 우드하우스가 주변 사람들의 사랑을 주선하다가 자신의 마음을 깨닫는 오스틴의 걸작 코미디.',
  '768': '황야의 폭풍 같은 사랑, 히스클리프와 캐서린의 파국적 열정. 에밀리 브론테의 유일한 소설.',
}

function BookDetailModal({ book, onClose }: { book: CatalogBook; onClose: () => void }) {
  const router = useRouter()
  const [imgError, setImgError] = useState(false)
  const koTitle = KOREAN_TITLES[String(book.id)]
  const desc = BOOK_DESCRIPTIONS[String(book.id)] ?? 'Project Gutenberg에서 무료로 제공하는 영문 고전 작품입니다.'
  const cover = getCatalogCoverUrl(book.id)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
        >
          ✕
        </button>

        <div className="flex gap-5 p-6 pb-0">
          {/* 표지 */}
          <div className="shrink-0 w-24 h-36 rounded-lg overflow-hidden shadow-md bg-gray-100">
            {!imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt={book.title} className="w-full h-full object-cover" onError={() => setImgError(true)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-2 bg-violet-50">
                <p className="text-violet-700 text-[10px] text-center leading-tight line-clamp-4">{book.title}</p>
              </div>
            )}
          </div>

          {/* 메타 */}
          <div className="flex-1 min-w-0 pt-1">
            {koTitle && (
              <p className="text-violet-600 text-xs font-semibold mb-1 tracking-wide">{koTitle}</p>
            )}
            <h2 className="text-gray-900 font-bold text-lg leading-tight line-clamp-3" style={{ fontFamily: 'Georgia, serif' }}>
              {book.title}
            </h2>
            <p className="text-gray-500 text-sm mt-1.5">{book.author}</p>
            {book.year > 0 && (
              <span className="inline-block mt-2 text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {book.year}년
              </span>
            )}
          </div>
        </div>

        {/* 소개 */}
        <div className="px-6 pt-5 pb-2">
          <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
        </div>

        {/* 읽기 버튼 */}
        <div className="p-6 pt-4">
          <button
            onClick={() => router.push(`/book/${book.id}`)}
            className="w-full py-4 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-base transition-colors shadow-lg shadow-violet-200"
          >
            📖 읽기 시작
          </button>
        </div>
      </div>
    </div>
  )
}

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

function matchesKorean(book: CatalogBook, q: string): boolean {
  const koTitle = KOREAN_TITLES[String(book.id)]
  if (!koTitle) return false
  const noSpace = q.replace(/\s/g, '')
  const koNoSpace = koTitle.replace(/\s/g, '')
  return koNoSpace.includes(noSpace) || noSpace.includes(koNoSpace)
}

function matchesGenre(book: CatalogBook, genre: string): boolean {
  if (!genre) return true
  const keywords = GENRE_KEYWORDS[genre] ?? []
  const haystack = `${book.title} ${book.author}`.toLowerCase()
  return keywords.some((kw) => haystack.includes(kw.toLowerCase()))
}

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
      className={`w-full h-full flex flex-col items-center justify-center gap-2 px-3 ${className}`}
      style={{
        background: 'repeating-linear-gradient(135deg, rgba(0,0,0,0.04) 0 2px, transparent 2px 8px), var(--paper-2)',
        fontFamily: 'var(--serif)',
      }}
    >
      <p className="text-ink-3 text-xs text-center leading-snug line-clamp-3">{book.title}</p>
      <p className="text-ink-5 text-[10px] text-center">{book.author}</p>
    </div>
  )
}

function BookCard({ book, onClick }: { book: CatalogBook; onClick: () => void }) {
  return (
    <div onClick={onClick} className="cursor-pointer">
      <div className="book-card bg-paper-2 border border-paper-3 overflow-hidden" style={{ borderRadius: '4px' }}>
        <div className="aspect-[2/3] overflow-hidden relative">
          <BookCover book={book} />
          <div
            className="absolute bottom-2 right-2 coord"
            style={{
              background: 'rgba(20,19,15,0.7)',
              color: 'var(--paper)',
              padding: '2px 6px',
              borderRadius: '2px',
              fontSize: '9px',
            }}
          >
            {book.year > 0 ? book.year : '고전'}
          </div>
        </div>
        <div className="p-3 space-y-0.5">
          <h3
            className="text-ink text-sm leading-snug line-clamp-2"
            style={{ fontFamily: 'var(--serif)', fontWeight: 500 }}
          >
            {book.title}
          </h3>
          {KOREAN_TITLES[String(book.id)] && (
            <p className="text-accent-ink text-xs font-medium leading-tight">{KOREAN_TITLES[String(book.id)]}</p>
          )}
          <p className="text-ink-4 text-xs">{book.author}</p>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [allBooks, setAllBooks] = useState<CatalogBook[]>([])
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedBook, setSelectedBook] = useState<CatalogBook | null>(null)

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

  const showingAll = !query && !genre

  return (
    <>
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-20" style={{ background: 'var(--accent-deep)', borderBottom: '1px solid var(--accent-ink)' }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-14 py-4 flex items-center justify-between gap-6">

          {/* 로고 + 좌표 */}
          <div className="shrink-0 flex items-center gap-4">
            <div>
              <span className="text-paper font-semibold text-base tracking-tight" style={{ fontFamily: 'var(--serif)' }}>
                Purplelica Books
              </span>
              <span className="hidden sm:block coord mt-0.5" style={{ color: 'var(--accent-soft)', opacity: 0.7 }}>
                51.51°N · 0.12°W — London
              </span>
            </div>
          </div>

          {/* 검색 */}
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="제목, 작가 검색..."
                className="w-full text-sm px-4 py-2 pr-9 outline-none transition-colors"
                style={{
                  background: 'rgba(250,250,247,0.1)',
                  border: '1px solid rgba(250,250,247,0.2)',
                  borderRadius: '4px',
                  color: 'var(--paper)',
                  fontFamily: 'var(--sans)',
                }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs transition-opacity opacity-60 hover:opacity-100"
                  style={{ color: 'var(--paper)' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 이번 주 추천 */}
          <Link href="/recommended" className="btn-ghost shrink-0 hidden sm:inline-flex" style={{ color: 'var(--paper)', borderColor: 'rgba(250,250,247,0.4)', height: '36px', padding: '0 16px', fontSize: '13px' }}>
            이번 주 추천
          </Link>
        </div>

        {/* 광고 */}
        <div className="h-[50px] flex items-center justify-center" style={{ borderTop: '1px solid rgba(250,250,247,0.08)' }}>
          <AdBanner slot="4978135753" width={320} height={50} />
        </div>
      </header>

      {/* ── 히어로 ── */}
      <section className="pt-12 pb-12" style={{ background: 'var(--accent-deep)' }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-14 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <p className="eyebrow mb-4" style={{ color: 'var(--accent-soft)', opacity: 0.6 }}>
              Classic Literature · 100 Works · Open Access
            </p>
            <h1
              className="text-paper mb-4"
              style={{
                fontFamily: 'var(--serif)',
                fontWeight: 400,
                fontSize: 'clamp(28px, 3.2vw, 46px)',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
              }}
            >
              영어 원서로 읽는<br />
              <em style={{ fontStyle: 'italic', color: 'var(--accent-soft)' }}>즐거움</em>을 발견하세요
            </h1>
            <p style={{ fontFamily: 'var(--sans)', fontSize: '14px', color: 'var(--accent-soft)', opacity: 0.6, lineHeight: 1.6 }}>
              단어 클릭 → AI 즉시 설명 &nbsp;·&nbsp; 한국어 번역 &nbsp;·&nbsp; 인물 관계도
            </p>
          </div>
          <p className="hidden sm:block coord shrink-0 pb-1" style={{ color: 'var(--accent-soft)', opacity: 0.35, fontSize: '11px' }}>
            51.51°N · 0.12°W<br />London, 1818
          </p>
        </div>
      </section>

      {/* ── 오늘의 좌표 (featured) ── */}
      {showingAll && !loading && featured && (
        <section className="py-12" style={{ background: 'var(--paper-2)' }}>
          <div className="max-w-7xl mx-auto px-6 sm:px-14">
            <p className="eyebrow mb-6">오늘의 좌표</p>
            <Link href={`/book/${featured.id}`}>
              <div
                className="book-card flex gap-8 items-center cursor-pointer p-6 sm:p-8"
                style={{ background: 'var(--paper)', border: '1px solid var(--paper-3)', borderRadius: '4px', maxWidth: '640px' }}
              >
                <div className="shrink-0 w-28 sm:w-36 aspect-[2/3] overflow-hidden" style={{ borderRadius: '4px' }}>
                  <BookCover book={featured} />
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <p className="eyebrow">추천 도서</p>
                  <h2
                    className="text-ink leading-snug"
                    style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 'clamp(20px, 3vw, 28px)' }}
                  >
                    {featured.title}
                  </h2>
                  {KOREAN_TITLES[String(featured.id)] && (
                    <p className="text-accent-ink text-sm font-medium">{KOREAN_TITLES[String(featured.id)]}</p>
                  )}
                  <p className="text-ink-3 text-sm">{featured.author}</p>
                  {featured.year > 0 && (
                    <p className="coord">{featured.year}</p>
                  )}
                  <span className="btn-primary inline-flex" style={{ height: '36px', padding: '0 18px', fontSize: '13px', marginTop: '8px' }}>
                    지금 읽기
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ── 책 그리드 ── */}
      <section className="flex-1 py-10" style={{ background: 'var(--paper)' }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-14">

          {/* 이번 주 추천 그리드 */}
          {showingAll && !loading && weekly.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-5">
                <p className="eyebrow">이번 주 추천</p>
                <Link href="/recommended" className="text-ink-3 text-xs uhover" style={{ fontFamily: 'var(--sans)' }}>
                  전체 보기
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {weekly.map((book) => (
                  <BookCard key={book.id} book={book} onClick={() => setSelectedBook(book)} />
                ))}
              </div>
              <div className="rule mt-12" />
            </div>
          )}

          {/* 장르 필터 */}
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <p className="eyebrow mr-2">장르</p>
            {GENRES.map((g) => (
              <button
                key={g.value}
                onClick={() => setGenre(genre === g.value ? '' : g.value)}
                className={`chip ${genre === g.value ? 'active' : 'soft'}`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* 결과 수 */}
          <div className="flex items-center justify-between mb-5">
            <h2
              className="text-ink text-lg"
              style={{ fontFamily: 'var(--serif)', fontWeight: 500 }}
            >
              {query || genre ? '검색 결과' : '전체 목록'}
            </h2>
            {!loading && (
              <span className="coord">{filtered.length}권</span>
            )}
          </div>

          {/* 책 그리드 */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="animate-pulse" style={{ borderRadius: '4px', overflow: 'hidden' }}>
                  <div className="aspect-[2/3]" style={{ background: 'var(--paper-3)' }} />
                  <div className="p-3 space-y-2" style={{ background: 'var(--paper-2)' }}>
                    <div className="h-3 rounded" style={{ background: 'var(--paper-3)' }} />
                    <div className="h-2 rounded w-2/3" style={{ background: 'var(--paper-3)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 text-ink-4">
              <p className="eyebrow mb-2">결과 없음</p>
              <p className="text-sm" style={{ fontFamily: 'var(--sans)' }}>검색 결과가 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filtered.map((book) => (
                <BookCard key={book.id} book={book} onClick={() => setSelectedBook(book)} />
              ))}
            </div>
          )}

          {/* 기능 소개 */}
          <div className="mt-16 pt-10 grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ borderTop: '1px solid var(--paper-3)' }}>
            {[
              { eyebrow: 'AI ASSIST', title: '단어 즉시 풀이', desc: '모르는 단어 드래그 → 발음·의미·예문 즉시 표시' },
              { eyebrow: 'TRANSLATION', title: '한국어 번역', desc: '기본값 한국어 · 영한 병렬 · 영어 전용 선택 가능' },
              { eyebrow: 'CHARACTER MAP', title: '인물 관계도', desc: 'AI가 등장인물과 관계를 자동으로 시각화' },
            ].map(({ eyebrow, title, desc }) => (
              <div
                key={title}
                className="p-6 space-y-3"
                style={{ background: 'var(--paper-2)', borderRadius: '4px' }}
              >
                <p className="eyebrow">{eyebrow}</p>
                <h3 className="text-ink text-base" style={{ fontFamily: 'var(--serif)', fontWeight: 500 }}>{title}</h3>
                <p className="text-ink-3 text-sm leading-relaxed" style={{ fontFamily: 'var(--sans)' }}>{desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 푸터 ── */}
      <footer className="py-8 text-center space-y-1" style={{ background: 'var(--accent-deep)', borderTop: '1px solid rgba(250,250,247,0.08)' }}>
        <p className="text-sm" style={{ color: 'var(--accent-soft)', opacity: 0.6, fontFamily: 'var(--sans)' }}>
          본 서비스는{' '}
          <a
            href="https://www.gutenberg.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
            style={{ color: 'var(--accent-soft)' }}
          >
            Project Gutenberg
          </a>
          에서 제공하는 저작권 만료 공개 도서를 활용합니다.
        </p>
        <p className="coord" style={{ opacity: 0.4 }}>
          Powered by Project Gutenberg · © 2026 Purplelica Books
        </p>
      </footer>

    </div>

    {selectedBook && (
      <BookDetailModal book={selectedBook} onClose={() => setSelectedBook(null)} />
    )}
    </>
  )
}
