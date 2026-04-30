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

function splitIntoPages(text: string): string[][] {
  // Project Gutenberg 텍스트는 \r\n 줄바꿈 사용 → 먼저 정규화
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const paragraphs = normalized
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
  // 뷰 모드
  const [viewMode, setViewMode] = useState<ViewMode>('ko')

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
          setPages(splitIntoPages(cached))
        } else {
          setLoadingStep('text')
          const text = await fetchBookText(bookData)
          saveBookText(`gutenberg_${id}`, text)
          setLoadingStep('parse')
          setPages(splitIntoPages(text))
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
      const res = await fetch('/api/translate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: paragraphs }),
      })
      const data = await res.json()
      const translations = data.translations ?? []
      setPageTranslations(translations)
      saveTranslations(bookId, page, translations)
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
      if (!getTranslations(bookId, page + 1)) {
        fetch('/api/translate-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: nextParagraphs }),
        })
          .then((r) => r.json())
          .then((d) => saveTranslations(bookId, page + 1, d.translations ?? []))
          .catch(() => {})
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
      <div className="min-h-screen bg-[#0f0d1a] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-violet-400 text-sm font-medium">{msg.text}</p>
          {msg.sub && <p className="text-violet-700 text-xs max-w-xs">{msg.sub}</p>}
          <div className="flex gap-2 justify-center mt-2">
            {(['meta', 'text', 'parse'] as const).map((step) => (
              <div
                key={step}
                className={`h-1 w-8 rounded-full transition-colors ${
                  step === loadingStep ? 'bg-violet-400' : 'bg-violet-900'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) return (
    <div className="min-h-screen bg-[#0f0d1a] flex items-center justify-center">
      <div className="text-center space-y-3">
        <p className="text-red-400">⚠️ {error}</p>
        <button onClick={() => router.back()} className="text-violet-400 text-sm hover:text-white">← 돌아가기</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f0d1a] flex flex-col" onMouseUp={handleMouseUp}>

      {/* 헤더 */}
      <header className="sticky top-0 z-20 bg-[#0f0d1a]/95 backdrop-blur border-b border-violet-900/40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-violet-500 hover:text-violet-300 text-sm transition-colors shrink-0"
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
      <main className={`flex-1 mx-auto w-full px-4 py-8 flex flex-col ${isSplit ? 'max-w-6xl' : 'max-w-3xl'}`}>

        {/* 이전 페이지 연결 맥락 */}
        {currentPage > 1 && prevTailRef.current && (
          <div className="mb-6 pb-5 border-b border-violet-900/30">
            <div className="text-[11px] text-violet-600 mb-2 uppercase tracking-wider">← 이전 페이지에서 이어짐</div>
            {isSplit ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <p className="text-violet-800/60 text-sm leading-7 font-serif line-clamp-2">{prevTailRef.current}</p>
                <p className="text-violet-800/40 text-sm leading-7 line-clamp-2">
                  {/* 이전 페이지 꼬리 번역은 생략 (현재 페이지 번역에 집중) */}
                </p>
              </div>
            ) : (
              <p className="text-violet-800/60 text-sm leading-7 font-serif line-clamp-2">{prevTailRef.current}</p>
            )}
          </div>
        )}

        {/* 번역 로딩 */}
        {translating && (
          <div className="flex items-center gap-2 text-violet-500 text-sm mb-6">
            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            페이지 번역 중...
          </div>
        )}

        {/* 본문 텍스트 */}
        {isSplit ? (
          /* 영한 병렬 뷰 */
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-px">
            {/* 왼쪽: 영어 */}
            <div className="md:pr-6 md:border-r md:border-violet-900/30 space-y-6">
              <div className="text-[11px] text-violet-600 uppercase tracking-wider mb-4 hidden md:block">English</div>
              {currentParagraphs.map((para, idx) => (
                <p key={idx} className="text-[#d4cfe8] text-base leading-8 font-serif">{para}</p>
              ))}
            </div>
            {/* 오른쪽: 한국어 */}
            <div className="mt-6 md:mt-0 md:pl-6 space-y-6 border-t border-violet-900/30 pt-6 md:border-t-0 md:pt-0">
              <div className="text-[11px] text-violet-600 uppercase tracking-wider mb-4 hidden md:block">한국어</div>
              {translating ? (
                <div className="space-y-4">
                  {currentParagraphs.map((_, idx) => (
                    <div key={idx} className="h-4 bg-violet-900/30 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                currentParagraphs.map((_, idx) => (
                  <p key={idx} className="text-violet-300/80 text-base leading-8">
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
                  <div key={idx} className="h-5 bg-violet-900/30 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              currentParagraphs.map((_, idx) => (
                <p key={idx} className="text-violet-100 text-base leading-8">
                  {pageTranslations[idx] ?? ''}
                </p>
              ))
            )}
          </div>
        ) : (
          /* 영어 전용 뷰 */
          <div className="flex-1 space-y-6 text-[#d4cfe8] text-base leading-8 font-serif select-text">
            {currentParagraphs.map((para, idx) => (
              <p key={idx}>{para}</p>
            ))}
          </div>
        )}

        {/* 하단 네비게이션 */}
        <div className="mt-12 pt-6 border-t border-violet-900/40">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-violet-800 text-violet-400 hover:border-violet-600 hover:text-violet-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium"
            >
              ← 이전
            </button>

            <div className="text-center">
              <div className="text-white text-sm font-semibold">{currentPage} / {totalPages}</div>
              <div className="text-violet-600 text-xs mt-0.5">{progress}% 완료</div>
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-bold"
            >
              다음 →
            </button>
          </div>
        </div>
      </main>

      {/* 단어 팝업 (영어 모드에서만) */}
      {wordPopup && viewMode !== 'ko' && (
        <WordPopup
          data={wordData}
          loading={wordLoading}
          position={wordPopup.position}
          onClose={() => setWordPopup(null)}
        />
      )}

      {/* 저작권 / 출처 푸터 */}
      <footer className="bg-[#0a0815] border-t border-violet-900/40 py-4 px-4 text-center">
        <p className="text-violet-600 text-xs leading-relaxed">
          본 서비스는{' '}
          <a
            href={`https://www.gutenberg.org/ebooks/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-violet-400 transition-colors"
          >
            Project Gutenberg
          </a>
          에서 제공하는 저작권 만료 공개 도서를 활용합니다.
          AI 번역 및 분석 기능은 Purplelica Books가 추가 제공합니다.
        </p>
        <p className="text-violet-700 text-[11px] mt-1">
          Powered by{' '}
          <a
            href="https://www.gutenberg.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-violet-500 transition-colors"
          >
            Project Gutenberg
          </a>
          {' · '}© 2026 Purplelica Books
        </p>
      </footer>
    </div>
  )
}
