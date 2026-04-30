export interface Character {
  id: string
  name: string
  role: 'protagonist' | 'supporting' | 'antagonist' | 'minor'
  description: string
}

export interface Relationship {
  from: string
  to: string
  type: string
  label: string
  strength: number // 0~1
}

export interface BookAnalysis {
  title: string
  protagonist: string
  characters: Character[]
  relationships: Relationship[]
}

export interface CharacterMemo {
  characterId: string
  memo: string
  updatedAt: string
}
