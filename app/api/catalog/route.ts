import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { CatalogBook } from '@/lib/catalog'

// 번역 100% 완료 도서만 노출 (디스크 실측 기준)
// 마지막 갱신: 2026-05-31 — 70권
// 변경: catalog 5권 추가 (526/600/1399/2097/2554) + retry 완료 12권 추가
// 제외: pg158 엠마(50%), pg1404 연방주의자(96%) — 분할 불일치로 100% 완료 못 함
const TRANSLATED_IDS = new Set([
  11, 16, 23, 35, 36, 41, 43, 45, 46, 55, 61, 74, 76, 84,
  98, 103, 105, 120, 132, 135, 139, 141, 160, 161, 174, 209, 215, 219, 236,
  244, 308, 345, 526, 600, 721, 768, 863, 1007, 1064, 1080, 1232, 1251, 1260,
  1317, 1322, 1342, 1399, 1400, 1497, 1661, 1728, 1934, 1952, 2097, 2197, 2500,
  2542, 2554, 2701, 2814, 2852, 3825, 4085, 4300, 4363, 4517, 5200, 5230, 5765, 6130,
])

// Minimal fallback if catalog.json not yet generated
const FALLBACK: CatalogBook[] = [
  { id: 84,   title: 'Frankenstein', author: 'Shelley, Mary Wollstonecraft', year: 1818, size: 448000 },
  { id: 1342, title: 'Pride and Prejudice', author: 'Austen, Jane', year: 1813, size: 762000 },
  { id: 11,   title: "Alice's Adventures in Wonderland", author: 'Carroll, Lewis', year: 1865, size: 167000 },
  { id: 1661, title: 'The Adventures of Sherlock Holmes', author: 'Doyle, Arthur Conan', year: 1892, size: 594000 },
  { id: 2701, title: 'Moby Dick; Or, The Whale', author: 'Melville, Herman', year: 1851, size: 1260000 },
  { id: 345,  title: 'Dracula', author: 'Stoker, Bram', year: 1897, size: 881000 },
  { id: 46,   title: 'A Christmas Carol in Prose', author: 'Dickens, Charles', year: 1843, size: 182000 },
  { id: 5200, title: 'Metamorphosis', author: 'Kafka, Franz', year: 1915, size: 140000 },
  { id: 1080, title: 'The Strange Case of Dr Jekyll and Mr Hyde', author: 'Stevenson, Robert Louis', year: 1886, size: 134000 },
  { id: 1952, title: 'The Yellow Wallpaper', author: 'Gilman, Charlotte Perkins', year: 1892, size: 36000 },
]

export async function GET() {
  try {
    const catalogPath = join(process.cwd(), 'public', 'books', 'catalog.json')
    const raw = readFileSync(catalogPath, 'utf8')
    const books: CatalogBook[] = JSON.parse(raw)
    const filtered = books.filter((b) => TRANSLATED_IDS.has(b.id))
    return NextResponse.json(filtered, {
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=3600' },
    })
  } catch {
    const filtered = FALLBACK.filter((b) => TRANSLATED_IDS.has(b.id))
    return NextResponse.json(filtered, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    })
  }
}
