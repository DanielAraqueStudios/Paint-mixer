import type { Metadata } from 'next'
import { DM_Serif_Display, DM_Mono, Outfit } from 'next/font/google'
import './globals.css'

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-serif',
})
const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
})
const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Pinturas 124345 — Mezclador IoT',
  description: 'Sistema de mezclado de pintura por IoT',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${dmSerif.variable} ${dmMono.variable} ${outfit.variable} h-full`}>
      <body className="h-full antialiased font-sans bg-zinc-950 text-zinc-100">
        {children}
      </body>
    </html>
  )
}
