import { NextRequest, NextResponse } from 'next/server'
import { flash } from '@/lib/gemini'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const { word, sentence } = await req.json()
  if (!word) return NextResponse.json({ error: '단어 없음' }, { status: 400 })

  const prompt = `영어 단어 "${word}"를 아래 문장의 문맥에 맞게 한국어로 설명해줘.

문장: "${sentence}"

반드시 아래 JSON 형식만 반환 (설명 없이):
{
  "word": "${word}",
  "pronunciation": "발음 기호 (예: /wɜːrd/)",
  "meaning": "이 문맥에서의 뜻 (한국어, 1줄)",
  "example": "짧은 영어 예문 1개",
  "example_ko": "예문 한국어 번역"
}`

  try {
    const result = await flash.generateContent(prompt)
    const raw = result.response.text()
    const json = raw.match(/\{[\s\S]*\}/)
    if (!json) throw new Error('파싱 실패')
    return NextResponse.json(JSON.parse(json[0]))
  } catch {
    return NextResponse.json({ error: '단어 설명 실패' }, { status: 500 })
  }
}
