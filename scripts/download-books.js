/**
 * 인기 100권 다운로드 스크립트
 * node scripts/download-books.js
 */
const https = require('https')
const fs = require('fs')
const path = require('path')

const BOOKS = [
  { id: 1342, title: 'Pride and Prejudice', author: 'Austen, Jane', year: 1813 },
  { id: 11,   title: "Alice's Adventures in Wonderland", author: 'Carroll, Lewis', year: 1865 },
  { id: 84,   title: 'Frankenstein', author: 'Shelley, Mary Wollstonecraft', year: 1818 },
  { id: 1661, title: 'The Adventures of Sherlock Holmes', author: 'Doyle, Arthur Conan', year: 1892 },
  { id: 98,   title: 'A Tale of Two Cities', author: 'Dickens, Charles', year: 1859 },
  { id: 2701, title: 'Moby Dick; Or, The Whale', author: 'Melville, Herman', year: 1851 },
  { id: 174,  title: 'The Picture of Dorian Gray', author: 'Wilde, Oscar', year: 1890 },
  { id: 345,  title: 'Dracula', author: 'Stoker, Bram', year: 1897 },
  { id: 76,   title: 'Adventures of Huckleberry Finn', author: 'Twain, Mark', year: 1884 },
  { id: 46,   title: 'A Christmas Carol in Prose', author: 'Dickens, Charles', year: 1843 },
  { id: 1260, title: 'Jane Eyre: An Autobiography', author: 'Brontë, Charlotte', year: 1847 },
  { id: 768,  title: 'Wuthering Heights', author: 'Brontë, Emily', year: 1847 },
  { id: 5200, title: 'Metamorphosis', author: 'Kafka, Franz', year: 1915 },
  { id: 74,   title: 'The Adventures of Tom Sawyer', author: 'Twain, Mark', year: 1876 },
  { id: 43,   title: 'The Strange Case of Dr Jekyll and Mr Hyde', author: 'Stevenson, Robert Louis', year: 1886 },
  { id: 1400, title: 'Great Expectations', author: 'Dickens, Charles', year: 1861 },
  { id: 514,  title: 'Little Women', author: 'Alcott, Louisa May', year: 1868 },
  { id: 1184, title: 'The Count of Monte Cristo', author: 'Dumas, Alexandre', year: 1844 },
  { id: 2814, title: 'Dubliners', author: 'Joyce, James', year: 1914 },
  { id: 244,  title: 'A Study in Scarlet', author: 'Doyle, Arthur Conan', year: 1887 },
  { id: 16,   title: 'Peter Pan', author: 'Barrie, J. M.', year: 1904 },
  { id: 1952, title: 'The Yellow Wallpaper', author: 'Gilman, Charlotte Perkins', year: 1892 },
  { id: 23,   title: 'Narrative of the Life of Frederick Douglass', author: 'Douglass, Frederick', year: 1845 },
  { id: 2500, title: 'Siddhartha', author: 'Hesse, Hermann', year: 1922 },
  { id: 1080, title: 'A Modest Proposal', author: 'Swift, Jonathan', year: 1729 },
  { id: 1232, title: 'The Prince', author: 'Machiavelli, Niccolò', year: 1532 },
  { id: 2542, title: "A Doll's House", author: 'Ibsen, Henrik', year: 1879 },
  { id: 135,  title: 'Les Misérables', author: 'Hugo, Victor', year: 1862 },
  { id: 730,  title: 'Oliver Twist', author: 'Dickens, Charles', year: 1837 },
  { id: 158,  title: 'Emma', author: 'Austen, Jane', year: 1815 },
  { id: 105,  title: 'Persuasion', author: 'Austen, Jane', year: 1817 },
  { id: 161,  title: 'Sense and Sensibility', author: 'Austen, Jane', year: 1811 },
  { id: 1322, title: 'Leaves of Grass', author: 'Whitman, Walt', year: 1855 },
  { id: 1251, title: 'Le Morte d\'Arthur', author: 'Malory, Thomas', year: 1485 },
  { id: 2554, title: 'Crime and Punishment', author: 'Dostoevsky, Fyodor', year: 1866 },
  { id: 600,  title: 'Notes from the Underground', author: 'Dostoevsky, Fyodor', year: 1864 },
  { id: 2097, title: 'The Brothers Karamazov', author: 'Dostoevsky, Fyodor', year: 1880 },
  { id: 2600, title: 'War and Peace', author: 'Tolstoy, Leo', year: 1869 },
  { id: 1399, title: 'Anna Karenina', author: 'Tolstoy, Leo', year: 1877 },
  { id: 4300, title: 'Ulysses', author: 'Joyce, James', year: 1922 },
  { id: 61,   title: 'The Secret Garden', author: 'Burnett, Frances Hodgson', year: 1911 },
  { id: 45,   title: 'Anne of Green Gables', author: 'Montgomery, L. M.', year: 1908 },
  { id: 219,  title: 'Heart of Darkness', author: 'Conrad, Joseph', year: 1899 },
  { id: 35,   title: 'The Time Machine', author: 'Wells, H. G.', year: 1895 },
  { id: 36,   title: 'The War of the Worlds', author: 'Wells, H. G.', year: 1898 },
  { id: 5230, title: 'The Island of Doctor Moreau', author: 'Wells, H. G.', year: 1896 },
  { id: 1080, title: 'A Modest Proposal', author: 'Swift, Jonathan', year: 1729 },
  { id: 721,  title: "Gulliver's Travels", author: 'Swift, Jonathan', year: 1726 },
  { id: 2148, title: 'Don Quixote', author: 'Cervantes Saavedra, Miguel de', year: 1605 },
  { id: 1934, title: 'Around the World in Eighty Days', author: 'Verne, Jules', year: 1872 },
  { id: 103,  title: 'Twenty Thousand Leagues under the Sea', author: 'Verne, Jules', year: 1870 },
  { id: 83,   title: 'The Gospel of Matthew', author: 'Various', year: 0 },
  { id: 2413, title: 'The Great God Pan', author: 'Machen, Arthur', year: 1890 },
  { id: 526,  title: 'The Call of the Wild', author: 'London, Jack', year: 1903 },
  { id: 1327, title: 'The Sea-Wolf', author: 'London, Jack', year: 1904 },
  { id: 215,  title: 'White Fang', author: 'London, Jack', year: 1906 },
  { id: 1317, title: 'The Red Badge of Courage', author: 'Crane, Stephen', year: 1895 },
  { id: 863,  title: 'The Phantom of the Opera', author: 'Leroux, Gaston', year: 1910 },
  { id: 1998, title: 'Thus Spoke Zarathustra', author: 'Nietzsche, Friedrich', year: 1883 },
  { id: 4363, title: 'Beyond Good and Evil', author: 'Nietzsche, Friedrich', year: 1886 },
  { id: 2197, title: 'Meditations', author: 'Aurelius, Marcus', year: 180 },
  { id: 1497, title: 'The Republic', author: 'Plato', year: -380 },
  { id: 1728, title: 'The Odyssey', author: 'Homer', year: -800 },
  { id: 6130, title: 'The Iliad', author: 'Homer', year: -800 },
  { id: 2600, title: 'War and Peace', author: 'Tolstoy, Leo', year: 1869 },
  { id: 1064, title: 'The Importance of Being Earnest', author: 'Wilde, Oscar', year: 1895 },
  { id: 2852, title: 'The Hound of the Baskervilles', author: 'Doyle, Arthur Conan', year: 1902 },
  { id: 139,  title: 'The Jungle Book', author: 'Kipling, Rudyard', year: 1894 },
  { id: 160,  title: 'The Man Who Was Thursday', author: 'Chesterton, G. K.', year: 1908 },
  { id: 1268, title: 'Treasure Island', author: 'Stevenson, Robert Louis', year: 1882 },
  { id: 120,  title: 'Treasure Island', author: 'Stevenson, Robert Louis', year: 1882 },
  { id: 5765, title: 'A Room with a View', author: 'Forster, E. M.', year: 1908 },
  { id: 141,  title: 'Sense and Sensibility', author: 'Austen, Jane', year: 1811 },
  { id: 1155, title: 'The Brothers Karamazov', author: 'Dostoevsky, Fyodor', year: 1880 },
  { id: 4517, title: 'My Ántonia', author: 'Cather, Willa', year: 1918 },
  { id: 67,   title: 'The Scarlet Letter', author: 'Hawthorne, Nathaniel', year: 1850 },
  { id: 512,  title: 'The House of the Seven Gables', author: 'Hawthorne, Nathaniel', year: 1851 },
  { id: 1178, title: 'The Trial', author: 'Kafka, Franz', year: 1925 },
  { id: 7849, title: 'Anthem', author: 'Rand, Ayn', year: 1938 },
  { id: 41,   title: 'The Legend of Sleepy Hollow', author: 'Irving, Washington', year: 1820 },
  { id: 308,  title: 'Ethan Frome', author: 'Wharton, Edith', year: 1911 },
  { id: 6593, title: 'The House of Mirth', author: 'Wharton, Edith', year: 1905 },
  { id: 1232, title: 'The Prince', author: 'Machiavelli, Niccolò', year: 1532 },
  { id: 2591, title: "Grimms' Fairy Tales", author: 'Grimm, Jacob', year: 1812 },
  { id: 1007, title: "Aesop's Fables", author: 'Aesop', year: -600 },
  { id: 4085, title: 'The Arabian Nights', author: 'Anonymous', year: 1000 },
  { id: 3207, title: 'Leviathan', author: 'Hobbes, Thomas', year: 1651 },
  { id: 1250, title: 'The Art of War', author: 'Sunzi', year: -500 },
  { id: 2268, title: 'Tao Te Ching', author: 'Laozi', year: -400 },
  { id: 1404, title: 'The Divine Comedy', author: 'Alighieri, Dante', year: 1320 },
  { id: 2600, title: 'War and Peace', author: 'Tolstoy, Leo', year: 1869 },
  { id: 209,  title: 'The Turn of the Screw', author: 'James, Henry', year: 1898 },
  { id: 408,  title: 'The Awakening', author: 'Chopin, Kate', year: 1899 },
  { id: 1661, title: 'The Adventures of Sherlock Holmes', author: 'Doyle, Arthur Conan', year: 1892 },
  { id: 55,   title: 'The Wonderful Wizard of Oz', author: 'Baum, L. Frank', year: 1900 },
  { id: 996,  title: 'Don Quixote', author: 'Cervantes Saavedra, Miguel de', year: 1605 },
  { id: 3825, title: 'Walden', author: 'Thoreau, Henry David', year: 1854 },
  { id: 132,  title: 'The Art of War', author: 'Sunzi', year: -500 },
]

