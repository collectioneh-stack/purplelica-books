import { NextRequest, NextResponse } from 'next/server'
import { FALLBACK_BOOKS } from '@/lib/fallback-books'

const BASE = 'https://gutendex.com/'

// /api/gutenberg?path=/books&search=...&sort=...&languages=en&page=1
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path') ?? '/books'
  const isListRequest = path === '/books' || path === '/books/'

  const upstream = new URLSearchParams()
  searchParams.forEach((v, k) => {
    if (k !== 'path') upstream.set(k, v)
  })

  const cleanPath = path.replace(/^\//, '').replace(/\/?$/, '/')
  const upstreamUrl = `${BASE}${cleanPath}?${upstream}`

  // 목록 요청: gutendex 3초 내 응답 없으면 즉시 폴백 반환 (기다리지 않음)
  if (isListRequest && !upstream.get('search')) {
    try {
      const res = await fetch(upstreamUrl, {
        headers: { 'User-Agent': 'ReadEng/1.0' },
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(3000),
      })
      if (!res.ok) throw new Error(`upstream ${res.status}`)
      const data = await res.json()
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({
        count: FALLBACK_BOOKS.length,
        next: null,
        previous: null,
        results: FALLBACK_BOOKS,
        _fallback: true,
      })
    }
  }

  // 단건 조회 / 검색: 8초 타임아웃
  try {
    const res = await fetch(upstreamUrl, {
      headers: { 'User-Agent': 'ReadEng/1.0' },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: '책 정보 로드 실패 — 잠시 후 다시 시도해주세요' },
      { status: 502 }
    )
  }
}
