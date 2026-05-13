'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { getBook, fetchBookText, getAuthorName, type GutenbergBook } from '@/lib/gutenberg'
import { getBookText, saveBookText, getTranslations, saveTranslations } from '@/lib/storage'
import { getBookmark, saveBookmark, getReaderTheme, saveReaderTheme, THEME_STYLES, type ReaderTheme } from '@/lib/reading-state'

// ─── 타입 ────────────────────────────────────────────────────────────────────
type ViewMode = 'en' | 'split' | 'ko'
const VIEW_LABELS: Record<ViewMode, string> = { en: '영어', split: '영한', ko: '한국어' }

interface PageData {
  paragraphs: string[]
  chapterTitle: string | null
  isChapterStart: boolean
}

// ─── 상수 ────────────────────────────────────────────────────────────────────
const MAX_WORDS_PER_PAGE = 600

// ─── 챕터 제목 판별 ──────────────────────────────────────────────────────────
const CHAPTER_RE = /^(CHAPTER|Chapter|PART|Part|BOOK|Book|ACT|Act|SECTION|Section|PROLOGUE|Prologue|EPILOGUE|Epilogue|PREFACE|Preface|INTRODUCTION|Introduction|VOLUME|Volume)\b/
const ALL_CAPS_TITLE_RE = /^[A-Z][A-Z\s''',.:;!?\-—]+$/

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

// ─── 챕터 기반 페이지 분할 ──────────────────────────────────────────────
function splitIntoChapterPages(text: string): PageData[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const stripped = stripGutenbergWrapper(normalized)

  const allBlocks = stripped
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter((p) => p.length > 0)

  type Chapter = { title: string | null; blocks: string[] }
  const chapters: Chapter[] = []
  let current: Chapter = { title: null, blocks: [] }

  // 1차: CHAPTER_RE로만 챕터 감지
  for (const block of allBlocks) {
    const trimmed = block.trim()
    if (CHAPTER_RE.test(trimmed) && block.length < 200) {
      if (current.blocks.length > 0 || current.title !== null) {
        chapters.push(current)
      }
      current = { title: trimmed, blocks: [] }
    } else if (block.length > 20) {
      current.blocks.push(block)
    }
  }
  if (current.blocks.length > 0 || current.title !== null) {
    chapters.push(current)
  }

  // 2차: CHAPTER_RE가 부족하면 (< 5개) ALL_CAPS 제목도 감지 (시집 등)
  const chapterReCount = chapters.filter((c) => c.title !== null).length
  if (chapterReCount < 5) {
    const chapters2: Chapter[] = []
    current = { title: null, blocks: [] }
    for (const block of allBlocks) {
      const trimmed = block.trim()
      const isChapterTitle = CHAPTER_RE.test(trimmed) && block.length < 200
      const isAllCapsTitle = ALL_CAPS_TITLE_RE.test(trimmed) && trimmed.length >= 3 && trimmed.length < 80
      if (isChapterTitle || isAllCapsTitle) {
        if (current.blocks.length > 0 || current.title !== null) {
          chapters2.push(current)
        }
        current = { title: trimmed, blocks: [] }
      } else if (block.length > 20) {
        current.blocks.push(block)
      }
    }
    if (current.blocks.length > 0 || current.title !== null) {
      chapters2.push(current)
    }
    if (chapters2.filter((c) => c.title !== null).length > chapterReCount) {
      chapters.length = 0
      chapters.push(...chapters2)
    }
  }

  if (chapters.length === 0 || (chapters.length === 1 && chapters[0].title === null)) {
    return wordCountSplit(allBlocks.filter((b) => b.length > 20), null)
  }

  // 시집 모드 감지: 챕터 평균 단어 수가 300 이하면 시집 → 제목 전용 페이지 사용
  const validChapters = chapters.filter((c) => c.title !== null && c.blocks.length > 0)
  const totalWords = validChapters.reduce((sum, c) => sum + c.blocks.reduce((s, b) => s + b.split(/\s+/).length, 0), 0)
  const avgWordsPerChapter = validChapters.length > 0 ? totalWords / validChapters.length : Infinity
  const isPoetryMode = avgWordsPerChapter < 300 && validChapters.length > 5

  const pages: PageData[] = []
  for (const chapter of chapters) {
    if (chapter.title === null) continue
    if (chapter.blocks.length === 0) continue
    if (isPoetryMode) {
      // 시집: 제목 전용 페이지 + 본문 페이지
      pages.push({ paragraphs: [], chapterTitle: chapter.title, isChapterStart: true })
      pages.push(...wordCountSplit(chapter.blocks, null))
    } else {
      // 소설: 기존 방식 (제목 + 본문 같은 페이지)
      pages.push(...wordCountSplit(chapter.blocks, chapter.title))
    }
  }

  return pages
}

// ─── 희곡/대본 텍스트 포맷팅 ─────────────────────────────────────────────────
// _[지문]_ 패턴 → 이탤릭 + 작은 글씨 + muted 색상
// 화자명. 패턴 (문단 시작) → 볼드 처리
function formatDramaText(
  text: string,
  style: { text: string; muted: string },
): React.ReactNode {
  // 1) _[...]_ 지문 패턴 분리
  const stageDirectionRe = /_\[([^\]]*)\]_/g
  const parts: React.ReactNode[] = []
  let lastIdx = 0
  let match: RegExpExecArray | null

  while ((match = stageDirectionRe.exec(text)) !== null) {
    // 지문 앞 텍스트
    if (match.index > lastIdx) {
      parts.push(formatSpeaker(text.slice(lastIdx, match.index), style, parts.length === 0))
    }
    // 지문 자체
    parts.push(
      <span
        key={`sd-${match.index}`}
        style={{
          fontStyle: 'italic',
          fontSize: '0.88em',
          color: style.muted,
          opacity: 0.85,
        }}
      >
        [{match[1]}]
      </span>
    )
    lastIdx = match.index + match[0].length
  }

  // 나머지 텍스트
  if (lastIdx < text.length) {
    parts.push(formatSpeaker(text.slice(lastIdx), style, parts.length === 0))
  }

  return parts.length > 0 ? parts : text
}

// 화자명. 패턴 (문단 시작 부분만)
function formatSpeaker(
  text: string,
  style: { text: string; muted: string },
  isStart: boolean,
): React.ReactNode {
  if (!isStart || !text.trim()) return text

  // 한글 화자: "노라." / "헬메르." / 영문: "NORA." / "Nora."
  const speakerRe = /^(\s*)([\p{L}\p{M}]{1,20})\.\s/u
  const m = text.match(speakerRe)
  if (m) {
    return (
      <>
        {m[1]}
        <span style={{ fontWeight: 700, color: style.text }}>{m[2]}.</span>
        {' '}
        {text.slice(m[0].length)}
      </>
    )
  }
  return text
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
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md')
  const [theme, setTheme] = useState<ReaderTheme>('light')

  const [pageTranslations, setPageTranslations] = useState<string[]>([])
  const prevTailRef = useRef<string>('')
  const mainRef = useRef<HTMLElement>(null)

  // 터치 스와이프
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const bookId = `gutenberg_${id}`
  const totalPages = pages.length
  const pageData = pages[currentPage - 1] ?? { paragraphs: [], chapterTitle: null, isChapterStart: false }
  const currentParagraphs = pageData.paragraphs
  const prevParagraphs = pages[currentPage - 2]?.paragraphs ?? []
  const progress = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0
  const isSplit = viewMode === 'split'
  const isKo = viewMode === 'ko'

  const themeStyle = THEME_STYLES[theme]

  // 테마 초기화
  useEffect(() => {
    setTheme(getReaderTheme())
  }, [])

  // 북마크 자동 저장 (페이지 이동 시)
  useEffect(() => {
    if (totalPages > 0 && currentPage > 0) {
      saveBookmark(id, currentPage)
    }
  }, [id, currentPage, totalPages])

  // 북마크에서 복원 (첫 로드 시 page 파라미터 없으면)
  useEffect(() => {
    if (!searchParams.get('page') && pages.length > 0) {
      const bm = getBookmark(id)
      if (bm && bm.page > 1 && bm.page <= pages.length) {
        router.replace(`/book/${id}?page=${bm.page}`)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length])

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

  // 번역 로드
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

  // viewMode 변경 시
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
    if (mainRef.current) mainRef.current.scrollTop = 0
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

  // 키보드 네비게이션
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && currentPage > 1) goToPage(currentPage - 1)
      if (e.key === 'ArrowRight' && currentPage < totalPages) goToPage(currentPage + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentPage, totalPages, goToPage])

  // 터치 스와이프 핸들러
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    // 수평 스와이프만 (수직보다 수평 이동이 클 때)
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0 && currentPage > 1) goToPage(currentPage - 1)
      if (dx < 0 && currentPage < totalPages) goToPage(currentPage + 1)
    }
  }

  // ─── 로딩 / 에러 ─────────────────────────────────────────────────────────
  const LOADING_MESSAGES = {
    meta: { text: '책 정보 조회 중...', sub: null },
    text: { text: '본문 다운로드 중...', sub: '첫 방문 시 원문 텍스트를 가져옵니다 (약 3~10초)' },
    parse: { text: '페이지 분할 중...', sub: null },
  }

  if (loading) {
    const msg = LOADING_MESSAGES[loadingStep]
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF8' }}>
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#4A4A4A] text-sm font-medium">{msg.text}</p>
          {msg.sub && <p className="text-[#B0B0B0] text-xs max-w-xs">{msg.sub}</p>}
          <div className="flex gap-2 justify-center mt-2">
            {(['meta', 'text', 'parse'] as const).map((step) => (
              <div key={step} className={`h-1 w-8 rounded-full transition-colors ${step === loadingStep ? 'bg-[#1A1A1A]' : 'bg-[#E8E8E6]'}`} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF8' }}>
      <div className="text-center space-y-3">
        <p className="text-red-500 text-sm">{error}</p>
        <button onClick={() => router.back()} className="text-[#8C8C8C] text-sm hover:text-[#1A1A1A] transition-colors">← 돌아가기</button>
      </div>
    </div>
  )

  // 현재 챕터 제목 찾기
  let currentChapterTitle: string | null = null
  for (let i = currentPage - 1; i >= 0; i--) {
    if (pages[i]?.isChapterStart && pages[i].chapterTitle) {
      currentChapterTitle = pages[i].chapterTitle
      break
    }
  }

  // ─── 렌더 ────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100dvh-92px)] flex flex-col overflow-hidden" style={{ background: themeStyle.bg, color: themeStyle.text, transition: 'background 0.3s, color 0.3s' }}>

      {/* ── 적응형 스타일 ── */}
      <style>{`
        /* 본문 컨테이너 — 화면 크기에 따라 최적 폭 */
        .reader-body {
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          padding: 1.25rem 1rem;
        }
        @media (min-width: 640px) {
          .reader-body { max-width: 680px; padding: 1.5rem 2rem; }
        }
        @media (min-width: 1024px) {
          .reader-body { max-width: 760px; padding: 2rem 2.5rem; }
        }
        @media (min-width: 1440px) {
          .reader-body { max-width: 820px; padding: 2.5rem 3rem; }
        }
        /* split 모드일 때 더 넓게 */
        .reader-body.split-mode {
          max-width: 100%;
        }
        @media (min-width: 640px) {
          .reader-body.split-mode { max-width: 900px; }
        }
        @media (min-width: 1024px) {
          .reader-body.split-mode { max-width: 1100px; }
        }
        @media (min-width: 1440px) {
          .reader-body.split-mode { max-width: 1200px; }
        }

        /* 영한 분할 레이아웃 */
        .split-container { display: flex; flex-direction: column; gap: 1.5rem; }
        @media (min-width: 640px) { .split-container { flex-direction: row; gap: 2rem; } }
        @media (min-width: 1024px) { .split-container { gap: 3rem; } }
        .split-col { flex: 1; min-width: 0; }
        @media (min-width: 640px) {
          .split-col-en { border-right: 1px solid #F0F0EE; padding-right: 1.5rem; }
        }
        @media (min-width: 1024px) {
          .split-col-en { padding-right: 2.5rem; }
        }

        /* 자동 2컬럼: 와이드 가로 화면 */
        .reader-cols-auto { columns: 1; column-gap: 3rem; column-rule: 1px solid #F0F0EE; }
        @media (min-width: 1024px) and (min-aspect-ratio: 4/3) { .reader-cols-auto { columns: 2; } }

        /* 폰트 컨트롤만 모바일에서 숨김 */
        .font-controls { display: none; }
        @media (min-width: 768px) {
          .font-controls { display: flex !important; }
        }

        /* 적응형 폰트 크기 */
        .reader-text-sm { font-size: clamp(14px, 2.8vw, 15px); }
        .reader-text-md { font-size: clamp(15px, 3vw, 18px); }
        .reader-text-lg { font-size: clamp(17px, 3.5vw, 22px); }
        @media (min-width: 640px) {
          .reader-text-sm { font-size: 15px; }
          .reader-text-md { font-size: 17px; }
          .reader-text-lg { font-size: 20px; }
        }
        @media (min-width: 1024px) {
          .reader-text-sm { font-size: 15px; }
          .reader-text-md { font-size: 18px; }
          .reader-text-lg { font-size: 22px; }
        }
        .split-text-sm { font-size: clamp(13px, 2.5vw, 14px); }
        .split-text-md { font-size: clamp(14px, 2.8vw, 16px); }
        .split-text-lg { font-size: clamp(15px, 3vw, 19px); }
        @media (min-width: 640px) {
          .split-text-sm { font-size: 14px; }
          .split-text-md { font-size: 16px; }
          .split-text-lg { font-size: 18px; }
        }

        /* 하단 내비 적응형 */
        .bottom-nav-btn { padding: 0.75rem 0; }
        @media (min-width: 640px) { .bottom-nav-btn { padding: 0.875rem 0; } }
        @media (max-width: 380px) {
          .bottom-nav-center { min-width: 90px !important; padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
        }
      `}</style>

      {/* ── 헤더 ── */}
      <header className="shrink-0 z-20" style={{ background: themeStyle.headerBg, transition: 'background 0.3s' }}>
        {/* 1행: 홈 + 뷰모드 + 폰트(데스크톱) + 페이지 */}
        <div className="flex items-center px-3 sm:px-5 py-2.5 gap-2 sm:gap-3">

          {/* 홈 버튼 — 큼지막하게 */}
          <button
            onClick={() => router.push('/')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all group"
          >
            <svg className="w-5 h-5 text-white group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-white text-[13px] font-semibold tracking-tight hidden sm:inline" style={{ fontFamily: 'var(--font-serif)' }}>Purplelica</span>
          </button>

          {/* 책 제목 (데스크톱만) */}
          <div className="min-w-0 flex-1 hidden sm:block">
            <div className="text-white text-xs font-semibold truncate leading-tight">{book?.title}</div>
            <div className="text-[#8C8C8C] text-[10px] truncate">{book ? getAuthorName(book) : ''}</div>
          </div>

          {/* 뷰 모드 — 항상 표시, 눈에 잘 보이게 */}
          <div className="flex gap-1 sm:gap-1.5">
            {(['en', 'split', 'ko'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3.5 sm:px-4 py-2 rounded-xl font-bold text-[13px] sm:text-sm transition-all ${
                  viewMode === mode
                    ? 'bg-white text-[#1A1A1A] shadow-sm'
                    : 'text-[#8C8C8C] hover:text-white hover:bg-white/10'
                }`}
              >
                {VIEW_LABELS[mode]}
              </button>
            ))}
          </div>

          {/* 폰트 크기 (데스크톱만) */}
          <div className="font-controls items-center gap-1 shrink-0">
            <button
              onClick={() => setFontSize((s) => s === 'lg' ? 'md' : 'sm')}
              disabled={fontSize === 'sm'}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-[#8C8C8C] hover:text-white hover:bg-white/15 disabled:opacity-30 transition-all text-xs font-bold"
            >A-</button>
            <button
              onClick={() => setFontSize((s) => s === 'sm' ? 'md' : 'lg')}
              disabled={fontSize === 'lg'}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-[#8C8C8C] hover:text-white hover:bg-white/15 disabled:opacity-30 transition-all text-sm font-bold"
            >A+</button>
          </div>

          {/* 테마 전환 */}
          <button
            onClick={() => {
              const next: ReaderTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'sepia' : 'light'
              setTheme(next)
              saveReaderTheme(next)
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-[#8C8C8C] hover:text-white hover:bg-white/15 transition-all shrink-0"
            title={theme === 'light' ? '야간모드' : theme === 'dark' ? '세피아' : '주간모드'}
          >
            {theme === 'light' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            ) : theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 12 3z" /></svg>
            )}
          </button>

          {/* 페이지 */}
          <div className="text-right shrink-0 min-w-[36px]">
            <div className="text-white text-sm font-bold leading-none" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>{currentPage}</div>
            <div className="text-[#8C8C8C] text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>/ {totalPages}</div>
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="h-0.5 bg-white/10">
          <div className="h-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* ── 본문 ── */}
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className={`reader-body flex flex-col ${isSplit ? 'split-mode' : ''}`}>

          {/* 챕터 제목 — 전용 타이틀 페이지: 세로 중앙 / 이후: 작은 배지 */}
          {pageData.isChapterStart && pageData.chapterTitle ? (
            <div className={`text-center ${pageData.paragraphs.length === 0 ? 'flex-1 flex flex-col items-center justify-center' : 'mb-8 sm:mb-10 pb-6 sm:pb-8'}`} style={pageData.paragraphs.length > 0 ? { borderBottom: `2px solid ${themeStyle.border}` } : undefined}>
              <p className="text-[11px] uppercase tracking-[0.2em] mb-3 font-semibold" style={{ color: themeStyle.muted }}>
                — Chapter —
              </p>
              <h2
                className="text-2xl sm:text-4xl lg:text-5xl leading-tight"
                style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: themeStyle.text, letterSpacing: '-0.02em' }}
              >
                {pageData.chapterTitle}
              </h2>
              <div className="mt-4 sm:mt-5 mx-auto w-12 sm:w-16 h-px" style={{ background: themeStyle.border }} />
            </div>
          ) : currentChapterTitle && !pageData.isChapterStart && (
            <div className="mb-5 sm:mb-6 flex items-center gap-2">
              <div className="h-px flex-1 bg-[#F0F0EE]" />
              <span className="text-[11px] text-[#B0B0B0] font-medium px-3 py-1 bg-[#F5F5F3] rounded-full border border-[#E8E8E6]">
                {currentChapterTitle}
              </span>
              <div className="h-px flex-1 bg-[#F0F0EE]" />
            </div>
          )}

          {/* 이전 페이지 꼬리 맥락 */}
          {currentPage > 1 && prevTailRef.current && !isKo && (
            <div className="mb-5 sm:mb-6 pb-4 sm:pb-5" style={{ borderBottom: '1px solid #F0F0EE' }}>
              <div className="text-[11px] text-[#B0B0B0] mb-2 uppercase tracking-wider">← 이전 페이지에서 이어짐</div>
              <p className="text-[#B0B0B0] text-sm leading-7 font-serif line-clamp-2">{prevTailRef.current}</p>
            </div>
          )}

          {/* 본문 텍스트 */}
          {isSplit ? (
            /* ── 영한 분할 ── */
            <div className="flex-1 split-container">
              <div className="split-col split-col-en space-y-4">
                <div className="text-[10px] text-[#B0B0B0] uppercase tracking-widest font-medium">English</div>
                {currentParagraphs.map((para, idx) => (
                  <p key={idx} className={`leading-[1.85] font-serif split-text-${fontSize}`} style={{ color: themeStyle.text }}>{formatDramaText(para, themeStyle)}</p>
                ))}
              </div>
              <div className="split-col space-y-4">
                <div className="text-[10px] text-[#B0B0B0] uppercase tracking-widest font-medium">한국어</div>
                {pageTranslations.length === 0 || pageTranslations.every((t) => !t.trim()) ? (
                  <p className="text-[#B0B0B0] text-xs italic">번역 준비 중</p>
                ) : (
                  currentParagraphs.map((_, idx) => (
                    <p key={idx} className={`text-[#4A4A4A] leading-[1.85] split-text-${fontSize}`} style={{ letterSpacing: '-0.03em' }}>
                      {formatDramaText(pageTranslations[idx] ?? '', themeStyle)}
                    </p>
                  ))
                )}
              </div>
            </div>
          ) : isKo ? (
            /* ── 한국어 전용 ── */
            pageTranslations.length === 0 || pageTranslations.every((t) => !t.trim()) ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-6 h-6 border-2 border-[#E8E8E6] border-t-[#1A1A1A] rounded-full animate-spin" />
                <p className="text-[#B0B0B0] text-sm">번역 불러오는 중...</p>
              </div>
            ) : (
              <div className="flex-1 w-full reader-cols-auto">
                {currentParagraphs.map((_, idx) => (
                  <p key={idx}
                     className={`leading-[1.95] mb-5 sm:mb-6 break-inside-avoid reader-text-${fontSize}`}
                     style={{ letterSpacing: '-0.03em', color: themeStyle.text }}>
                    {formatDramaText(pageTranslations[idx] ?? '', themeStyle)}
                  </p>
                ))}
              </div>
            )
          ) : (
            /* ── 영어 전용 ── */
            <div className={`flex-1 w-full font-serif reader-cols-auto reader-text-${fontSize}`} style={{ lineHeight: '1.95', color: themeStyle.text }}>
              {currentParagraphs.map((para, idx) => (
                <p key={idx} className="mb-5 sm:mb-6 break-inside-avoid">{formatDramaText(para, themeStyle)}</p>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── 하단 네비게이션 ── */}
      <nav className="shrink-0" style={{ background: themeStyle.bg, borderTop: `1px solid ${themeStyle.border}`, transition: 'background 0.3s' }}>
        <div className="flex items-stretch">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex-1 flex items-center justify-center gap-1.5 bottom-nav-btn disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            style={{ borderRight: `1px solid ${themeStyle.border}`, color: themeStyle.text }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
            <span className="text-sm font-semibold hidden sm:inline">이전</span>
          </button>

          <div className="bottom-nav-center flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 min-w-[110px]" style={{ borderRight: `1px solid ${themeStyle.border}` }}>
            <div className="text-[13px] sm:text-sm font-bold whitespace-nowrap" style={{ color: themeStyle.text }}>{currentPage} / {totalPages}</div>
            <div className="w-12 sm:w-16 rounded-full h-1 hidden sm:block" style={{ background: themeStyle.border }}>
              <div className="h-1 rounded-full transition-all" style={{ width: `${progress}%`, background: themeStyle.text }} />
            </div>
          </div>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex-1 flex items-center justify-center gap-1.5 bottom-nav-btn disabled:opacity-25 disabled:cursor-not-allowed transition-colors hover:opacity-90"
            style={{ background: themeStyle.headerBg, color: themeStyle.headerText }}
          >
            <span className="text-sm font-semibold hidden sm:inline">다음</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </nav>

    </div>
  )
}
