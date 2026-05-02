'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import AdBanner from '@/components/AdBanner'
import { getBook, fetchBookText, getAuthorName, type GutenbergBook } from '@/lib/gutenberg'
import { getBookText, saveBookText, getTranslations, saveTranslations } from '@/lib/storage'

// ─── 타입 ────────────────────────────────────────────────────────────────────
type ViewMode = 'en' | 'split' | 'ko'
const VIEW_LABELS: Record<ViewMode, string> = { en: '영어', split: '영한', ko: '한국어' }

interface PageData {
  paragraphs: string[]
  chapterTitle: string | null   // 해당 챕터 제목 (없으면 null)
  isChapterStart: boolean       // 챕터 첫 페이지 여부
}

// ─── 상수 ────────────────────────────────────────────────────────────────────
const MAX_WORDS_PER_PAGE = 600

// ─── 챕터 제목 판별 ──────────────────────────────────────────────────────────
const CHAPTER_RE = /^(CHAPTER|Chapter|PART|Part|BOOK|Book|ACT|Act|SECTION|Section|PROLOGUE|Prologue|EPILOGUE|Epilogue|PREFACE|Preface|INTRODUCTION|Introduction|VOLUME|Volume)\b/

// ─── 구텐베르크 헤더/푸터 제거 ──────────────────────────────────────────────
function stripGutenbergWrapper(text: string): string {
  const startRe = /\*{3}\s*START OF [^\n]+\n/i
  const startMatch = text.match(startRe)
  let content = text
  if (startMatch?.index !== undefined) {
    content = text.slice(startMatch.index + startMatch[0].length)
  }
  const endRe = /\*{3}\s*END OF [^\n]+/i
  const endIdx = content.search(endRe)
  if (endIdx !== -1) content = content.slice(0, endIdx)
  return content
}

// ─── 단어 수 기준 서브페이지 분할 ────────────────────────────────────────────
function wordCountSplit(blocks: string[], chapterTitle: string | null): PageData[] {
  const pages: PageData[] = []
  let current: string[] = []
  let wordCount = 0
  let isFirst = true

  for (const block of blocks) {
    const words = block.split(/\s+/).length
    if (wordCount + words > MAX_WORDS_PER_PAGE && current.length > 0) {
      pages.push({ paragraphs: current, chapterTitle: isFirst ? chapterTitle : null, isChapterStart: isFirst })
      current = [block]
      wordCount = words
      isFirst = false
    } else {
      current.push(block)
      wordCount += words
    }
  }
  if (current.length > 0) {
    pages.push({ paragraphs: current, chapterTitle: isFirst ? chapterTitle : null, isChapterStart: isFirst })
  }
  return pages
}

