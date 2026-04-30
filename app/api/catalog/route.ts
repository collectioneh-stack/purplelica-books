import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { CatalogBook } from '@/lib/catalog'

// Minimal fallback if catalog.json not yet generated
const FALLBACK: CatalogBook[] = [
  { id: 84,   title: 'Frankenstein', author: 'Shelley, Mary Wollstonecraft', year: 1818, size: 448000 },
  { id: 1342, title: 'Pride and Prejudice', author: 'Austen, Jane', year: 1813, size: 762000 },
  { id: 11,   title: "Alice's Adventures in Wonderland", author: 'Carroll, Lewis', year: 1865, size: 167000 },
  { id: 1661, title: 'The Adventures of Sherlock Holmes', author: 'Doyle, Arthur Conan', year: 1892, size: 594000 },
  { id: 98,   title: 'A Tale of Two Cities', author: 'Dickens, Charles', year: 1859, size: 793000 },
  { id: 2701, title: 'Moby Dick; Or, The Whale', author: 'Melville, Herman', year: 1851, size: 1260000 },
  { id: 174,  title: 'The Picture of Dorian Gray', author: 'Wilde, Oscar', year: 1890, size: 458000 },
  { id: 345,  title: 'Dracula', author: 'Stoker, Bram', year: 1897, size: 881000 },
  { id: 76,   title: 'Adventures of Huckleberry Finn', author: 'Twain, Mark', year: 1884, size: 603000 },
  { id: 46,   title: 'A Christmas Carol in Prose', author: 'Dickens, Charles', year: 1843, size: 182000 },
  { id: 1260, title: 'Jane Eyre: An Autobiography', author: 'Brontë, Charlotte', year: 1847, size: 1063000 },
  { id: 5200, title: 'Metamorphosis', author: 'Kafka, Franz', year: 1915, size: 140000 },
]

export async function GET() {
  try {
    const catalogPath = join(process.cwd(), 'public', 'books', 'catalog.json')
    const raw = readFileSync(catalogPath, 'utf8')
    const books: CatalogBook[] = JSON.parse(raw)
    return NextResponse.json(books, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    })
  } catch {
    return NextResponse.json(FALLBACK, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    })
  }
}
