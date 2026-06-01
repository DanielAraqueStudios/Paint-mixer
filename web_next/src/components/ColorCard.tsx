'use client'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { type Color, toRgb, getMl } from '@/lib/colors'

interface Props {
  color: Color
  selected: boolean
  onClick: () => void
}

export function ColorCard({ color, selected, onClick }: Props) {
  const { mlBlanca, mlRoja, mlVerde, mlAzul } = getMl(color)
  const rgb = toRgb(color.r, color.g, color.b)

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={[
        'relative rounded-xl border overflow-hidden cursor-pointer transition-colors',
        selected
          ? 'border-amber-400 shadow-[0_0_0_1px_theme(colors.amber.400)]'
          : 'border-zinc-800 hover:border-zinc-600',
      ].join(' ')}
    >
      {selected && (
        <div className="absolute top-1.5 right-2 z-10 bg-black/60 rounded-full w-5 h-5 flex items-center justify-center">
          <Check className="w-3 h-3 text-amber-400" />
        </div>
      )}
      <div className="h-16 w-full" style={{ background: rgb }} />
      <div className="p-2 bg-zinc-900">
        <div className="text-xs font-medium text-zinc-100 leading-snug">{color.name}</div>
        <div className="text-[0.65rem] text-zinc-500 font-mono mt-0.5">
          B:{mlBlanca} R:{mlRoja} G:{mlVerde} Az:{mlAzul}
        </div>
      </div>
    </motion.div>
  )
}
