import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

// Vercel에 번들된 책 — 외부 fetch 없이 즉시 응답
// public/books/pg{id}.txt 형식으로 저장
function getLocalBook(url: string): string | null {
  const match = url.match(/\/(\d+)\/pg\1\.txt/)
  if (!match) return null
  try {
    const filePath = join(process.cwd(), 'public', 'books', `pg${match[1]}.txt`)
    return readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
}

// www.gutenberg.org → 빠른 PGLAF 미러로 교체
// 실측: www.gutenberg.org ~5초 vs gutenberg.pglaf.org ~600ms
function toFastMirror(url: string): string {
  return url.replace('https://www.gutenberg.org', 'https://gutenberg.pglaf.org')
            .replace('http://www.gutenberg.org', 'https://gutenberg.pglaf.org')
}

// /api/book-text?url=https://...
export async function GET(req: NextRequest) {
  const rawUrl = new URL(req.url).searchParams.get('url')
  if (!rawUrl) return NextResponse.json({ error: 'url 파라미터 필요' }, { status: 400 })

  // 로컬 번들 파일 우선 확인 (즉시 응답, 외부 요청 없음)
  const localText = getLocalBook(rawUrl)
  if (localText) {
    return new NextResponse(localText, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }

  // gutenberg 도메인만 허용
  const allowed = ['gutenberg.org', 'gutendex.com', 'aleph.gutenberg.org']
  const isAllowed = allowed.some((d) => rawUrl.includes(d))
  if (!isAllowed) return NextResponse.json({ error: '허용되지 않은 도메인' }, { status: 403 })

  const mirrorUrl = toFastMirror(rawUrl)

  // 1차 시도: 빠른 미러
  const tryFetch = async (url: string) => {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ReadEng/1.0' },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`${res.status}`)
    return res.text()
  }

  try {
    let text: string
    try {
      text = await tryFetch(mirrorUrl)
    } catch {
      // 미러 실패 시 원본 URL로 폴백
      text = await tryFetch(rawUrl)
    }
    return new NextResponse(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: '본문 로드 실패' }, { status: 502 })
  }
}
