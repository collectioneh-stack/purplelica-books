'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import WordPopup from '@/components/WordPopup'
import AdBanner from '@/components/AdBanner'
import { getBook, fetchBookText, getAuthorName, type GutenbergBook } from '@/lib/gutenberg'
import { getAnalysis, saveAnalysis, getBookText, saveBookText, getTranslations, saveTranslations } from '@/lib/storage'
import type { BookAnalysis, Character } from '@/lib/types'

const CharacterGraph = dynamic(() => import('@/components/CharacterGraph'), { ssr: false })
const CharacterPanel = dynamic(() => import('@/components/CharacterPanel'), { ssr: false })

const WORDS_PER_PAGE = 1200  // ~5분 분량 (영어 250wpm 기준)

type ViewMode = 'en' | 'split' | 'ko'

interface WordData {
  word: string
  pronunciation: string
  meaning: string
  example: string
  example_ko: string
}

interface WordPopupState {
  word: string
  sentence: string
  position: { x: number; y: number }
}

// ─── 구텐베르크 헤더/푸터 제거 ──────────────────────────────────────────
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

// ─── 챕터 제목 판별 ──────────────────────────────────────────────────────
const CHAPTER_RE = /^(CHAPTER|Chapter|PART|Part|BOOK|Book|ACT|Act|SECTION|Section|PROLOGUE|Prologue|EPILOGUE|Epilogue|PREFACE|Preface|INTRODUCTION|Introduction|VOLUME|Volume)\b/

function isChapterTitle(text: string): boolean {
  return CHAPTER_RE.test(text.trim())
}

// ─── 페이지별 챕터 제목 추출 ─────────────────────────────────────────────
function buildChapterMap(rawText: string, pages: string[][]): Map<number, string> {
  const map = new Map<number, string>()
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const stripped = stripGutenbergWrapper(normalized)
  const allBlocks = stripped
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter((p) => p.length > 0)

  const pageSizes = pages.map((p) => p.length)
  let paraIdx = 0
  let pendingChapter = ''

  for (const block of allBlocks) {
    if (isChapterTitle(block)) {
      pendingChapter = block
    } else if (block.length > 30) {
      if (pendingChapter) {
        let cum = 0
        for (let i = 0; i < pageSizes.length; i++) {
          if (paraIdx >= cum && paraIdx < cum + pageSizes[i]) {
            if (!map.has(i + 1)) map.set(i + 1, pendingChapter)
            break
          }
          cum += pageSizes[i]
        }
        pendingChapter = ''
      }
      paraIdx++
    }
  }
  return map
}

// ─── 페이지 분할 (구텐베르크 헤더 제거 후) ────────────────────────────────
function splitIntoPages(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const stripped = stripGutenbergWrapper(normalized)
  const paragraphs = stripped
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter((p) => p.length > 30)

  const pages: string[][] = []
  let current: string[] = []
  let wordCount = 0

  for (const para of paragraphs) {
    const words = para.split(/\s+/).length
    if (wordCount + words > WORDS_PER_PAGE && current.length > 0) {
      pages.push(current)
      current = [para]
      wordCount = words
    } else {
      current.push(para)
      wordCount += words
    }
  }
  if (current.length > 0) pages.push(current)
  return pages
}

function getSelectedWord(): { word: string; sentence: string; position: { x: number; y: number } } | null {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) return null
  const word = selection.toString().trim()
  if (!word || word.includes(' ') || word.length > 30) return null
  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()
  const sentence = selection.anchorNode?.parentElement?.textContent ?? ''
  return { word, sentence, position: { x: rect.left + rect.width / 2, y: rect.bottom } }
}

const VIEW_LABELS: Record<ViewMode, string> = { en: '영어', split: '영한', ko: '한국어' }

