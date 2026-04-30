import type { GutenbergBook } from './gutenberg'

// gutendex 다운 시 홈 화면에 표시할 정적 인기 책 목록
// Gutenberg ID 기준 — 텍스트/커버 URL은 실제 Gutenberg 패턴으로 구성
function makeBook(
  id: number,
  title: string,
  author: string,
  birth: number,
  death: number,
  downloads: number,
): GutenbergBook {
  return {
    id,
    title,
    authors: [{ name: author, birth_year: birth, death_year: death }],
    subjects: [],
    languages: ['en'],
    download_count: downloads,
    formats: {
      'image/jpeg': `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`,
      'text/plain; charset=utf-8': `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
    },
  }
}

export const FALLBACK_BOOKS: GutenbergBook[] = [
  makeBook(1342, 'Pride and Prejudice', 'Austen, Jane', 1775, 1817, 80000),
  makeBook(11, "Alice's Adventures in Wonderland", 'Carroll, Lewis', 1832, 1898, 60000),
  makeBook(1661, 'The Adventures of Sherlock Holmes', 'Doyle, Arthur Conan', 1859, 1930, 55000),
  makeBook(98, 'A Tale of Two Cities', 'Dickens, Charles', 1812, 1870, 50000),
  makeBook(84, 'Frankenstein', 'Shelley, Mary Wollstonecraft', 1797, 1851, 48000),
  makeBook(174, 'The Picture of Dorian Gray', 'Wilde, Oscar', 1854, 1900, 45000),
  makeBook(345, 'Dracula', 'Stoker, Bram', 1847, 1912, 43000),
  makeBook(76, 'Adventures of Huckleberry Finn', 'Twain, Mark', 1835, 1910, 42000),
  makeBook(46, 'A Christmas Carol in Prose', 'Dickens, Charles', 1812, 1870, 40000),
  makeBook(1260, 'Jane Eyre: An Autobiography', 'Brontë, Charlotte', 1816, 1855, 38000),
  makeBook(768, 'Wuthering Heights', 'Brontë, Emily', 1818, 1848, 36000),
  makeBook(2701, 'Moby Dick; Or, The Whale', 'Melville, Herman', 1819, 1891, 35000),
]
