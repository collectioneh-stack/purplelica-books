const BOOKMARK_KEY = 'purplelica_bookmarks'
const THEME_KEY = 'purplelica_theme'

export interface Bookmark {
  bookId: string
  page: number
  updatedAt: number
}

export type ReaderTheme = 'light' | 'dark' | 'sepia'

// ─── 북마크 ─────────────────────────────────────────────────────
export function getBookmark(bookId: string): Bookmark | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY)
    if (!raw) return null
    const all: Record<string, Bookmark> = JSON.parse(raw)
    return all[bookId] ?? null
  } catch {
    return null
  }
}

export function saveBookmark(bookId: string, page: number): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY)
    const all: Record<string, Bookmark> = raw ? JSON.parse(raw) : {}
    all[bookId] = { bookId, page, updatedAt: Date.now() }
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(all))
  } catch {
    // storage full or unavailable
  }
}

export function getAllBookmarks(): Bookmark[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY)
    if (!raw) return []
    const all: Record<string, Bookmark> = JSON.parse(raw)
    return Object.values(all).sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

// ─── 테마 ─────────────────────────────────────────────────────
export function getReaderTheme(): ReaderTheme {
  if (typeof window === 'undefined') return 'light'
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'dark' || saved === 'sepia') return saved
    return 'light'
  } catch {
    return 'light'
  }
}

export function saveReaderTheme(theme: ReaderTheme): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // storage full or unavailable
  }
}

// ─── 테마 스타일 ─────────────────────────────────────────────
export const THEME_STYLES: Record<ReaderTheme, { bg: string; text: string; muted: string; border: string; headerBg: string; headerText: string }> = {
  light: {
    bg: '#FAFAF8',
    text: '#1A1A1A',
    muted: '#8C8C8C',
    border: '#F0F0EE',
    headerBg: '#1A1A1A',
    headerText: '#FFFFFF',
  },
  dark: {
    bg: '#1A1A1A',
    text: '#E0E0E0',
    muted: '#808080',
    border: '#333333',
    headerBg: '#000000',
    headerText: '#E0E0E0',
  },
  sepia: {
    bg: '#F5ECD7',
    text: '#3B2F1E',
    muted: '#8C7A5C',
    border: '#DDD0B5',
    headerBg: '#3B2F1E',
    headerText: '#F5ECD7',
  },
}
