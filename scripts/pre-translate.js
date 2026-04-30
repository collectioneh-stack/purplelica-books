/**
 * 한국어 사전 번역 스크립트
 * 인기 책들의 첫 몇 페이지를 미리 번역해서 public/translations/ 에 저장
 *
 * 사용법: node scripts/pre-translate.js [--all] [--book 84] [--pages 5]
 * --all     : 전체 92권 첫 3페이지 번역
 * --book ID : 특정 책만 번역
 * --pages N : 각 책에서 N 페이지 번역 (기본값 3)
 */
const https = require('https')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const WORDS_PER_PAGE = 1200
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const TRANSLATIONS_DIR = path.join(__dirname, '..', 'public', 'translations')
const BOOKS_DIR = path.join(__dirname, '..', 'public', 'books')

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env.local')
  process.exit(1)
}

// ── 텍스트 → 페이지 분할 (frontend와 동일한 알고리즘) ──────────────────
function splitIntoPages(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(p => p.length > 30)

  const pages = []
  let current = []
  let wordCount = 0

  for (const para of paragraphs) {
    const words = para.split(/\s+/).length
    if (wordCount + words > WORDS_PER_PAGE && current.length > 0) {
      pages.push(current)
      current = [para]
      wordCount = words
    } else {
      current.push(para)
      wordCount += words
    }
  }
  if (current.length > 0) pages.push(current)
  return pages
}

// ── Gemini Flash API 호출 ──────────────────────────────────────────────
async function translateParagraphs(paragraphs) {
  const CHUNK = 4
  const allTranslations = []

  for (let i = 0; i < paragraphs.length; i += CHUNK) {
    const chunk = paragraphs.slice(i, i + CHUNK)
    const numbered = chunk.map((t, idx) => `[${idx}] ${t}`).join('\n\n')

    const prompt = `Translate each English paragraph below into natural Korean.
Reply ONLY with a JSON array of strings. No explanation, no markdown, no extra text.
The array must have exactly ${chunk.length} elements in order.

Example format: ["번역1", "번역2"]

English paragraphs:
${numbered}`

    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 }
    })

    const result = await new Promise((resolve, reject) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`
      const req = https.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }, (res) => {
        let data = ''
        res.on('data', c => data += c)
        res.on('end', () => {
          try { resolve(JSON.parse(data)) } catch { reject(new Error('parse error')) }
        })
      })
      req.on('error', reject)
      req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')) })
      req.write(body)
      req.end()
    })

    const raw = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    const match = raw.match(/\[[\s\S]*?\]/)
    if (match) {
      try {
        const parsed = JSON.parse(match[0])
        if (Array.isArray(parsed)) { allTranslations.push(...parsed.map(String)); continue }
      } catch {}
    }
    allTranslations.push(...chunk.map(() => ''))

    // Rate limit: 15 RPM on free tier → 4초 대기
    await new Promise(r => setTimeout(r, 4000))
  }

  return allTranslations
}

// ── 단일 책 번역 ──────────────────────────────────────────────────────
async function translateBook(book, maxPages) {
  const txtPath = path.join(BOOKS_DIR, `pg${book.id}.txt`)
  if (!fs.existsSync(txtPath)) {
    console.log(`  ⚠ pg${book.id}.txt 없음 — 스킵`)
    return
  }

  const text = fs.readFileSync(txtPath, 'utf8')
  const pages = splitIntoPages(text)
  const count = Math.min(maxPages, pages.length)

  const bookDir = path.join(TRANSLATIONS_DIR, `pg${book.id}`)
  if (!fs.existsSync(bookDir)) fs.mkdirSync(bookDir, { recursive: true })

  for (let i = 0; i < count; i++) {
    const outPath = path.join(bookDir, `p${i + 1}.json`)
    if (fs.existsSync(outPath)) {
      console.log(`    ✓ 캐시 p${i + 1}`)
      continue
    }

    process.stdout.write(`    번역 중 p${i + 1}/${count}... `)
    try {
      const translations = await translateParagraphs(pages[i])
      fs.writeFileSync(outPath, JSON.stringify(translations, null, 2), 'utf8')
      console.log('✓')
    } catch (e) {
      console.log(`실패: ${e.message}`)
    }
  }
}

// ── 메인 ──────────────────────────────────────────────────────────────
;(async () => {
  const args = process.argv.slice(2)
  const all = args.includes('--all')
  const bookIdx = args.indexOf('--book')
  const pagesIdx = args.indexOf('--pages')
  const specificBookId = bookIdx !== -1 ? Number(args[bookIdx + 1]) : null
  const maxPages = pagesIdx !== -1 ? Number(args[pagesIdx + 1]) : 3

  const catalogPath = path.join(BOOKS_DIR, 'catalog.json')
  if (!fs.existsSync(catalogPath)) {
    console.error('❌ catalog.json 없음. 먼저 download-books.js 실행')
    process.exit(1)
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))

  if (!fs.existsSync(TRANSLATIONS_DIR)) fs.mkdirSync(TRANSLATIONS_DIR, { recursive: true })

  // 인기 순위 상위 책 목록 (번역 우선순위)
  const TOP_BOOKS = [84, 1342, 11, 1661, 98, 2701, 174, 345, 76, 46, 1260, 5200, 74, 43, 514]

  let targets
  if (specificBookId) {
    targets = catalog.filter(b => b.id === specificBookId)
  } else if (all) {
    targets = catalog
  } else {
    // 기본: 상위 15권만
    targets = TOP_BOOKS
      .map(id => catalog.find(b => b.id === id))
      .filter(Boolean)
  }

  console.log(`\n한국어 사전 번역 시작 — ${targets.length}권 × 최대 ${maxPages}페이지\n`)

  for (const book of targets) {
    console.log(`📖 ${book.title} (pg${book.id})`)
    await translateBook(book, maxPages)
  }

  console.log('\n✅ 완료! public/translations/ 에 저장됨')
  console.log('이제 git add public/translations/ && git commit 후 배포하세요.')
})()
