export interface CatalogBook {
  id: number
  title: string
  author: string
  year: number
  size: number
}

// Gutenberg cover image URL pattern (deterministic)
export function getCatalogCoverUrl(id: number): string {
  return `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`
}

// Convert catalog book to a GutenbergBook-compatible shape for existing components
export function toGutenbergShape(book: CatalogBook) {
  return {
    id: book.id,
    title: book.title,
    authors: [{ name: book.author, birth_year: null, death_year: null }],
    subjects: [],
    languages: ['en'],
    download_count: 0,
    formats: {
      'image/jpeg': getCatalogCoverUrl(book.id),
      'text/plain; charset=utf-8': `https://gutenberg.pglaf.org/cache/epub/${book.id}/pg${book.id}.txt`,
    },
    summaries: [],
  }
}

// Weekly book rotation — deterministic, no DB needed
// Returns a stable "week seed" so all users see the same rotation
export function getWeekSeed(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return now.getFullYear() * 100 + week
}

// Pick 12 books for the weekly recommendation slot using the week seed
export function getWeeklyRecommended(books: CatalogBook[], count = 12): CatalogBook[] {
  if (books.length === 0) return []
  const seed = getWeekSeed()
  // Simple deterministic shuffle based on seed
  const shuffled = [...books]
  let rng = seed
  for (let i = shuffled.length - 1; i > 0; i--) {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(rng) % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}
