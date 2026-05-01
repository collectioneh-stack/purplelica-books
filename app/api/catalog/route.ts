import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { CatalogBook } from '@/lib/catalog'

// Books with pre-translated CDN files — only these are shown (no real-time API delay)
const TRANSLATED_IDS = new Set([
  11, 16, 35, 41, 43, 46, 84, 103, 219, 345, 526, 721,
  1064, 1080, 1342, 1661, 1934, 1952, 2500, 2542, 2701, 5200,
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
      headers: { 'Cache-Control': 'public, max-age=3600' },
    })
  } catch {
    const filtered = FALLBACK.filter((b) => TRANSLATED_IDS.has(b.id))
    return NextResponse.json(filtered, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    })
  }
}
