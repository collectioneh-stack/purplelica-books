/**
 * 한국어 전체 사전 번역 스크립트
 * 92권 모든 페이지를 번역해서 public/translations/ 에 저장
 *
 * 사용법:
 *   node scripts/pre-translate.js             # 전체 92권 전체 페이지
 *   node scripts/pre-translate.js --book 84   # 특정 책만
 *   node scripts/pre-translate.js --top 10    # 상위 10권만
 *
 * 재실행 안전: 이미 번역된 파일은 스킵합니다 (중단 후 이어서 가능)
 *
 * Gemini 무료 등급 제한:
 *   - 15 RPM (분당 15요청), 1,500 RPD (일일 1,500요청)
 *   - 전체 번역 시 ~5일 소요 (스크립트를 매일 실행하면 됨)
 *   - 유료 등급 사용 시 ~30분 완료
 */
const fs = require('fs')
const path = require('path')
const { GoogleGenerativeAI } = require('@google/generative-ai')

// .env.local에서 API 키 로드
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, v] = line.split('=')
    if (k && v) process.env[k.trim()] = v.trim()
  })
}

const WORDS_PER_PAGE = 1200
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const TRANSLATIONS_DIR = path.join(__dirname, '..', 'public', 'translations')
const BOOKS_DIR = path.join(__dirname, '..', 'public', 'books')

// 무료 등급: 15 RPM → 요청 사이 4초 대기 (여유 있게)
// 유료 등급 사용 시 DELAY_MS = 100 으로 줄이면 됨
const DELAY_MS = 4500

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env.local')
  process.exit(1)
}

// ── 페이지 분할 (frontend와 완전히 동일한 알고리즘) ───────────────────
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

// ── Gemini SDK 초기화 (앱과 동일한 방식) ────────────────────────────
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
// 사전 번역엔 1.5-flash 사용 (무료 1,500 RPD)
// 2.5-flash는 무료 등급 20 RPD로 사전 번역에 부적합
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

// ── Gemini API 호출 (1 페이지 전체를 1번의 요청으로) ───────────────────
async function translatePage(paragraphs) {
  const numbered = paragraphs.map((t, idx) => `[${idx}] ${t}`).join('\n\n')
  const prompt = `Translate each English paragraph below into natural Korean.
Reply ONLY with a JSON array of strings. No explanation, no markdown, no extra text.
The array must have exactly ${paragraphs.length} elements in order.

Example format: ["번역1", "번역2", "번역3"]

English paragraphs:
${numbered}`

  const result = await model.generateContent(prompt)
  const raw = result.response.text().trim()

  const match = raw.match(/\[[\s\S]*\]/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed)) {
        const padded = [...parsed]
        while (padded.length < paragraphs.length) padded.push('')
        return padded.slice(0, paragraphs.length).map(String)
      }
    } catch {}
  }
  return paragraphs.map(() => '')
}

// ── 단일 책 전체 번역 ─────────────────────────────────────────────────
async function translateBook(book) {
  const txtPath = path.join(BOOKS_DIR, `pg${book.id}.txt`)
  if (!fs.existsSync(txtPath)) {
    console.log(`  ⚠ pg${book.id}.txt 없음 — 스킵`)
    return { done: 0, skip: 0, fail: 0 }
  }

  const text = fs.readFileSync(txtPath, 'utf8')
  const pages = splitIntoPages(text)
  const bookDir = path.join(TRANSLATIONS_DIR, `pg${book.id}`)
  if (!fs.existsSync(bookDir)) fs.mkdirSync(bookDir, { recursive: true })

  let done = 0, skip = 0, fail = 0

  for (let i = 0; i < pages.length; i++) {
    const outPath = path.join(bookDir, `p${i + 1}.json`)
    if (fs.existsSync(outPath)) {
      skip++
      continue
    }

    const pageNum = `p${i + 1}/${pages.length}`
    process.stdout.write(`  ${pageNum} `)

    let retries = 2
    while (retries >= 0) {
      try {
        const translations = await translatePage(pages[i])
        fs.writeFileSync(outPath, JSON.stringify(translations), 'utf8')
        process.stdout.write('✓  ')
        done++
        break
      } catch (e) {
        if (retries > 0 && e.message.includes('429')) {
          // Rate limit — 더 오래 기다림
          process.stdout.write('⏳ ')
          await new Promise(r => setTimeout(r, 10000))
        } else if (retries > 0) {
          process.stdout.write('↺ ')
          await new Promise(r => setTimeout(r, 2000))
        } else {
          process.stdout.write(`✗(${e.message.slice(0, 20)})  `)
          fail++
        }
        retries--
      }
    }

    if (done % 5 === 0) process.stdout.write('\n  ')
    await new Promise(r => setTimeout(r, DELAY_MS))
  }

  process.stdout.write('\n')
  return { done, skip, fail, total: pages.length }
}

