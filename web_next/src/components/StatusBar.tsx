'use client'
import { useEffect, useState } from 'react'

interface Command {
  id: number
  color: string
  status: string
}

const STATUS: Record<string, { label: string; dot: string; pulse: boolean }> = {
  pending:  { label: 'Orden pendiente',         dot: 'bg-amber-400',  pulse: true  },
  received: { label: 'ESP32 recibió la orden',  dot: 'bg-blue-400',   pulse: true  },
  mixing:   { label: 'Mezclando...',             dot: 'bg-blue-400',   pulse: true  },
  done:     { label: 'Mezcla completada',        dot: 'bg-green-400',  pulse: false },
  error:    { label: 'Error en ESP32',           dot: 'bg-red-400',    pulse: false },
}

export function StatusBar() {
  const [command, setCommand] = useState<Command | null>(null)

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/command')
        if (res.ok) setCommand(await res.json())
      } catch {}
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => clearInterval(id)
  }, [])

  const s = command?.status ? (STATUS[command.status] ?? { label: command.status, dot: 'bg-zinc-600', pulse: false }) : null

  return (
    <div className="px-10 py-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center gap-2.5 font-mono text-xs text-zinc-400">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s?.dot ?? 'bg-zinc-700'} ${s?.pulse ? 'animate-pulse' : ''}`} />
      <span>
        {s
          ? `${s.label}${command?.color ? ` — ${command.color}` : ''}`
          : 'Sin actividad reciente'
        }
      </span>
    </div>
  )
}
