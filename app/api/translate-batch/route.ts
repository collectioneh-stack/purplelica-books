import { NextRequest, NextResponse } from 'next/server'
import { flash } from '@/lib/gemini'
import { readFileSync } from 'fs'
import { join } from 'path'

export const maxDuration = 60

// 사전 번역 파일 확인 (public/translations/pg{id}/p{page}.json)
function getPreTranslated(bookId: string, page: number): string[] | null {
  if (!bookId || !page) return null
  // bookId 형식: "gutenberg_84" → "pg84"
  const match = bookId.match(/gutenberg_(\d+)/)
  if (!match) return null
  const filePath = join(process.cwd(), 'public', 'translations', `pg${match[1]}`, `p${page}.json`)
  try {
    const raw = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const { texts, bookId, page } = await req.json()
  if (!Array.isArray(texts) || texts.length === 0) {
    return NextResponse.json({ translations: [] })
  }

  // 사전 번역 파일 확인 (즉시 응답, Gemini API 불필요)
  if (bookId && page) {
    const preTranslated = getPreTranslated(bookId, page)
    if (preTranslated && preTranslated.length === texts.length) {
      return NextResponse.json({ translations: preTranslated, cached: true })
    }
  }

  // 사전 번역 없음 → Gemini API 호출
  const CHUNK = 4
  const allTranslations: string[] = []

  for (let i = 0; i < texts.length; i += CHUNK) {
    const chunk = texts.slice(i, i + CHUNK)
    const numbered = chunk.map((t: string, idx: number) => `[${idx}] ${t}`).join('\n\n')

    const prompt = `Translate each English paragraph below into natural Korean.
Reply ONLY with a JSON array of strings. No explanation, no markdown, no extra text.
The array must have exactly ${chunk.length} elements in order.

Example format: ["번역1", "번역2"]

English paragraphs:
${numbered}`

    try {
      const result = await flash.generateContent(prompt)
      const raw = result.response.text().trim()
      const match = raw.match(/\[[\s\S]*?\]/)
      if (match) {
        const parsed = JSON.parse(match[0])
        if (Array.isArray(parsed)) {
          allTranslations.push(...parsed.map(String))
          continue
        }
      }
      allTranslations.push(...chunk.map(() => '번역 실패'))
    } catch {
      allTranslations.push(...chunk.map(() => '번역 실패'))
    }
  }

  return NextResponse.json({ translations: allTranslations })
}
