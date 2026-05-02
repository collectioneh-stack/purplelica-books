/**
 * retranslate.js — 챕터 기반 새 페이지 구조로 번역 파일 재생성
 *
 * 사용법:
 *   node scripts/retranslate.js          # 전체 22권 재번역
 *   node scripts/retranslate.js 84       # pg84 (Frankenstein) 만
 *   node scripts/retranslate.js 84 1342  # 여러 권 지정
 *
 * 번역 API: Google Translate (비공식 무료 엔드포인트, API key 불필요)
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

// ─── 대상 책 목록 ─────────────────────────────────────────────────────────────
const ALL_BOOKS = [11, 16, 35, 41, 43, 46, 84, 103, 219, 345, 526, 721,
                   1064, 1080, 1342, 1661, 1934, 1952, 2500, 2542, 2701, 5200]

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const MAX_WORDS_PER_PAGE = 600
const CHAPTER_RE = /^(CHAPTER|Chapter|PART|Part|BOOK|Book|ACT|Act|SECTION|Section|PROLOGUE|Prologue|EPILOGUE|Epilogue|PREFACE|Preface|INTRODUCTION|Introduction|VOLUME|Volume)\b/
const TRANSLATIONS_DIR = path.join(__dirname, '../public/translations')
const DELAY_MS = 500  // 번역 요청 간 딜레이 (API 과부하 방지)

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function wordCount(text) {
  return text.split(/\s+/).length
}

// ─── 구텐베르크 텍스트 다운로드 ───────────────────────────────────────────────
function fetchText(pgId) {
  const urls = [
    `https://www.gutenberg.org/cache/epub/${pgId}/pg${pgId}.txt`,
    `https://www.gutenberg.org/files/${pgId}/${pgId}-0.txt`,
    `https://www.gutenberg.org/files/${pgId}/${pgId}.txt`,
  ]

  function tryUrl(idx) {
    if (idx >= urls.length) return Promise.reject(new Error(`pg${pgId}: 텍스트 다운로드 실패`))
    return new Promise((resolve, reject) => {
      https.get(urls[idx], { headers: { 'User-Agent': 'BookmapBot/1.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location
          https.get(loc, { headers: { 'User-Agent': 'BookmapBot/1.0' } }, (r2) => {
            if (r2.statusCode !== 200) { r2.resume(); return tryUrl(idx + 1).then(resolve).catch(reject) }
            let data = ''
            r2.on('data', c => data += c)
            r2.on('end', () => resolve(data))
          }).on('error', () => tryUrl(idx + 1).then(resolve).catch(reject))
          return
        }
        if (res.statusCode !== 200) { res.resume(); return tryUrl(idx + 1).then(resolve).catch(reject) }
        let data = ''
        res.on('data', c => data += c)
        res.on('end', () => resolve(data))
      }).on('error', () => tryUrl(idx + 1).then(resolve).catch(reject))
    })
  }
  return tryUrl(0)
}

// ─── 구텐베르크 헤더/푸터 제거 ────────────────────────────────────────────────
function stripWrapper(text) {
  const startRe = /\*{3}\s*START OF [^\n]+\n/i
  const startMatch = text.match(startRe)
  let content = text
  if (startMatch && startMatch.index !== undefined) {
    content = text.slice(startMatch.index + startMatch[0].length)
  }
  const endRe = /\*{3}\s*END OF [^\n]+/i
  const endIdx = content.search(endRe)
  if (endIdx !== -1) content = content.slice(0, endIdx)
  return content
}

// ─── 챕터 기반 페이지 분할 ────────────────────────────────────────────────────
function splitIntoChapterPages(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const stripped = stripWrapper(normalized)

  const allBlocks = stripped
    .split(/\n{2,}/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(p => p.length > 0)

  // 챕터별 그룹핑
  const chapters = []
  let current = { title: null, blocks: [] }

  for (const block of allBlocks) {
    if (CHAPTER_RE.test(block.trim()) && block.length < 200) {
      if (current.blocks.length > 0 || current.title !== null) {
        chapters.push(current)
      }
      current = { title: block.trim(), blocks: [] }
    } else if (block.length > 20) {
      current.blocks.push(block)
    }
  }
  if (current.blocks.length > 0 || current.title !== null) chapters.push(current)

  // 챕터 없으면 단어 수 기준 분할
  if (chapters.length === 0 || (chapters.length === 1 && chapters[0].title === null)) {
    return wordCountSplit(allBlocks.filter(b => b.length > 20))
  }

  const pages = []
  for (const chapter of chapters) {
    if (chapter.blocks.length === 0) continue
    pages.push(...wordCountSplit(chapter.blocks))
  }
  return pages
}

function wordCountSplit(blocks) {
  const pages = []
  let current = []
  let wc = 0

  for (const block of blocks) {
    const w = wordCount(block)
    if (wc + w > MAX_WORDS_PER_PAGE && current.length > 0) {
      pages.push(current)
      current = [block]
      wc = w
    } else {
      current.push(block)
      wc += w
    }
  }
  if (current.length > 0) pages.push(current)
  return pages
}

// ─── Google Translate (비공식 무료 API) ───────────────────────────────────────
function translateText(text) {
  const encoded = encodeURIComponent(text)
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encoded}`

  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          const translated = parsed[0]
            .filter(Boolean)
            .map(part => part[0])
            .join('')
          resolve(translated)
        } catch {
          reject(new Error('번역 파싱 실패'))
        }
      })
    }).on('error', reject)
  })
}

// ─── 단일 책 번역 ─────────────────────────────────────────────────────────────
async function translateBook(pgId) {
  console.log(`\n📖 pg${pgId} 시작...`)

  // 텍스트 다운로드
  let text
  try {
    text = await fetchText(pgId)
    console.log(`  ✓ 텍스트 다운로드 (${Math.round(text.length / 1024)}KB)`)
  } catch (e) {
    console.error(`  ✗ 다운로드 실패: ${e.message}`)
    return
  }

  // 페이지 분할
  const pages = splitIntoChapterPages(text)
  console.log(`  ✓ 페이지 분할: ${pages.length}페이지`)

  // 출력 디렉토리 준비
  const outDir = path.join(TRANSLATIONS_DIR, `pg${pgId}`)
  fs.mkdirSync(outDir, { recursive: true })

  // 기존 파일 제거 (구 구조)
  const existing = fs.readdirSync(outDir).filter(f => f.startsWith('p') && f.endsWith('.json'))
  for (const f of existing) fs.unlinkSync(path.join(outDir, f))

  // 각 페이지 번역
  let successCount = 0
  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1
    const paragraphs = pages[i]
    const outFile = path.join(outDir, `p${pageNum}.json`)

    process.stdout.write(`  p${pageNum}/${pages.length} 번역 중...`)

    const translations = []
    let pageOk = true

    for (const para of paragraphs) {
      try {
        await sleep(DELAY_MS)
        const translated = await translateText(para)
        translations.push(translated)
      } catch (e) {
        console.error(`\n  ✗ 번역 실패 (p${pageNum}): ${e.message}`)
        translations.push('')
        pageOk = false
      }
    }

    fs.writeFileSync(outFile, JSON.stringify(translations, null, 2), 'utf8')
    if (pageOk) {
      process.stdout.write(` ✓\n`)
      successCount++
    } else {
      process.stdout.write(` △ (일부 실패)\n`)
    }
  }

  console.log(`  완료: ${successCount}/${pages.length} 페이지 성공`)
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)
  const targets = args.length > 0
    ? args.map(Number).filter(n => !isNaN(n) && ALL_BOOKS.includes(n))
    : ALL_BOOKS

  if (targets.length === 0) {
    console.error('유효한 책 ID를 입력하세요. 지원 목록:', ALL_BOOKS.join(', '))
    process.exit(1)
  }

  console.log(`\n🔄 번역 재생성 시작 (${targets.length}권: ${targets.join(', ')})`)
  console.log(`📐 페이지 기준: 챕터별 + 최대 ${MAX_WORDS_PER_PAGE}단어/페이지`)

  for (const pgId of targets) {
    await translateBook(pgId)
  }

  console.log('\n✅ 전체 완료!')
}

main().catch(e => { console.error('오류:', e); process.exit(1) })
