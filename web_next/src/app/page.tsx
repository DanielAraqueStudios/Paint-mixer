'use client'
import { useState } from 'react'
import { ColorGrid } from '@/components/ColorGrid'
import { MixSidebar } from '@/components/MixSidebar'
import { StatusBar } from '@/components/StatusBar'
import { COLORS, getMl } from '@/lib/colors'

export default function Home() {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [sending, setSending] = useState(false)

  const color = selectedIdx !== null ? COLORS[selectedIdx] : null

  async function handleSend() {
    if (!color) return
    setSending(true)
    try {
      const ml = getMl(color)
      await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: color.name, ...ml }),
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="px-10 py-6 border-b border-zinc-800 flex items-baseline gap-4 flex-shrink-0">
        <h1 className="font-serif text-2xl tracking-tight">
          Pinturas <span className="text-amber-400 italic">124345</span>
        </h1>
        <span className="text-xs text-zinc-500 uppercase tracking-widest">
          Sistema de mezclado IoT
        </span>
      </header>

      {/* Status bar */}
      <StatusBar />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <section className="flex-1 p-10 overflow-y-auto">
          <h2 className="font-serif text-base text-zinc-400 mb-5">Catálogo de colores</h2>
          <ColorGrid selectedIdx={selectedIdx} onSelect={setSelectedIdx} />
        </section>

        <div className="w-80 flex-shrink-0">
          <MixSidebar color={color} onSend={handleSend} sending={sending} />
        </div>
      </div>
    </div>
  )
}
