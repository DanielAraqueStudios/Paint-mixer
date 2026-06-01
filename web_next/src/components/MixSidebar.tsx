'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2 } from 'lucide-react'
import { type Color, getMl, toRgb } from '@/lib/colors'

interface Props {
  color: Color | null
  onSend: () => Promise<void>
  sending: boolean
}

const ROWS = [
  { label: 'Base blanca', key: 'mlBlanca' as const, bar: '#e4e4e7' },
  { label: 'Rojo',        key: 'mlRoja'   as const, bar: '#ef4444' },
  { label: 'Verde',       key: 'mlVerde'  as const, bar: '#22c55e' },
  { label: 'Azul',        key: 'mlAzul'   as const, bar: '#3b82f6' },
]

export function MixSidebar({ color, onSend, sending }: Props) {
  const ml = color ? getMl(color) : null
  const rgb = color ? toRgb(color.r, color.g, color.b) : null

  return (
    <aside className="border-l border-zinc-800 p-7 flex flex-col gap-5 h-full overflow-y-auto">
      {/* Color preview */}
      <motion.div
        className="w-full h-28 rounded-xl flex items-center justify-center"
        animate={{ background: rgb ?? '#27272a' }}
        transition={{ duration: 0.4 }}
      >
        {!color && (
          <span className="text-xs text-zinc-600 uppercase tracking-widest">sin selección</span>
        )}
      </motion.div>

      {/* Name */}
      <AnimatePresence mode="wait">
        <motion.h2
          key={color?.name ?? 'empty'}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="font-serif text-2xl leading-tight min-h-[2rem]"
        >
          {color?.name ?? '—'}
        </motion.h2>
      </AnimatePresence>

      {/* ML table */}
      <div className="divide-y divide-zinc-800">
        {ROWS.map((row) => (
          <div key={row.key} className="py-3">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-zinc-400">{row.label}</span>
              <span className="font-mono text-zinc-300 text-xs">
                {ml ? `${ml[row.key]} ml` : '—'}
              </span>
            </div>
            <div className="h-0.5 bg-zinc-800 rounded">
              <motion.div
                className="h-0.5 rounded"
                style={{ background: row.bar }}
                animate={{ width: ml ? `${(ml[row.key] / 700) * 100}%` : '0%' }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Send button */}
      <button
        onClick={onSend}
        disabled={!color || sending}
        className="
          w-full py-3 rounded-xl font-medium text-sm tracking-wide transition-all
          flex items-center justify-center gap-2
          bg-amber-400 text-zinc-900 hover:bg-amber-300 active:scale-[0.98]
          disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed disabled:scale-100
        "
      >
        {sending
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
          : <><Send className="w-4 h-4" /> Enviar a ESP32</>
        }
      </button>
    </aside>
  )
}
