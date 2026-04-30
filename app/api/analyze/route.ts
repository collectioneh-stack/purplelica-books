import { NextRequest, NextResponse } from 'next/server'
import { flash } from '@/lib/gemini'
import type { BookAnalysis } from '@/lib/types'

export const maxDuration = 60

const PROMPT = `당신은 소설 분석 전문가입니다.
입력이 영어여도 모든 출력은 반드시 한국어로 작성하세요.
영어 인물 이름은 한국어 음역으로 표기하세요 (예: Sherlock Holmes → 셜록 홈즈).

소설 텍스트를 분석해서 아래 JSON만 반환하세요 (설명 없이):
{
  "title": "소설 제목 (한국어)",
  "protagonist": "주인공 이름 (한국어)",
  "characters": [
    { "id": "c0", "name": "이름", "role": "protagonist|supporting|antagonist|minor", "description": "설명 1~2문장 (한국어)" }
  ],
  "relationships": [
    { "from": "c0", "to": "c1", "type": "관계유형", "label": "설명 15자 이내", "strength": 0.8 }
  ]
}
기준: 주인공 id=c0, 인물 5~15명, 모든 인물간 관계 포함, strength 0.3~1.0`

function chunk(text: string, max = 80000) {
  return text.length > max ? text.slice(0, max) : text
}

export async function POST(req: NextRequest) {
  const { text } = await req.json()
  if (!text) return NextResponse.json({ error: '텍스트 없음' }, { status: 400 })

  try {
    const result = await flash.generateContent(`${PROMPT}\n\n텍스트:\n${chunk(text)}`)
    const raw = result.response.text()
    const json = raw.match(/\{[\s\S]*\}/)
    if (!json) throw new Error('파싱 실패')
    const analysis: BookAnalysis = JSON.parse(json[0])
    return NextResponse.json(analysis)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '분석 실패' }, { status: 500 })
  }
}
