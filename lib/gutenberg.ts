export interface GutenbergBook {
  id: number
  title: string
  authors: { name: string; birth_year: number | null; death_year: number | null }[]
  subjects: string[]
  languages: string[]
  download_count: number
  formats: Record<string, string>
  summaries?: string[]
}

export interface GutenbergSearchResult {
  count: number
  next: string | null
  previous: string | null
  results: GutenbergBook[]
}

// 클라이언트에서 직접 외부 도메인 fetch 시 CORS 오류 → Next.js API 프록시 사용
function gutenbergProxy(params: Record<string, string>): string {
  const qs = new URLSearchParams({ path: '/books', ...params })
  return `/api/gutenberg?${qs}`
}

export async function searchBooks(query: string, page = 1): Promise<GutenbergSearchResult> {
  const res = await fetch(gutenbergProxy({ search: query, languages: 'en', page: String(page) }))
  if (!res.ok) throw new Error('책 검색 실패')
  return res.json()
}

export async function getPopularBooks(page = 1): Promise<GutenbergSearchResult & { _fallback?: boolean }> {
  const res = await fetch(gutenbergProxy({ languages: 'en', sort: 'popular', page: String(page) }))
  if (!res.ok) throw new Error('인기 도서 로드 실패')
  return res.json()
}

export async function getBook(id: number): Promise<GutenbergBook> {
  const res = await fetch(`/api/gutenberg?path=/books/${id}`)
  if (!res.ok) throw new Error('책 정보 로드 실패')
  return res.json()
}

export function getTextUrl(book: GutenbergBook): string | null {
  const formats = book.formats
  return (
    formats['text/plain; charset=utf-8'] ??
    formats['text/plain; charset=us-ascii'] ??
    formats['text/plain'] ??
    null
  )
}

export async function fetchBookText(book: GutenbergBook): Promise<string> {
  const url = getTextUrl(book)
  if (!url) throw new Error('텍스트 형식 없음')
  // 외부 텍스트 파일도 서버 프록시로 fetch (CORS 우회)
  const res = await fetch(`/api/book-text?url=${encodeURIComponent(url)}`)
  if (!res.ok) throw new Error('본문 로드 실패')
  return res.text()
}

export function getCoverUrl(book: GutenbergBook): string | null {
  return book.formats['image/jpeg'] ?? null
}

export function getAuthorName(book: GutenbergBook): string {
  return book.authors[0]?.name ?? '작자 미상'
}
