import { NextRequest, NextResponse } from 'next/server'
import { flash } from '@/lib/gemini'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { texts } = await req.json()
  if (!Array.isArray(texts) || texts.length === 0) {
    return NextResponse.json({ translations: [] })
  }

  // 한 번에 너무 많으면 나눠서 처리 (Gemini 토큰 제한 방지)
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
      // JSON 배열 추출
      const match = raw.match(/\[[\s\S]*?\]/)
      if (match) {
        const parsed = JSON.parse(match[0])
        if (Array.isArray(parsed)) {
          allTranslations.push(...parsed.map(String))
          continue
        }
      }
      // 파싱 실패 시 빈 문자열로 채움
      allTranslations.push(...chunk.map(() => '번역 실패'))
    } catch {
      allTranslations.push(...chunk.map(() => '번역 실패'))
    }
  }

  return NextResponse.json({ translations: allTranslations })
}
