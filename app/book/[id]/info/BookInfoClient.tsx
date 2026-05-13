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
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Navbar (glassmorphism) ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <nav className="container flex items-center justify-between h-16">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            목록으로
          </button>
          <Link href="/" className="flex items-center gap-2 group">
            <BookOpen className="w-6 h-6 text-primary transition-transform group-hover:scale-110" />
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Purplelica <span className="text-primary">Books</span>
            </span>
          </Link>
          <div className="w-16" />
        </nav>
      </header>

      {/* ── 책 상세 히어로 ── */}
      <section className="pt-28 pb-12 sm:pt-32 sm:pb-16 bg-secondary/30">
        <div className="max-w-[900px] mx-auto px-4 sm:px-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 sm:gap-12">
            {/* 표지 이미지 */}
            <div className="shrink-0">
              <div className="w-48 sm:w-56 lg:w-64 aspect-[2/3] rounded-xl overflow-hidden bg-muted shadow-lg">
                {!imgError && cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={book?.title ?? ''}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5">
                    <BookOpen className="w-12 h-12 text-primary/40" />
                    <p className="text-muted-foreground text-sm text-center leading-snug font-serif">
                      {book?.title ?? ''}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 책 메타 정보 */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 text-muted-foreground text-[11px] font-semibold tracking-[0.15em] uppercase mb-4">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                무료 열람 · 전문 번역 제공
              </div>

              {koTitle && (
                <p className="text-muted-foreground text-[15px] font-medium mb-1">{koTitle}</p>
              )}

              <h1 className="text-foreground leading-tight mb-5 font-serif" style={{
                fontSize: 'clamp(24px, 3vw, 36px)',
                fontWeight: 500,
              }}>
                {book?.title ?? <span className="animate-pulse bg-muted rounded h-8 w-48 inline-block" />}
              </h1>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mb-8">
                <div className="flex items-center gap-2">
                  <div className="text-muted-foreground text-[13px]">저자</div>
                  <div>
                    <p className="text-foreground text-[15px] font-medium">{book?.author ?? ''}</p>
                    {koAuthor && <p className="text-muted-foreground text-[13px]">{koAuthor}</p>}
                  </div>
                </div>
                {book?.year && book.year > 0 && (
                  <>
                    <div className="w-px h-5 bg-border" />
                    <div className="flex items-center gap-2">
                      <div className="text-muted-foreground text-[13px]">출간</div>
                      <p className="text-foreground text-[15px] font-medium">{book.year}년</p>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => router.push(`/book/${bookId}?page=1`)}
                className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-10 py-4 rounded-2xl text-[17px] font-bold bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] group"
                style={{ minWidth: '200px' }}
              >
                읽기 시작
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 기능 배지 ── */}
      <section className="py-8">
        <div className="max-w-[900px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: 'AI 단어 풀이', desc: '클릭 한 번', num: '01' },
              { label: '한국어 번역', desc: '전문 번역', num: '02' },
              { label: '인물 관계도', desc: 'AI 분석', num: '03' },
            ].map(({ label, desc, num }) => (
              <div key={label} className="p-4 sm:p-5 text-center rounded-xl border border-border">
                <span className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground">{num}</span>
                <p className="text-foreground text-[14px] font-semibold mt-1">{label}</p>
                <p className="text-muted-foreground text-[12px] mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 서머리 / 머리말 ── */}
      <section className="flex-1 py-10">
        <div className="max-w-[900px] mx-auto px-4 sm:px-8">
          <div className="rounded-2xl overflow-hidden border border-border">
            <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 border-b border-border">
              <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-1">About</p>
              <h2 className="text-foreground text-lg font-semibold font-serif">
                {hasKoSummary ? '이 책에 대하여' : preface ? '머리말' : '소개'}
              </h2>
            </div>

            <div className="px-6 sm:px-8 py-6 sm:py-8">
              {prefaceLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[100, 95, 90, 85, 70].map((w, i) => (
                    <div key={i} className="h-3 rounded bg-muted" style={{ width: `${w}%` }} />
                  ))}
                </div>
              ) : (
                <div className="text-secondary-foreground leading-relaxed space-y-4" style={{ fontSize: 'clamp(14px, 1.1vw, 16px)', lineHeight: 1.9 }}>
                  {displayContent.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 sm:px-8 pb-6 sm:pb-8">
              <button
                onClick={() => router.push(`/book/${bookId}?page=1`)}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-[17px] font-bold bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] group"
              >
                읽기 시작
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* 라이선스 고지 */}
          <div className="mt-6 rounded-xl p-5 sm:p-6 border border-border">
            <div className="text-muted-foreground space-y-1.5 text-xs">
              <p className="font-semibold text-secondary-foreground">
                프로젝트 구텐베르크 전자책 {koTitle ? `\u300A${koTitle}\u300B` : book ? `"${book.title}"` : ''}
              </p>
              <p>
                이 전자책은 미국 내 모든 사람들과 세계 대부분의 지역에서 거의 아무런 제약 없이
                무료로 이용할 수 있습니다.
              </p>
              <p>
                전자책 #{bookId} ·{' '}
                <a
                  href={`https://www.gutenberg.org/ebooks/${bookId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
                >
                  www.gutenberg.org/ebooks/{bookId}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-secondary/30">
        <div className="container py-8 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by Project Gutenberg · &copy; 2026 Purplelica Books
          </p>
        </div>
      </footer>
    </div>
  )
}
