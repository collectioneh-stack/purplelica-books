import { NextRequest, NextResponse } from 'next/server'
import { flash } from '@/lib/gemini'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const { text } = await req.json()
  if (!text) return NextResponse.json({ error: '텍스트 없음' }, { status: 400 })

  const prompt = `아래 영어 문장을 자연스러운 한국어로 번역해줘. 번역문만 반환하고 설명은 하지 마.

"${text}"`

  try {
    const result = await flash.generateContent(prompt)
    return NextResponse.json({ translation: result.response.text().trim() })
  } catch {
    return NextResponse.json({ error: '번역 실패' }, { status: 500 })
  }
}
