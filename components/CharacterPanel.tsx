'use client'

import { useEffect, useState } from 'react'
import type { Character, Relationship } from '@/lib/types'
import { getMemo, saveMemo } from '@/lib/storage'

interface CharacterPanelProps {
  character: Character
  relationships: Relationship[]
  allCharacters: Character[]
  bookId: string
  onClose: () => void
}

const ROLE_LABEL: Record<string, string> = {
  protagonist: '주인공',
  supporting: '조연',
  antagonist: '적대자',
  minor: '단역',
}

const ROLE_COLOR: Record<string, string> = {
  protagonist: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  supporting: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  antagonist: 'bg-red-500/20 text-red-400 border-red-500/30',
  minor: 'bg-stone-500/20 text-stone-400 border-stone-500/30',
}

export default function CharacterPanel({
  character, relationships, allCharacters, bookId, onClose,
}: CharacterPanelProps) {
  const [memo, setMemo] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setMemo(getMemo(bookId, character.id))
    setSaved(false)
  }, [bookId, character.id])

  const handleSave = () => {
    saveMemo(bookId, character.id, memo)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const relatedLinks = relationships.filter(
    (r) => r.from === character.id || r.to === character.id
  )

  const getOtherCharacter = (rel: Relationship) => {
    const otherId = rel.from === character.id ? rel.to : rel.from
    return allCharacters.find((c) => c.id === otherId)
  }

  return (
    <div className="w-72 h-full flex flex-col bg-stone-900 border-l border-stone-800">
      {/* 헤더 */}
      <div className="px-5 pt-5 pb-4 border-b border-stone-800">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${ROLE_COLOR[character.role]}`}>
              {ROLE_LABEL[character.role]}
            </span>
            <h2 className="text-white font-bold text-xl">{character.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-stone-600 hover:text-stone-300 text-lg mt-1 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* AI 분석 */}
        <div className="px-5 py-4 border-b border-stone-800">
          <div className="text-stone-500 text-xs font-medium uppercase tracking-wider mb-2">AI 분석</div>
          <p className="text-stone-300 text-sm leading-relaxed">{character.description}</p>
        </div>

        {/* 관계 목록 */}
        {relatedLinks.length > 0 && (
          <div className="px-5 py-4 border-b border-stone-800">
            <div className="text-stone-500 text-xs font-medium uppercase tracking-wider mb-3">
              관계 <span className="text-stone-600">({relatedLinks.length})</span>
            </div>
            <div className="space-y-2">
              {relatedLinks.map((rel, i) => {
                const other = getOtherCharacter(rel)
                if (!other) return null
                return (
                  <div key={i} className="rounded-xl bg-stone-800/60 px-3 py-2.5 border border-stone-700/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-semibold">{other.name}</span>
                      <span className="text-xs text-stone-500 bg-stone-700 px-2 py-0.5 rounded-full">{rel.type}</span>
                    </div>
                    <p className="text-stone-400 text-xs leading-relaxed">{rel.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 메모 */}
        <div className="px-5 py-4">
          <div className="text-stone-500 text-xs font-medium uppercase tracking-wider mb-3">내 메모</div>
          <textarea
            value={memo}
            onChange={(e) => { setMemo(e.target.value); setSaved(false) }}
            placeholder="이 인물에 대한 생각을 적어보세요..."
            rows={5}
            className="w-full bg-stone-800 text-white text-sm rounded-xl px-3.5 py-3 outline-none focus:ring-1 focus:ring-amber-500/50 border border-stone-700 placeholder:text-stone-600 resize-none leading-relaxed transition-all"
          />
          <button
            onClick={handleSave}
            className={`mt-2.5 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              saved
                ? 'bg-green-900/50 text-green-400 border border-green-700'
                : 'bg-amber-500 hover:bg-amber-400 text-stone-900'
            }`}
          >
            {saved ? '저장 완료 ✓' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