export default function BookPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1'))

  const [book, setBook] = useState<GutenbergBook | null>(null)
  const [pages, setPages] = useState<string[][]>([])
  const [loading, setLoading] = useState(true)
  const [loadingStep, setLoadingStep] = useState<'meta' | 'text' | 'parse'>('meta')
  const [error, setError] = useState<string | null>(null)
  // 뷰 모드 (기본값: 영한 분할 — 영어는 항상 보이게)
  const [viewMode, setViewMode] = useState<ViewMode>('split')

  // 챕터 맵 (페이지번호 → 챕터 제목)
  const [chapterMap, setChapterMap] = useState<Map<number, string>>(new Map())

  // 번역 (split/ko 모드에서 전체 페이지 번역)
  const [pageTranslations, setPageTranslations] = useState<string[]>([])
  const [translating, setTranslating] = useState(false)

  // 단어 팝업
  const [wordPopup, setWordPopup] = useState<WordPopupState | null>(null)
  const [wordData, setWordData] = useState<WordData | null>(null)
  const [wordLoading, setWordLoading] = useState(false)

  // 인물 관계도
  const [showGraph, setShowGraph] = useState(false)
  const [analysis, setAnalysis] = useState<BookAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedChar, setSelectedChar] = useState<Character | null>(null)

  // 이전 페이지 마지막 문단 (연결 맥락)
  const prevTailRef = useRef<string>('')

  const bookId = `gutenberg_${id}`
  const totalPages = pages.length
  const currentParagraphs = pages[currentPage - 1] ?? []
  const prevParagraphs = pages[currentPage - 2] ?? []

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
          const pagesData = splitIntoPages(cached)
          setPages(pagesData)
          setChapterMap(buildChapterMap(cached, pagesData))
        } else {
          setLoadingStep('text')
          const text = await fetchBookText(bookData)
          saveBookText(`gutenberg_${id}`, text)
          setLoadingStep('parse')
          const pagesData = splitIntoPages(text)
          setPages(pagesData)
          setChapterMap(buildChapterMap(text, pagesData))
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '로드 실패')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // 페이지 변경 시 이전 페이지 꼬리 저장
  useEffect(() => {
    if (prevParagraphs.length > 0) {
      prevTailRef.current = prevParagraphs[prevParagraphs.length - 1]
    } else {
      prevTailRef.current = ''
    }
  }, [currentPage, prevParagraphs])

  // 뷰모드 변경 또는 페이지 변경 시 번역 실행
  useEffect(() => {
    if ((viewMode === 'split' || viewMode === 'ko') && currentParagraphs.length > 0) {
      translatePage(currentParagraphs, currentPage)
    } else {
      setPageTranslations([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, currentPage, pages])

  async function translatePage(paragraphs: string[], page: number) {
    // 캐시 확인
    const cached = getTranslations(bookId, page)
    if (cached) { setPageTranslations(cached); return }

    setTranslating(true)
    try {
      // 1차: CDN 정적 사전번역 파일 직접 fetch (서버리스 readFileSync 대신)
      const pgMatch = bookId.match(/gutenberg_(\d+)/)
      if (pgMatch) {
        try {
          const preRes = await fetch(`/translations/pg${pgMatch[1]}/p${page}.json`)
          if (preRes.ok) {
            const preData: unknown = await preRes.json()
            if (Array.isArray(preData) && preData.length === paragraphs.length) {
              const translations = preData.map(String)
              setPageTranslations(translations)
              saveTranslations(bookId, page, translations)
              return
            }
          }
        } catch {
          // 사전번역 없음 → Gemini fallback
        }
      }

      // 2차: Gemini API 번역
      const res = await fetch('/api/translate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: paragraphs, bookId, page }),
      })
      const data = await res.json()
      const translations: string[] = data.translations ?? []
      setPageTranslations(translations)
      // 절반 이상 성공한 경우만 캐시 저장 (실패 결과 저장 방지)
      const successCount = translations.filter((t) => t.trim() !== '').length
      if (successCount >= paragraphs.length / 2) {
        saveTranslations(bookId, page, translations)
      }
    } catch {
      setPageTranslations([])
    } finally {
      setTranslating(false)
    }
  }

  const goToPage = useCallback((page: number) => {
    setPageTranslations([])
    setWordPopup(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    router.push(`/book/${id}?page=${page}`)
    // 다음 페이지 번역 미리 로드 (캐시 없을 때만)
    if ((viewMode === 'split' || viewMode === 'ko') && pages[page]) {
      const nextParagraphs = pages[page]
      const nextPage = page + 1
      if (!getTranslations(bookId, nextPage)) {
        const pgMatch = bookId.match(/gutenberg_(\d+)/)
        if (pgMatch) {
          fetch(`/translations/pg${pgMatch[1]}/p${nextPage}.json`)
            .then((r) => r.ok ? r.json() : null)
            .then((pre) => {
              if (Array.isArray(pre) && pre.length === nextParagraphs.length) {
                saveTranslations(bookId, nextPage, pre.map(String))
              } else {
                fetch('/api/translate-batch', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ texts: nextParagraphs, bookId, page: nextPage }),
                })
                  .then((r) => r.json())
                  .then((d) => saveTranslations(bookId, nextPage, d.translations ?? []))
                  .catch(() => {})
              }
            })
            .catch(() => {})
        }
      }
    }
  }, [id, router, viewMode, pages, bookId])

  const handleMouseUp = useCallback(() => {
    if (viewMode === 'ko') return // 한국어 전용 모드에선 팝업 불필요
    const selected = getSelectedWord()
    if (!selected) return
    setWordPopup(selected)
    setWordData(null)
    setWordLoading(true)
    fetch('/api/word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: selected.word, sentence: selected.sentence }),
    })
      .then((r) => r.json())
      .then((d) => { setWordData(d); setWordLoading(false) })
      .catch(() => setWordLoading(false))
  }, [viewMode])

  const handleAnalyze = useCallback(async () => {
    setShowGraph(true)
    const cached = getAnalysis(bookId)
    if (cached) { setAnalysis(cached); return }
    setAnalyzing(true)
    const text = pages.slice(0, 5).flat().join('\n\n')
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    const data = await res.json()
    saveAnalysis(bookId, data)
    setAnalysis(data)
    setAnalyzing(false)
  }, [bookId, pages])

  const progress = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0
  const isSplit = viewMode === 'split'
  const isKo = viewMode === 'ko'

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
              <div
                key={step}
                className={`h-1 w-8 rounded-full transition-colors ${
                  step === loadingStep ? 'bg-violet-500' : 'bg-gray-200'
                }`}
              />
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

  const chapterTitle = chapterMap.get(currentPage)

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden" onMouseUp={handleMouseUp}>

      {/* 헤더 */}
      <header className="shrink-0 z-20 bg-[#0f0d1a]/95 backdrop-blur border-b border-violet-900/40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1 text-violet-300 hover:text-white text-sm font-medium transition-colors shrink-0"
          >
            ← 목록
          </button>

          <div className="text-center min-w-0 flex-1">
            <div className="text-white text-sm font-semibold truncate">{book?.title}</div>
            <div className="text-violet-500 text-xs">{book ? getAuthorName(book) : ''}</div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 뷰 모드 선택 */}
            <div className="flex bg-violet-900/40 rounded-lg p-0.5 text-xs">
              {(['en', 'split', 'ko'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    viewMode === mode
                      ? 'bg-violet-600 text-white'
                      : 'text-violet-400 hover:text-violet-200'
                  }`}
                >
                  {VIEW_LABELS[mode]}
                </button>
              ))}
            </div>

            <button
              onClick={handleAnalyze}
              className="flex items-center gap-1 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              🗺️ 관계도
            </button>
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="h-0.5 bg-violet-900/40">
          <div className="h-full bg-violet-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* 헤더 하단 광고 띠 — 320×50 고정 */}
        <div className="bg-[#0f0d1a] border-t border-violet-900/30 h-[50px] flex items-center justify-center">
          <AdBanner slot="4978135753" width={320} height={50} />
        </div>
      </header>

      {/* 인물 관계도 오버레이 */}
      {showGraph && (
        <div className="fixed inset-0 z-30 bg-[#0f0d1a]/98 backdrop-blur flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 border-b border-violet-900/50 shrink-0">
            <div className="flex items-center gap-2">
              <span>🗺️</span>
              <span className="text-white font-bold">인물 관계도</span>
              {analysis && <span className="text-violet-500 text-sm">· {analysis.title}</span>}
            </div>
            <button onClick={() => setShowGraph(false)} className="text-violet-500 hover:text-white text-xl">✕</button>
          </div>
          <div className="flex flex-1 overflow-hidden">
            {analyzing ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-violet-400 text-sm">AI가 인물을 분석 중입니다...</p>
                </div>
              </div>
            ) : analysis ? (
              <>
                <div className="flex-1">
                  <CharacterGraph
                    analysis={analysis}
                    onCharacterClick={(c) => setSelectedChar((prev) => prev?.id === c.id ? null : c)}
                    selectedCharacterId={selectedChar?.id}
                  />
                </div>
                {selectedChar && (
                  <CharacterPanel
                    character={selectedChar}
                    relationships={analysis.relationships}
                    allCharacters={analysis.characters}
                    bookId={bookId}
                    onClose={() => setSelectedChar(null)}
                  />
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* 본문 */}
      <main className="flex-1 overflow-y-auto mx-auto w-full px-6 sm:px-12 py-8 flex flex-col max-w-2xl">

        {/* 챕터 제목 */}
        {chapterTitle && (
          <div className="mb-8 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-medium">Chapter</p>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-serif">{chapterTitle}</h2>
            <div className="mt-4 mx-auto w-12 h-px bg-gray-300" />
          </div>
        )}

        {/* 이전 페이지 연결 맥락 */}
        {currentPage > 1 && prevTailRef.current && !isKo && (
          <div className="mb-6 pb-5 border-b border-gray-200">
            <div className="text-[11px] text-gray-400 mb-2 uppercase tracking-wider">← 이전 페이지에서 이어짐</div>
            <p className="text-gray-400 text-sm leading-7 font-serif line-clamp-2">{prevTailRef.current}</p>
          </div>
        )}

        {/* 본문 텍스트 */}
        {isSplit ? (
          /* 영한 분할 뷰 — 세로 (영어 위, 한국어 아래) */
          <div className="flex-1 flex flex-col">
            {/* 영어 섹션 */}
            <div className="pb-8 space-y-5">
              <div className="text-[11px] text-gray-400 uppercase tracking-widest font-medium">English</div>
              {currentParagraphs.map((para, idx) => (
                <p key={idx} className="text-gray-900 text-[15px] sm:text-[17px] leading-[1.9] font-serif">{para}</p>
              ))}
            </div>
            <hr className="border-gray-200" />
            {/* 한국어 섹션 */}
            <div className="pt-8 pb-4 space-y-5">
              <div className="text-[11px] text-gray-400 uppercase tracking-widest font-medium">한국어</div>
              {translating ? (
                <div className="space-y-4">
                  {currentParagraphs.map((_, idx) => (
                    <div key={idx} className="h-4 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : pageTranslations.every((t) => !t.trim()) ? (
                <p className="text-gray-400 text-sm italic">번역을 불러오는 중입니다...</p>
              ) : (
                currentParagraphs.map((_, idx) => (
                  <p key={idx} className="text-gray-800 text-[15px] sm:text-[17px] leading-[1.9]">
                    {pageTranslations[idx] ?? ''}
                  </p>
                ))
              )}
            </div>
          </div>
        ) : isKo ? (
          /* 한국어 전용 뷰 */
          <div className="flex-1 space-y-6">
            {translating ? (
              <div className="space-y-4">
                {currentParagraphs.map((_, idx) => (
                  <div key={idx} className="h-5 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : pageTranslations.every((t) => !t.trim()) ? (
              <p className="text-gray-400 text-sm italic">번역을 불러오는 중입니다...</p>
            ) : (
              currentParagraphs.map((_, idx) => (
                <p key={idx} className="text-gray-900 text-[16px] sm:text-[18px] leading-[1.95]">
                  {pageTranslations[idx] ?? ''}
                </p>
              ))
            )}
          </div>
        ) : (
          /* 영어 전용 뷰 */
          <div className="flex-1 space-y-6 text-gray-900 text-[16px] sm:text-[18px] leading-[1.95] font-serif select-text">
            {currentParagraphs.map((para, idx) => (
              <p key={idx}>{para}</p>
            ))}
          </div>
        )}

      </main>

      {/* 하단 네비게이션 */}
      <nav className="shrink-0 border-t border-gray-200 bg-white">
        {/* 이전 / 페이지 정보 / 다음 */}
        <div className="flex items-stretch divide-x divide-gray-200">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex-1 flex flex-col items-center justify-center py-5 gap-1 text-gray-600 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <span className="text-2xl leading-none">←</span>
            <span className="text-xs font-medium text-gray-500">이전</span>
          </button>

          <div className="flex flex-col items-center justify-center px-6 py-4 gap-2 min-w-[120px]">
            <div className="text-gray-900 text-base font-bold">{currentPage} / {totalPages}</div>
            <button
              onClick={() => router.push('/')}
              className="text-xs text-violet-500 hover:text-violet-700 transition-colors font-medium px-3 py-1 rounded-full hover:bg-violet-50"
            >
              🏠 목록
            </button>
          </div>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex-1 flex flex-col items-center justify-center py-5 gap-1 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <span className="text-2xl leading-none">→</span>
            <span className="text-xs font-medium opacity-90">다음</span>
          </button>
        </div>
      </nav>

      {/* 단어 팝업 (영어 모드에서만) */}
      {wordPopup && viewMode !== 'ko' && (
        <WordPopup
          data={wordData}
          loading={wordLoading}
          position={wordPopup.position}
          onClose={() => setWordPopup(null)}
        />
      )}

    </div>
  )
}
