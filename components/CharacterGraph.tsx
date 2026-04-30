'use client'

import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { BookAnalysis, Character, Relationship } from '@/lib/types'

const ROLE_STYLE: Record<string, { bg: string; border: string; text: string; badge: string; badgeText: string }> = {
  protagonist: { bg: '#1a0e00', border: '#f59e0b', text: '#fef3c7', badge: '#f59e0b', badgeText: '#1a0e00' },
  supporting:  { bg: '#0a1628', border: '#60a5fa', text: '#dbeafe', badge: '#3b82f6', badgeText: '#fff' },
  antagonist:  { bg: '#1a0505', border: '#f87171', text: '#fee2e2', badge: '#ef4444', badgeText: '#fff' },
  minor:       { bg: '#111110', border: '#78716c', text: '#d6d3d1', badge: '#57534e', badgeText: '#d6d3d1' },
}

const ROLE_LABEL: Record<string, string> = {
  protagonist: '주인공',
  supporting: '조연',
  antagonist: '적대자',
  minor: '단역',
}

interface CharacterNodeData {
  character: Character
  relationCount: number
  onClick: (c: Character) => void
  isSelected: boolean
  isConnected: boolean
  hasSelection: boolean
}

function CharacterNode({ data }: { data: CharacterNodeData }) {
  const { character, relationCount, onClick, isSelected, isConnected, hasSelection } = data
  const style = ROLE_STYLE[character.role] ?? ROLE_STYLE.minor
  const isProtagonist = character.role === 'protagonist'

  // 선택 없음: 전부 정상
  // 선택 있음 + 연결됨: 강조
  // 선택 있음 + 연결 안됨: 흐리게
  const dimmed = hasSelection && !isSelected && !isConnected

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0, width: 1, height: 1 }} />
      <div
        onClick={() => onClick(character)}
        style={{
          backgroundColor: style.bg,
          borderColor: isSelected ? '#fff' : style.border,
          borderWidth: isSelected ? 3 : isProtagonist ? 2.5 : 1.5,
          opacity: dimmed ? 0.25 : 1,
          boxShadow: isSelected
            ? `0 0 0 3px ${style.border}66, 0 8px 32px #00000099`
            : isConnected && hasSelection
            ? `0 0 16px ${style.border}55`
            : isProtagonist
            ? `0 0 20px ${style.border}44, 0 4px 16px #00000066`
            : '0 2px 12px #00000066',
          transition: 'opacity 0.2s, box-shadow 0.2s',
        }}
        className="rounded-2xl px-4 py-3 min-w-[96px] text-center cursor-pointer border"
      >
        <div className="flex justify-center mb-1.5">
          <span
            style={{ backgroundColor: style.badge, color: style.badgeText }}
            className="text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide"
          >
            {ROLE_LABEL[character.role]}
          </span>
        </div>
        <div
          style={{ color: style.text }}
          className={`font-bold leading-tight ${isProtagonist ? 'text-base' : 'text-sm'}`}
        >
          {character.name}
        </div>
        {relationCount > 0 && (
          <div className="mt-1.5 text-[10px] text-stone-500">
            관계 {relationCount}개
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 1, height: 1 }} />
    </>
  )
}

// 엣지: 선택된 인물과 연결된 경우에만 레이블 표시
function RelationEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, data, style,
}: EdgeProps & { data?: { type: string; label: string; showLabel: boolean; highlighted: boolean } }) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  })

  const showLabel = data?.showLabel ?? false
  const highlighted = data?.highlighted ?? false

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          opacity: highlighted ? 1 : (style?.opacity as number ?? 0.35),
          transition: 'opacity 0.2s, stroke-width 0.2s',
        }}
      />
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="absolute"
          >
            <div className="bg-stone-900/95 border border-stone-600 text-stone-200 text-[11px] font-medium px-2.5 py-1 rounded-lg whitespace-nowrap shadow-lg backdrop-blur-sm">
              {data?.type}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

