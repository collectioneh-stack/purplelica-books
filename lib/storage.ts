import type { CharacterMemo, BookAnalysis } from './types'

const MEMO_KEY = 'bookmap_memos'
const ANALYSIS_KEY = 'bookmap_analysis_v2'
const TEXT_KEY = 'bookmap_text_v1'
const TRANSLATION_KEY = 'bookmap_trans_v1'

// ─── 인물 메모 ───────────────────────────────────────────
export function saveMemo(bookId: string, characterId: string, memo: string): void {
  const all = getAllMemos()
  all[`${bookId}_${characterId}`] = { characterId, memo, updatedAt: new Date().toISOString() }
  localStorage.setItem(MEMO_KEY, JSON.stringify(all))
}

export function getMemo(bookId: string, characterId: string): string {
  return getAllMemos()[`${bookId}_${characterId}`]?.memo ?? ''
}

function getAllMemos(): Record<string, CharacterMemo> {
  try { return JSON.parse(localStorage.getItem(MEMO_KEY) ?? '{}') } catch { return {} }
}

// ─── 인물 분석 ───────────────────────────────────────────
export function saveAnalysis(bookId: string, analysis: BookAnalysis): void {
  const all = getSavedAnalyses()
  all[bookId] = analysis
  localStorage.setItem(ANALYSIS_KEY, JSON.stringify(all))
}

export function getAnalysis(bookId: string): BookAnalysis | null {
  return getSavedAnalyses()[bookId] ?? null
}

function getSavedAnalyses(): Record<string, BookAnalysis> {
  try { return JSON.parse(localStorage.getItem(ANALYSIS_KEY) ?? '{}') } catch { return {} }
}

// ─── 책 본문 텍스트 캐시 ─────────────────────────────────
export function saveBookText(bookId: string, text: string): void {
  try {
    const all: Record<string, string> = JSON.parse(localStorage.getItem(TEXT_KEY) ?? '{}')
    // 저장 공간 절약: 최대 5권만 유지 (오래된 것 제거)
    const keys = Object.keys(all)
    if (keys.length >= 5 && !all[bookId]) delete all[keys[0]]
    all[bookId] = text
    localStorage.setItem(TEXT_KEY, JSON.stringify(all))
  } catch { /* 저장 실패 시 무시 */ }
}

export function getBookText(bookId: string): string | null {
  try {
    const all: Record<string, string> = JSON.parse(localStorage.getItem(TEXT_KEY) ?? '{}')
    return all[bookId] ?? null
  } catch { return null }
}

// ─── 번역 캐시 ───────────────────────────────────────────
// 키: bookId_pageNum
export function saveTranslations(bookId: string, page: number, translations: string[]): void {
  try {
    const all: Record<string, string[]> = JSON.parse(localStorage.getItem(TRANSLATION_KEY) ?? '{}')
    // 최대 50페이지 분량만 유지
    const keys = Object.keys(all)
    if (keys.length >= 50) delete all[keys[0]]
    all[`${bookId}_${page}`] = translations
    localStorage.setItem(TRANSLATION_KEY, JSON.stringify(all))
  } catch { /* 저장 실패 시 무시 */ }
}

export function getTranslations(bookId: string, page: number): string[] | null {
  try {
    const all: Record<string, string[]> = JSON.parse(localStorage.getItem(TRANSLATION_KEY) ?? '{}')
    return all[`${bookId}_${page}`] ?? null
  } catch { return null }
}