// 중복 제거
const unique = [...new Map(BOOKS.map(b => [b.id, b])).values()].slice(0, 100)

async function download(id) {
  return new Promise((resolve) => {
    const url = `https://gutenberg.pglaf.org/cache/epub/${id}/pg${id}.txt`
    const req = https.get(url, { headers: { 'User-Agent': 'ReadEng/1.0' } }, (res) => {
      if (res.statusCode !== 200) { resolve(false); res.destroy(); return }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        const outPath = path.join(__dirname, '..', 'public', 'books', `pg${id}.txt`)
        fs.writeFileSync(outPath, text, 'utf8')
        resolve(text.length)
      })
    })
    req.setTimeout(20000, () => { req.destroy(); resolve(false) })
    req.on('error', () => resolve(false))
  })
}

;(async () => {
  const dir = path.join(__dirname, '..', 'public', 'books')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const catalog = []
  let ok = 0, fail = 0

  for (const book of unique) {
    // 이미 다운로드된 파일은 스킵
    const outPath = path.join(dir, `pg${book.id}.txt`)
    if (fs.existsSync(outPath)) {
      const size = fs.statSync(outPath).size
      console.log(`  ✓ SKIP  pg${book.id} "${book.title}" (already ${Math.round(size/1024)}KB)`)
      catalog.push({ ...book, size })
      ok++
      continue
    }

    process.stdout.write(`  ↓ ${book.id.toString().padEnd(5)} "${book.title.slice(0,40)}"... `)
    const size = await download(book.id)
    if (size) {
      console.log(`${Math.round(size/1024)}KB ✓`)
      catalog.push({ ...book, size })
      ok++
    } else {
      console.log('FAIL ✗')
      fail++
    }
    await new Promise(r => setTimeout(r, 200)) // 서버 부하 방지
  }

  // catalog.json 저장
  fs.writeFileSync(
    path.join(dir, 'catalog.json'),
    JSON.stringify(catalog, null, 2),
    'utf8'
  )

  const totalMB = catalog.reduce((s, b) => s + b.size, 0) / 1024 / 1024
  console.log(`\n완료: ${ok}권 성공, ${fail}권 실패, 총 ${totalMB.toFixed(1)}MB`)
  console.log(`catalog.json → ${catalog.length}권`)
})()