// ─── 챕터 기반 페이지 분할 (메인 알고리즘) ──────────────────────────────────
function splitIntoChapterPages(text: string): PageData[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const stripped = stripGutenbergWrapper(normalized)

  const allBlocks = stripped
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter((p) => p.length > 0)

  // 챕터별로 그룹핑
  type Chapter = { title: string | null; blocks: string[] }
  const chapters: Chapter[] = []
  let current: Chapter = { title: null, blocks: [] }

  for (const block of allBlocks) {
    if (CHAPTER_RE.test(block.trim()) && block.length < 200) {
      if (current.blocks.length > 0 || current.title !== null) {
        chapters.push(current)
      }
      current = { title: block.trim(), blocks: [] }
    } else if (block.length > 20) {
      current.blocks.push(block)
    }
  }
  if (current.blocks.length > 0 || current.title !== null) {
    chapters.push(current)
  }

  // 챕터가 감지되지 않으면 단어 수 기준 분할로 폴백
  if (chapters.length === 0 || (chapters.length === 1 && chapters[0].title === null)) {
    return wordCountSplit(allBlocks.filter((b) => b.length > 20), null)
  }

  // 챕터가 있는 책: 첫 챕터 이전 메타데이터(제목/저자 등) 제거
  const pages: PageData[] = []
  for (const chapter of chapters) {
    if (chapter.blocks.length === 0) continue
    if (chapter.title === null) continue  // 챕터 이전 메타데이터 스킵
    pages.push(...wordCountSplit(chapter.blocks, chapter.title))
  }

  return pages
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────
export default function BookPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1'))

  const [book, setBook] = useState<GutenbergBook | null>(null)
  const [pages, setPages] = useState<PageData[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingStep, setLoadingStep] = useState<'meta' | 'text' | 'parse'>('meta')
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('ko')
  const [pageTranslations, setPageTranslations] = useState<string[]>([])
  const prevTailRef = useRef<string>('')

  const bookId = `gutenberg_${id}`
  const totalPages = pages.length
  const pageData = pages[currentPage - 1] ?? { paragraphs: [], chapterTitle: null, isChapterStart: false }
  const currentParagraphs = pageData.paragraphs
  const prevParagraphs = pages[currentPage - 2]?.paragraphs ?? []
  const progress = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0
  const isSplit = viewMode === 'split'
  const isKo = viewMode === 'ko'

  // 책 로드
  useEffect(() => {
    async function load() {
      try {
        setLoadingStep('meta')
        const bookData = await getBook(Number(id))
        setBook(bookData)

        const cached = getBookText(`gutenberg_${id}`)
        if (cached) {
          setLoadingStep('parse')
          setPages(splitIntoChapterPages(cached))
        } else {
          setLoadingStep('text')
          const text = await fetchBookText(bookData)
          saveBookText(`gutenberg_${id}`, text)
          setLoadingStep('parse')
          setPages(splitIntoChapterPages(text))
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '로드 실패')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // 이전 페이지 꼬리 저장
  useEffect(() => {
    prevTailRef.current = prevParagraphs.length > 0 ? prevParagraphs[prevParagraphs.length - 1] : ''
  }, [currentPage, prevParagraphs])

  // 번역 로드: 페이지 이동 시 항상 백그라운드 캐시 (viewMode 무관)
  useEffect(() => {
    if (currentParagraphs.length === 0) return
    const pgMatch = bookId.match(/gutenberg_(\d+)/)
    if (!pgMatch) return
    const pgId = pgMatch[1]
    const pageNum = currentPage

    const cached = getTranslations(bookId, pageNum)
    if (cached) { setPageTranslations(cached); return }

    fetch(`/translations/pg${pgId}/p${pageNum}.json`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (Array.isArray(d)) {
          const translations = d.map(String)
          saveTranslations(bookId, pageNum, translations)
          setPageTranslations(translations)
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pages])

  // viewMode 변경 시: 캐시된 번역 즉시 표시
  useEffect(() => {
    if (isSplit || isKo) {
      const cached = getTranslations(bookId, currentPage)
      if (cached) setPageTranslations(cached)
    } else {
      setPageTranslations([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode])

  const goToPage = useCallback((page: number) => {
    setPageTranslations([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
    router.push(`/book/${id}?page=${page}`)
    // 다음 페이지 미리 캐시
    if (pages[page]) {
      const nextPage = page + 1
      if (!getTranslations(bookId, nextPage)) {
        const pgMatch = bookId.match(/gutenberg_(\d+)/)
        if (pgMatch) {
          fetch(`/translations/pg${pgMatch[1]}/p${nextPage}.json`)
            .then((r) => r.ok ? r.json() : null)
            .then((d) => { if (Array.isArray(d)) saveTranslations(bookId, nextPage, d.map(String)) })
            .catch(() => {})
        }
      }
    }
  }, [id, router, pages, bookId])

  // ─── 로딩 / 에러 ─────────────────────────────────────────────────────────
  const LOADING_MESSAGES = {
    meta: { text: '책 정보 조회 중...', sub: null },
    text: { text: '본문 다운로드 중...', sub: '첫 방문 시 원문 텍스트를 가져옵니다 (약 3~10초)' },
    parse: { text: '페이지 분할 중...', sub: null },
  }

  if (loading) {
    const msg = LOADING_MESSAGES[loadingStep]
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-violet-600 text-sm font-medium">{msg.text}</p>
          {msg.sub && <p className="text-gray-400 text-xs max-w-xs">{msg.sub}</p>}
          <div className="flex gap-2 justify-center mt-2">
            {(['meta', 'text', 'parse'] as const).map((step) => (
              <div key={step} className={`h-1 w-8 rounded-full transition-colors ${step === loadingStep ? 'bg-violet-500' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center space-y-3">
        <p className="text-red-500">⚠️ {error}</p>
        <button onClick={() => router.back()} className="text-violet-600 text-sm hover:text-violet-800">← 돌아가기</button>
      </div>
    </div>
  )

  // ─── 렌더 ────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">

      {/* 광고 — 헤더 위에 배치 */}
      <div className="shrink-0 bg-[#0f0d1a] h-[50px] flex items-center justify-center border-b border-violet-900/20">
        <AdBanner slot="4978135753" width={320} height={50} />
      </div>

      {/* 헤더 */}
      <header className="shrink-0 z-20 bg-[#0f0d1a] border-b border-violet-900/40">

        {/* 1행: 홈 + 책 제목 + 페이지 */}
        <div className="flex items-center px-4 py-8 gap-4">
          {/* 홈 버튼 — 로고 포함 */}
          <button
            onClick={() => router.push('/')}
            className="flex flex-col items-center justify-center gap-1 shrink-0 group"
            style={{ minWidth: 72 }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-violet-400 group-hover:text-violet-200 transition-colors" style={{ fontSize: 22 }}>📚</span>
            </div>
            <div className="flex flex-col items-center leading-none">
              <span
                className="text-violet-200 group-hover:text-white transition-colors font-bold tracking-tight"
                style={{ fontSize: 13, fontFamily: 'Georgia, serif', letterSpacing: '0.01em' }}
              >
                Purplica
              </span>
              <span
                className="text-violet-400 group-hover:text-violet-200 transition-colors font-semibold"
                style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 1 }}
              >
                Books
              </span>
            </div>
          </button>

          {/* 구분선 */}
          <div className="w-px self-stretch bg-violet-900/60 shrink-0" />

          <div className="text-center min-w-0 flex-1">
            <div className="text-white text-sm font-semibold truncate leading-tight">{book?.title}</div>
            <div className="text-violet-400 text-xs mt-0.5">{book ? getAuthorName(book) : ''}</div>
          </div>

          <div className="text-right shrink-0 min-w-[52px]">
            <div className="text-white text-base font-bold">{currentPage}</div>
            <div className="text-violet-500 text-[11px]">/ {totalPages}</div>
          </div>
        </div>

        {/* 2행: 뷰 모드 선택 */}
        <div className="flex items-center gap-2 px-4 py-6 border-t border-violet-900/30">
          {(['en', 'split', 'ko'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                viewMode === mode
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/50'
                  : 'bg-violet-900/40 text-violet-400 hover:text-violet-200 hover:bg-violet-900/60'
              }`}
            >
              {VIEW_LABELS[mode]}
            </button>
          ))}
        </div>

        {/* 진행률 바 */}
        <div className="h-1 bg-violet-900/40">
          <div className="h-full bg-violet-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* 본문 */}
      <main className="flex-1 overflow-y-auto w-full px-4 sm:px-8 lg:px-16 py-6 sm:py-8 flex flex-col mx-auto max-w-7xl">

        {/* 챕터 제목 — 챕터 첫 페이지만 크게, 이후 페이지는 작은 배지로 */}
        {pageData.isChapterStart && pageData.chapterTitle ? (
          <div className="mb-10 pb-8 border-b-2 border-gray-100 text-center">
            <p className="text-[11px] text-violet-400 uppercase tracking-[0.2em] mb-3 font-semibold">
              — Chapter —
            </p>
            <h2
              className="text-2xl sm:text-3xl text-gray-900 leading-tight"
              style={{ fontFamily: 'Georgia, serif', fontWeight: 500 }}
            >
              {pageData.chapterTitle}
            </h2>
            <div className="mt-5 mx-auto w-16 h-px bg-gray-300" />
          </div>
        ) : pages[currentPage - 2]?.chapterTitle !== null && !pageData.isChapterStart && (
          /* 챕터 속 2번째+ 페이지: 작은 배지로 현재 챕터 표시 */
          (() => {
            // 현재 속한 챕터 제목 찾기 (앞으로 거슬러 올라가서)
            let chTitle: string | null = null
            for (let i = currentPage - 1; i >= 0; i--) {
              if (pages[i]?.isChapterStart && pages[i].chapterTitle) {
                chTitle = pages[i].chapterTitle
                break
              }
            }
            return chTitle ? (
              <div className="mb-6 flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-[11px] text-violet-400 font-medium px-3 py-1 bg-violet-50 rounded-full border border-violet-100">
                  {chTitle}
                </span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
            ) : null
          })()
        )}

        {/* 이전 페이지 꼬리 맥락 (영어 포함 모드) */}
        {currentPage > 1 && prevTailRef.current && !isKo && (
          <div className="mb-6 pb-5 border-b border-gray-100">
            <div className="text-[11px] text-gray-400 mb-2 uppercase tracking-wider">← 이전 페이지에서 이어짐</div>
            <p className="text-gray-400 text-sm leading-7 font-serif line-clamp-2">{prevTailRef.current}</p>
          </div>
        )}

        {/* 본문 텍스트 */}
        {isSplit ? (
          /* 영한 분할 — 항상 좌우 2컬럼 */
          <div className="flex-1 flex flex-row gap-4 sm:gap-8 lg:gap-12">
            {/* 영어 */}
            <div className="flex-1 space-y-4 border-r border-gray-100 pr-4 sm:pr-8 lg:pr-12">
              <div className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">English</div>
              {currentParagraphs.map((para, idx) => (
                <p key={idx} className="text-gray-900 leading-[1.85] font-serif" style={{ fontSize: 'clamp(12px, 1.8vw, 16px)' }}>{para}</p>
              ))}
            </div>
            {/* 한국어 */}
            <div className="flex-1 space-y-4">
              <div className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">한국어</div>
              {pageTranslations.length === 0 || pageTranslations.every((t) => !t.trim()) ? (
                <p className="text-gray-400 text-xs italic">번역 준비 중</p>
              ) : (
                currentParagraphs.map((_, idx) => (
                  <p key={idx} className="text-gray-800 leading-[1.85]" style={{ fontSize: 'clamp(12px, 1.8vw, 16px)' }}>
                    {pageTranslations[idx] ?? ''}
                  </p>
                ))
              )}
            </div>
          </div>
        ) : isKo ? (
          /* 한국어 전용 — CSS columns: 모바일 1컬럼 / 데스크탑 2컬럼 자동 흐름 */
          pageTranslations.length === 0 || pageTranslations.every((t) => !t.trim()) ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">번역 불러오는 중...</p>
            </div>
          ) : (
            <div className="flex-1 w-full" style={{
              columns: 'var(--cols, 1)',
              columnGap: '3rem',
              columnRule: '1px solid #f3f4f6',
            }}>
              <style>{`@media (min-width: 1024px) { :root { --cols: 2; } }`}</style>
              {currentParagraphs.map((_, idx) => (
                <p key={idx}
                   className="text-gray-900 leading-[1.95] mb-5 break-inside-avoid"
                   style={{ fontSize: 'clamp(14px, 1.2vw, 18px)' }}>
                  {pageTranslations[idx] ?? ''}
                </p>
              ))}
            </div>
          )
        ) : (
          /* 영어 전용 — CSS columns: 모바일 1컬럼 / 데스크탑 2컬럼 자동 흐름 */
          <div className="flex-1 w-full font-serif text-gray-900" style={{
            columns: 'var(--cols, 1)',
            columnGap: '3rem',
            columnRule: '1px solid #f3f4f6',
            lineHeight: '1.95',
            fontSize: 'clamp(14px, 1.2vw, 18px)',
          }}>
            <style>{`@media (min-width: 1024px) { :root { --cols: 2; } }`}</style>
            {currentParagraphs.map((para, idx) => (
              <p key={idx} className="mb-5 break-inside-avoid">{para}</p>
            ))}
          </div>
        )}

      </main>

      {/* 하단 네비게이션 */}
      <nav className="shrink-0 border-t border-gray-200 bg-white">
        <div className="flex items-stretch divide-x divide-gray-200">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex-1 flex flex-col items-center justify-center py-6 gap-1.5 text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          >
            <span className="text-3xl leading-none font-light">←</span>
            <span className="text-sm font-semibold">이전</span>
          </button>

          <div className="flex flex-col items-center justify-center px-4 py-4 gap-1.5 min-w-[100px]">
            <div className="text-gray-900 text-base font-bold tracking-wide">{currentPage} / {totalPages}</div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-violet-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex-1 flex flex-col items-center justify-center py-6 gap-1.5 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          >
            <span className="text-3xl leading-none font-light">→</span>
            <span className="text-sm font-semibold">다음</span>
          </button>
        </div>
      </nav>

    </div>
  )
}
