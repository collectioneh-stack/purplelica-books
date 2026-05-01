import { NextRequest, NextResponse } from 'next/server'
import { flash } from '@/lib/gemini'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { texts } = await req.json()
  if (!Array.isArray(texts) || texts.length === 0) {
    return NextResponse.json({ translations: [] })
  }

  // 클라이언트가 CDN(/translations/pg*/p*.json) 먼저 체크 후 실패 시에만 이 API 호출됨
  // → 여기서는 순수 Gemini 번역만 처리
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
      allTranslations.push(...chunk.map(() => ''))
    } catch {
      allTranslations.push(...chunk.map(() => ''))
    }
  }

  return NextResponse.json({ translations: allTranslations })
}
