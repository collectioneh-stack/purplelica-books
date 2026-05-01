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
  // Try catalog first (instant, no external API)
  try {
    const catalogRes = await fetch('/api/catalog')
    if (catalogRes.ok) {
      const catalog = await catalogRes.json()
      const entry = catalog.find((b: { id: number }) => b.id === id)
      if (entry) {
        return {
          id: entry.id,
          title: entry.title,
          authors: [{ name: entry.author, birth_year: null, death_year: null }],
          subjects: [],
          languages: ['en'],
          download_count: 0,
          formats: {
            'image/jpeg': `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`,
            // 로컬 정적 파일 직접 사용 — API 프록시/readFileSync 우회
            'text/plain; charset=utf-8': `/books/pg${id}.txt`,
          },
          summaries: [],
        }
      }
    }
  } catch { /* fall through to gutendex */ }

  // Fallback: gutendex (for books not in catalog)
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

  // 로컬 정적 파일(/books/pg*.txt)은 직접 fetch — API 프록시/readFileSync 불필요
  if (url.startsWith('/')) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`본문 로드 실패: ${res.status}`)
    // BOM 제거 후 반환
    const text = await res.text()
    return text.startsWith('\ufeff') ? text.slice(1) : text
  }

  // 외부 URL은 서버 프록시로 fetch (CORS 우회)
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
