import { NextRequest, NextResponse } from 'next/server'
import { flash } from '@/lib/gemini'

// 한글 검색어 → 영어 책 제목/작가명으로 번역
export async function POST(req: NextRequest) {
  const { query } = await req.json()
  if (!query) return NextResponse.json({ english: query })

  try {
    const prompt = `다음 검색어를 Project Gutenberg에서 검색할 수 있는 영어 책 제목이나 작가명으로 번역해주세요.
번역된 영어 단어/구문만 답하세요. 설명 없이 한 줄로만.

검색어: "${query}"`
    const result = await flash.generateContent(prompt)
    const english = result.response.text().trim().replace(/["']/g, '')
    return NextResponse.json({ english })
  } catch {
    return NextResponse.json({ english: query })
  }
}
