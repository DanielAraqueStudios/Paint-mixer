'use client'
import { useState } from 'react'
import { ColorCard } from './ColorCard'
import { COLORS } from '@/lib/colors'

const DOMS = ['Todos', 'R', 'G', 'B', 'Mix', 'Neutro'] as const
const DOM_LABEL: Record<string, string> = {
  Todos: 'Todos', R: 'Rojos', G: 'Verdes', B: 'Azules', Mix: 'Mix', Neutro: 'Neutro',
}

interface Props {
  selectedIdx: number | null
  onSelect: (idx: number) => void
}

export function ColorGrid({ selectedIdx, onSelect }: Props) {
  const [activeDom, setActiveDom] = useState('')

  const filtered = COLORS.map((c, i) => ({ ...c, idx: i })).filter(
    (c) => !activeDom || c.dom === activeDom
  )

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-5">
        {DOMS.map((d) => {
          const isActive = d === 'Todos' ? !activeDom : activeDom === d
          return (
            <button
              key={d}
              onClick={() => setActiveDom(d === 'Todos' ? '' : d)}
              className={[
                'text-xs px-3 py-1.5 rounded-full border transition-all',
                isActive
                  ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                  : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300',
              ].join(' ')}
            >
              {DOM_LABEL[d]}
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
        {filtered.map((color) => (
          <ColorCard
            key={color.name}
            color={color}
            selected={selectedIdx === color.idx}
            onClick={() => onSelect(color.idx)}
          />
        ))}
      </div>
    </div>
  )
}