const nodeTypes: NodeTypes = { character: CharacterNode }
const edgeTypes = { relation: RelationEdge }

interface CharacterGraphProps {
  analysis: BookAnalysis
  onCharacterClick: (character: Character) => void
  selectedCharacterId?: string
}

function getLayout(characters: Character[]) {
  const protagonist = characters.find((c) => c.role === 'protagonist')
  const supporting = characters.filter((c) => c.role === 'supporting')
  const antagonist = characters.filter((c) => c.role === 'antagonist')
  const minor = characters.filter((c) => c.role === 'minor')

  const positions: Record<string, { x: number; y: number }> = {}
  const cx = 500
  const cy = 380

  if (protagonist) positions[protagonist.id] = { x: cx, y: cy }

  const place = (list: Character[], radius: number, angleOffset = 0) => {
    list.forEach((char, i) => {
      const angle = (2 * Math.PI * i) / Math.max(list.length, 1) - Math.PI / 2 + angleOffset
      positions[char.id] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
    })
  }

  place(supporting, 230)
  place(antagonist, 230, supporting.length > 0 ? Math.PI / Math.max(supporting.length, 1) : 0)
  place(minor, 390)

  return positions
}

export default function CharacterGraph({ analysis, onCharacterClick, selectedCharacterId }: CharacterGraphProps) {
  // 선택된 인물과 연결된 인물 ID 집합
  const connectedIds = useMemo(() => {
    if (!selectedCharacterId) return new Set<string>()
    const ids = new Set<string>()
    for (const rel of analysis.relationships) {
      if (rel.from === selectedCharacterId) ids.add(rel.to)
      if (rel.to === selectedCharacterId) ids.add(rel.from)
    }
    return ids
  }, [selectedCharacterId, analysis.relationships])

  const relationCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const rel of analysis.relationships) {
      map[rel.from] = (map[rel.from] ?? 0) + 1
      map[rel.to] = (map[rel.to] ?? 0) + 1
    }
    return map
  }, [analysis.relationships])

  const positions = useMemo(() => getLayout(analysis.characters), [analysis.characters])

  const hasSelection = !!selectedCharacterId

  const initialNodes: Node[] = useMemo(
    () =>
      analysis.characters.map((char) => ({
        id: char.id,
        type: 'character',
        position: positions[char.id] ?? { x: 0, y: 0 },
        data: {
          character: char,
          relationCount: relationCountMap[char.id] ?? 0,
          onClick: onCharacterClick,
          isSelected: char.id === selectedCharacterId,
          isConnected: connectedIds.has(char.id),
          hasSelection,
        },
      })),
    [analysis.characters, positions, relationCountMap, onCharacterClick, selectedCharacterId, connectedIds, hasSelection]
  )

  const initialEdges: Edge[] = useMemo(
    () =>
      analysis.relationships.map((rel: Relationship, i: number) => {
        const isConnectedEdge =
          rel.from === selectedCharacterId || rel.to === selectedCharacterId
        const showLabel = isConnectedEdge
        const highlighted = !hasSelection || isConnectedEdge

        return {
          id: `e${i}`,
          source: rel.from,
          target: rel.to,
          type: 'relation',
          data: { type: rel.type, label: rel.label, showLabel, highlighted },
          style: {
            stroke: highlighted
              ? `rgba(245, 158, 11, ${Math.max(0.4, rel.strength * 0.9)})`
              : 'rgba(120, 113, 108, 0.3)',
            strokeWidth: highlighted ? Math.max(1.5, rel.strength * 3) : 1,
            opacity: highlighted ? 1 : 0.3,
          },
          animated: isConnectedEdge && rel.strength > 0.8,
        }
      }),
    [analysis.relationships, selectedCharacterId, hasSelection]
  )

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1c1917" gap={32} size={1} />
        <Controls
          showInteractive={false}
          style={{ background: '#292524', border: '1px solid #44403c', borderRadius: 12 }}
        />
      </ReactFlow>
    </div>
  )
}
