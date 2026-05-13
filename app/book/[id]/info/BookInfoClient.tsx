'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { CatalogBook } from '@/lib/catalog'
import { getCatalogCoverUrl } from '@/lib/catalog'
import { BookOpen, ArrowRight, ArrowLeft } from 'lucide-react'

// ─── 챕터 RE (머리말 추출용) ──────────────────────────────────────────────────
const CHAPTER_RE = /^(CHAPTER|Chapter|PART|Part|BOOK|Book|ACT|Act|SECTION|Section|PROLOGUE|Prologue|EPILOGUE|Epilogue|PREFACE|Preface|INTRODUCTION|Introduction|VOLUME|Volume)\b/

function extractPreface(text: string): string | null {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const startRe = /\*{3}\s*START OF [^\n]+\n/i
  const startMatch = normalized.match(startRe)
  let content = normalized
  if (startMatch?.index !== undefined) {
    content = normalized.slice(startMatch.index + startMatch[0].length)
  }
  const endRe = /\*{3}\s*END OF [^\n]+/i
  const endIdx = content.search(endRe)
  if (endIdx !== -1) content = content.slice(0, endIdx)

  const allBlocks = content
    .split(/\n{2,}/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(p => p.length > 30)

  const preBlocks: string[] = []
  for (const block of allBlocks) {
    if (CHAPTER_RE.test(block.trim()) && block.length < 200) break
    preBlocks.push(block)
  }

  if (preBlocks.length === 0) return null
  return preBlocks.slice(0, 6).join('\n\n')
}

function gutenbergTextUrl(id: string): string {
  return `/api/book-text?url=https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`
}

interface BookInfoClientProps {
  bookId: string
  koTitle: string | null
  koAuthor: string | null
  summary: string
  hasKoSummary: boolean
}

export default function BookInfoClient({ bookId, koTitle, koAuthor, summary, hasKoSummary }: BookInfoClientProps) {
  const router = useRouter()

  const [book, setBook] = useState<CatalogBook | null>(null)
  const [imgError, setImgError] = useState(false)
  const [preface, setPreface] = useState<string | null>(null)
  const [prefaceLoading, setPrefaceLoading] = useState(true)

  useEffect(() => {
    fetch('/api/catalog')
      .then(r => r.json())
      .then((data: CatalogBook[]) => {
        const found = data.find(b => String(b.id) === bookId)
        setBook(found ?? null)
      })
      .catch(() => setBook(null))
  }, [bookId])

  useEffect(() => {
    setPrefaceLoading(true)
    fetch(gutenbergTextUrl(bookId))
      .then(r => r.ok ? r.text() : null)
      .then(text => {
        if (text) {
          const extracted = extractPreface(text)
          setPreface(extracted)
        }
      })
      .catch(() => {})
      .finally(() => setPrefaceLoading(false))
  }, [bookId])

  const cover = book ? getCatalogCoverUrl(book.id) : null
  const displayContent = summary

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--paper)' }}>

      {/* ── Navbar ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: 'color-mix(in oklch, var(--paper) 85%, transparent)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--paper-3)',
        }}
      >
        <nav className="container flex items-center justify-between h-16">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 transition-colors group"
            style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 500, color: 'var(--ink-3)' }}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            목록으로
          </button>
          <Link href="/" className="flex items-center gap-2 group">
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
          <div className="w-16" />
        </nav>
      </header>

      {/* ── 히어로 ── */}
      <section
        className="pt-28 pb-12 sm:pt-32 sm:pb-16 relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, var(--accent-deep) 0%, var(--accent-ink) 100%)',
        }}
      >
        {/* 등고선 장식 */}
        <svg
          className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 opacity-[0.06] pointer-events-none"
          width="500" height="500" viewBox="0 0 500 500"
        >
          {[60, 110, 170, 240].map((r) => (
            <circle key={r} cx="250" cy="250" r={r} fill="none" stroke="white" strokeWidth="0.5" />
          ))}
        </svg>

        <div className="max-w-[900px] mx-auto px-4 sm:px-8 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 sm:gap-12">
            {/* 표지 */}
            <div className="shrink-0">
              <div
                className="w-48 sm:w-56 lg:w-64 aspect-[2/3] overflow-hidden"
                style={{ borderRadius: '4px', boxShadow: '0 16px 48px rgba(0,0,0,0.3)' }}
              >
                {!imgError && cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={book?.title ?? ''}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center gap-4 p-6"
                    style={{
                      background: `repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 8px), var(--accent-soft)`,
                    }}
                  >
                    <BookOpen className="w-12 h-12" style={{ color: 'var(--accent-ink)', opacity: 0.4 }} />
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--accent-ink)', textAlign: 'center', lineHeight: 1.3 }}>
                      {book?.title ?? ''}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 메타 정보 */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase' as const,
                  color: 'rgba(255,255,255,0.45)',
                }}
              >
                Public Domain · Free Reading
              </span>

              {koTitle && (
                <p
                  className="mt-4 mb-1"
                  style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}
                >
                  {koTitle}
                </p>
              )}

              <h1
                className="leading-tight mb-5"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(24px, 3vw, 40px)',
                  fontWeight: 400,
                  color: 'var(--paper)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.15,
                }}
              >
                {book?.title ?? <span className="animate-pulse rounded h-8 w-48 inline-block" style={{ background: 'rgba(255,255,255,0.1)' }} />}
              </h1>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mb-8">
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Author</span>
                  <div>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 500, color: 'var(--paper)' }}>{book?.author ?? ''}</p>
                    {koAuthor && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{koAuthor}</p>}
                  </div>
                </div>
                {book?.year && book.year > 0 && (
                  <>
                    <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)' }} />
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Year</span>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 500, color: 'var(--paper)' }}>{book.year}년</p>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => router.push(`/book/${bookId}?page=1`)}
                className="inline-flex items-center justify-center gap-3 w-full sm:w-auto transition-all hover:scale-[1.02] active:scale-[0.98] group"
                style={{
                  background: 'var(--paper)',
                  color: 'var(--accent-deep)',
                  height: '48px',
                  padding: '0 26px',
                  borderRadius: '999px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '14.5px',
                  fontWeight: 600,
                  minWidth: '200px',
                }}
              >
                읽기 시작
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 기능 배지 ── */}
      <section className="py-8" style={{ borderBottom: '1px solid var(--paper-3)' }}>
        <div className="max-w-[900px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: 'AI 단어 풀이', desc: '클릭 한 번', num: '01' },
              { label: '한국어 번역', desc: '전문 번역', num: '02' },
              { label: '인물 관계도', desc: 'AI 분석', num: '03' },
            ].map(({ label, desc, num }) => (
              <div
                key={label}
                className="p-4 sm:p-5 text-center"
                style={{ borderRadius: '4px', border: '1px solid var(--paper-3)' }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.16em', color: 'var(--ink-4)' }}>
                  {num}
                </span>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginTop: '4px' }}>
                  {label}
                </p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--ink-4)', marginTop: '2px' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 서머리 / 머리말 ── */}
      <section className="flex-1 py-10">
        <div className="max-w-[900px] mx-auto px-4 sm:px-8">
          <div style={{ borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--paper-3)' }}>
            <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4" style={{ borderBottom: '1px solid var(--paper-3)' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--ink-4)',
                }}
              >
                About
              </span>
              <h2
                className="mt-1"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '20px',
                  fontWeight: 500,
                  color: 'var(--ink)',
                  letterSpacing: '-0.01em',
                }}
              >
                {hasKoSummary ? '이 책에 대하여' : preface ? '머리말' : '소개'}
              </h2>
            </div>

            <div className="px-6 sm:px-8 py-6 sm:py-8">
              {prefaceLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[100, 95, 90, 85, 70].map((w, i) => (
                    <div key={i} className="h-3 rounded" style={{ background: 'var(--paper-2)', width: `${w}%` }} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4" style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(14px, 1.1vw, 16px)', lineHeight: 1.9, color: 'var(--ink-2)' }}>
                  {displayContent.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 sm:px-8 pb-6 sm:pb-8">
              <button
                onClick={() => router.push(`/book/${bookId}?page=1`)}
                className="w-full flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] group"
                style={{
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  height: '48px',
                  borderRadius: '999px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '15px',
                  fontWeight: 600,
                }}
              >
                읽기 시작
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* 라이선스 */}
          <div
            className="mt-6 p-5 sm:p-6"
            style={{ borderRadius: '4px', border: '1px solid var(--paper-3)' }}
          >
            <div className="space-y-1.5" style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--ink-4)' }}>
              <p style={{ fontWeight: 600, color: 'var(--ink-3)' }}>
                프로젝트 구텐베르크 전자책 {koTitle ? `\u300A${koTitle}\u300B` : book ? `"${book.title}"` : ''}
              </p>
              <p>
                이 전자책은 미국 내 모든 사람들과 세계 대부분의 지역에서 거의 아무런 제약 없이
                무료로 이용할 수 있습니다.
              </p>
              <p>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.04em' }}>
                  전자책 #{bookId}
                </span>
                {' · '}
                <a
                  href={`https://www.gutenberg.org/ebooks/${bookId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 transition-colors"
                  style={{ color: 'var(--accent-purple)' }}
                >
                  www.gutenberg.org/ebooks/{bookId}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--rule)', background: 'var(--paper-2)', paddingBottom: '100px' }}>
        <div className="container py-8 text-center">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--ink-5)', letterSpacing: '0.04em' }}>
            Powered by Project Gutenberg · &copy; 2026 Purplelica Books
          </p>
        </div>
      </footer>
    </div>
  )
}