// ── 메인 ─────────────────────────────────────────────────────────────
;(async () => {
  const args = process.argv.slice(2)
  const bookIdx = args.indexOf('--book')
  const topIdx = args.indexOf('--top')
  const specificBookId = bookIdx !== -1 ? Number(args[bookIdx + 1]) : null
  const topN = topIdx !== -1 ? Number(args[topIdx + 1]) : null

  const catalogPath = path.join(BOOKS_DIR, 'catalog.json')
  if (!fs.existsSync(catalogPath)) {
    console.error('❌ catalog.json 없음. 먼저 download-books.js 실행')
    process.exit(1)
  }
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))
  if (!fs.existsSync(TRANSLATIONS_DIR)) fs.mkdirSync(TRANSLATIONS_DIR, { recursive: true })

  // 인기 순위 (수동 설정)
  const PRIORITY_IDS = [84, 1342, 11, 1661, 98, 2701, 174, 345, 76, 46, 1260, 5200, 74, 43, 514, 1184, 2814, 244, 16, 1952]

  let targets
  if (specificBookId) {
    targets = catalog.filter(b => b.id === specificBookId)
  } else if (topN) {
    const priorityTargets = PRIORITY_IDS
      .slice(0, topN)
      .map(id => catalog.find(b => b.id === id))
      .filter(Boolean)
    const rest = catalog.filter(b => !PRIORITY_IDS.includes(b.id))
    targets = [...priorityTargets, ...rest].slice(0, topN)
  } else {
    // 전체: 인기 우선 정렬
    const priorityTargets = PRIORITY_IDS.map(id => catalog.find(b => b.id === id)).filter(Boolean)
    const rest = catalog.filter(b => !PRIORITY_IDS.includes(b.id))
    targets = [...priorityTargets, ...rest]
  }

  // 진행 상황 통계
  let totalDone = 0, totalSkip = 0, totalFail = 0

  // 이미 완료된 책 체크
  const alreadyComplete = targets.filter(book => {
    const bookDir = path.join(TRANSLATIONS_DIR, `pg${book.id}`)
    if (!fs.existsSync(bookDir)) return false
    const txtPath = path.join(BOOKS_DIR, `pg${book.id}.txt`)
    if (!fs.existsSync(txtPath)) return false
    const text = fs.readFileSync(txtPath, 'utf8')
    const pages = splitIntoPages(text)
    const existing = fs.readdirSync(bookDir).filter(f => f.startsWith('p') && f.endsWith('.json')).length
    return existing >= pages.length
  })

  const remaining = targets.filter(b => !alreadyComplete.includes(b))

  console.log(`\n한국어 전체 사전 번역`)
  console.log(`  전체: ${targets.length}권`)
  console.log(`  완료: ${alreadyComplete.length}권`)
  console.log(`  남은: ${remaining.length}권`)
  console.log(`  API 딜레이: ${DELAY_MS}ms/페이지 (무료등급 기준)`)
  console.log(`\n※ Ctrl+C로 중단해도 진행 상황이 저장됩니다.\n`)

  for (const book of remaining) {
    console.log(`📖 ${book.title} (pg${book.id})`)
    const stats = await translateBook(book)
    totalDone += stats.done
    totalSkip += stats.skip
    totalFail += stats.fail
    console.log(`  → 완료 ${stats.done} / 스킵 ${stats.skip} / 실패 ${stats.fail} (전체 ${stats.total}페이지)`)
  }

  // 용량 확인
  let totalBytes = 0
  function calcSize(dir) {
    if (!fs.existsSync(dir)) return
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f)
      if (fs.statSync(p).isDirectory()) calcSize(p)
      else totalBytes += fs.statSync(p).size
    }
  }
  calcSize(TRANSLATIONS_DIR)

  console.log(`\n✅ 완료!`)
  console.log(`  번역 저장 위치: public/translations/`)
  console.log(`  총 용량: ${(totalBytes / 1024 / 1024).toFixed(1)}MB`)
  console.log(`\n다음 단계:`)
  console.log(`  git add public/translations/`)
  console.log(`  git commit -m "feat: 한국어 전체 번역 번들"`)
  console.log(`  (그 다음 Vercel에 배포)`)
})()
