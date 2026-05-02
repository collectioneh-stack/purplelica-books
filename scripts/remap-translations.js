/**
 * remap-translations.js — 기존 번역 파일을 새 챕터 기반 페이지 구조로 재배분
 *
 * 동작 방식:
 *   1. 기존 p1.json, p2.json... 을 순서대로 이어붙여 번역 flat 배열 생성
 *   2. 구텐베르크 원문을 새 알고리즘(챕터 기반 + 600단어)으로 분할
 *   3. 새 페이지 구조에 맞게 번역 배열 재배분
 *   4. 새 p1.json, p2.json... 저장
 *
 * 사용법:
 *   node scripts/remap-translations.js          # 전체 22권
 *   node scripts/remap-translations.js 84       # pg84만
 *   node scripts/remap-translations.js 84 1342  # 여러 권
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

// ─── 대상 책 목록 ─────────────────────────────────────────────────────────────
const ALL_BOOKS = [11, 16, 35, 41, 43, 46, 84, 103, 219, 345, 526, 721,
                   1064, 1080, 1342, 1661, 1934, 1952, 2500, 2542, 2701, 5200]

const MAX_WORDS_PER_PAGE = 600
const CHAPTER_RE = /^(CHAPTER|Chapter|PART|Part|BOOK|Book|ACT|Act|SECTION|Section|PROLOGUE|Prologue|EPILOGUE|Epilogue|PREFACE|Preface|INTRODUCTION|Introduction|VOLUME|Volume)\b/
const TRANSLATIONS_DIR = path.join(__dirname, '../public/translations')

// ─── 구텐베르크 텍스트 다운로드 ───────────────────────────────────────────────
function fetchText(pgId) {
  const urls = [
    `https://www.gutenberg.org/cache/epub/${pgId}/pg${pgId}.txt`,
    `https://www.gutenberg.org/files/${pgId}/${pgId}-0.txt`,
    `https://www.gutenberg.org/files/${pgId}/${pgId}.txt`,
  ]

  function tryUrl(idx) {
    if (idx >= urls.length) return Promise.reject(new Error(`pg${pgId}: 다운로드 실패`))
    return new Promise((resolve, reject) => {
      https.get(urls[idx], { headers: { 'User-Agent': 'BookmapBot/1.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          https.get(res.headers.location, { headers: { 'User-Agent': 'BookmapBot/1.0' } }, (r2) => {
            if (r2.statusCode !== 200) { r2.resume(); return tryUrl(idx + 1).then(resolve).catch(reject) }
            let d = ''; r2.on('data', c => d += c); r2.on('end', () => resolve(d))
          }).on('error', () => tryUrl(idx + 1).then(resolve).catch(reject))
          return
        }
        if (res.statusCode !== 200) { res.resume(); return tryUrl(idx + 1).then(resolve).catch(reject) }
        let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d))
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

// ─── 단어 수 기준 서브페이지 분할 ────────────────────────────────────────────
function wordCountSplit(blocks) {
  const pages = []
  let current = []
  let wc = 0
  for (const block of blocks) {
    const w = block.split(/\s+/).length
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

// ─── 챕터 기반 페이지 분할 ────────────────────────────────────────────────────
function splitIntoChapterPages(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const stripped = stripWrapper(normalized)

  const allBlocks = stripped
    .split(/\n{2,}/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(p => p.length > 0)

  const chapters = []
  let current = { title: null, blocks: [] }

  for (const block of allBlocks) {
    if (CHAPTER_RE.test(block.trim()) && block.length < 200) {
      if (current.blocks.length > 0 || current.title !== null) chapters.push(current)
      current = { title: block.trim(), blocks: [] }
    } else if (block.length > 20) {
      current.blocks.push(block)
    }
  }
  if (current.blocks.length > 0 || current.title !== null) chapters.push(current)

  if (chapters.length === 0 || (chapters.length === 1 && chapters[0].title === null)) {
    return { pages: wordCountSplit(allBlocks.filter(b => b.length > 20)), preChapterCount: 0 }
  }

  // pre-chapter 단락 수 계산 (flat 배열에서 skip할 개수)
  const nullChapter = chapters.find(c => c.title === null)
  const preChapterCount = nullChapter ? nullChapter.blocks.length : 0

  const pages = []
  for (const chapter of chapters) {
    if (chapter.title === null) continue  // page.tsx와 동일하게 pre-chapter 제외
    if (chapter.blocks.length === 0) continue
    pages.push(...wordCountSplit(chapter.blocks))
  }
  return { pages, preChapterCount }
}

// ─── 기존 번역 flat 배열 로드 (_backup/ 우선 사용 — 원본 보존) ─────────────────
function loadExistingTranslations(pgId) {
  const dir = path.join(TRANSLATIONS_DIR, `pg${pgId}`)
  if (!fs.existsSync(dir)) return null

  // _backup/ 이 있으면 원본 파일 우선 사용 (이전 리맵 오류 방지)
  const backupDir = path.join(dir, '_backup')
  const sourceDir = fs.existsSync(backupDir) ? backupDir : dir

  const files = fs.readdirSync(sourceDir)
    .filter(f => /^p\d+\.json$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0])
      const nb = parseInt(b.match(/\d+/)[0])
      return na - nb
    })

  if (files.length === 0) return null

  const flat = []
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(sourceDir, f), 'utf8'))
      if (Array.isArray(data)) flat.push(...data)
    } catch {
      // 파싱 실패 파일은 건너뜀
    }
  }

  if (sourceDir === backupDir) console.log(`  ✓ _backup/ 원본 로드 (총 ${flat.length}개)`)
  return flat
}

// ─── 단일 책 리맵핑 ───────────────────────────────────────────────────────────
async function remapBook(pgId) {
  console.log(`\n📖 pg${pgId} 리맵핑 시작...`)

  // 1. 기존 번역 flat 배열 로드
  const existingFlat = loadExistingTranslations(pgId)
  if (!existingFlat || existingFlat.length === 0) {
    console.log(`  ⚠ 기존 번역 파일 없음 — 건너뜀`)
    return
  }
  console.log(`  ✓ 기존 번역 로드: ${existingFlat.length}개 단락`)

  // 2. 원문 다운로드
  let text
  try {
    text = await fetchText(pgId)
    console.log(`  ✓ 원문 다운로드 (${Math.round(text.length / 1024)}KB)`)
  } catch (e) {
    console.error(`  ✗ 다운로드 실패: ${e.message}`)
    return
  }

  // 3. 새 알고리즘으로 페이지 분할 + pre-chapter 단락 수 계산
  const { pages: newPages, preChapterCount } = splitIntoChapterPages(text)
  const totalNewParas = newPages.reduce((s, p) => s + p.length, 0)
  console.log(`  ✓ 새 페이지 분할: ${newPages.length}페이지, ${totalNewParas}개 단락`)
  if (preChapterCount > 0) {
    console.log(`  ✓ pre-chapter 단락 ${preChapterCount}개 skip (flat 배열 오프셋 보정)`)
  }

  // 4. 단락 수 차이 체크 (pre-chapter 제외 후 비교)
  const effectiveFlat = existingFlat.slice(preChapterCount)
  const diff = totalNewParas - effectiveFlat.length
  if (Math.abs(diff) > effectiveFlat.length * 0.1) {
    console.warn(`  ⚠ 단락 수 차이 큼: 기존 ${effectiveFlat.length}개 → 새 ${totalNewParas}개 (${diff > 0 ? '+' : ''}${diff})`)
    console.warn(`    번역이 밀리거나 빈칸이 생길 수 있습니다.`)
  } else if (diff !== 0) {
    console.log(`  △ 단락 수 미세 차이: ${diff > 0 ? '+' : ''}${diff}개 (패딩/트림 처리)`)
  }

  // 5. 기존 번역을 새 페이지 구조에 재배분
  const outDir = path.join(TRANSLATIONS_DIR, `pg${pgId}`)

  // 백업 폴더 생성 (최초 1회만)
  const backupDir = path.join(outDir, '_backup')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
    const existingFiles = fs.readdirSync(outDir).filter(f => /^p\d+\.json$/.test(f))
    for (const f of existingFiles) {
      fs.copyFileSync(path.join(outDir, f), path.join(backupDir, f))
    }
    console.log(`  ✓ 기존 파일 백업: ${backupDir}`)
  }

  // 기존 파일 제거
  const oldFiles = fs.readdirSync(outDir).filter(f => /^p\d+\.json$/.test(f))
  for (const f of oldFiles) fs.unlinkSync(path.join(outDir, f))

  // 새 파일 저장 (pre-chapter skip 후 flat 인덱스 시작)
  let flatIdx = 0
  for (let i = 0; i < newPages.length; i++) {
    const pageParaCount = newPages[i].length
    const translations = []

    for (let j = 0; j < pageParaCount; j++) {
      translations.push(effectiveFlat[flatIdx] ?? '')
      flatIdx++
    }

    const outFile = path.join(outDir, `p${i + 1}.json`)
    fs.writeFileSync(outFile, JSON.stringify(translations, null, 2), 'utf8')
  }

  console.log(`  ✓ 리맵핑 완료: ${newPages.length}개 파일 생성`)
  if (flatIdx < effectiveFlat.length) {
    console.log(`  △ 사용 안 된 기존 번역: ${effectiveFlat.length - flatIdx}개 단락 (버림)`)
  }
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

  console.log(`\n🔄 번역 리맵핑 시작 (${targets.length}권: ${targets.join(', ')})`)
  console.log(`📐 새 기준: 챕터별 + 최대 ${MAX_WORDS_PER_PAGE}단어/페이지`)
  console.log(`💾 기존 번역 보존 (품질 유지), 페이지 경계만 재배분\n`)

  for (const pgId of targets) {
    await remapBook(pgId)
  }

  console.log('\n✅ 전체 완료!')
  console.log('📁 기존 파일은 각 _backup/ 폴더에 보존됩니다.')
}

main().catch(e => { console.error('오류:', e); process.exit(1) })
