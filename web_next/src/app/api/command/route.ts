import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { publishCommand } from '@/lib/mqtt'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { color, mlBlanca, mlRoja, mlVerde, mlAzul } = body as {
    color: string
    mlBlanca: number
    mlRoja: number
    mlVerde: number
    mlAzul: number
  }

  const command = await prisma.command.create({
    data: { color, mlBlanca, mlRoja, mlVerde, mlAzul, status: 'pending' },
  })

  try {
    await publishCommand(command)
  } catch (err) {
    console.error('[API] Failed to publish MQTT command:', err)
  }

  return NextResponse.json(command, { status: 201 })
}

export async function GET() {
  const command = await prisma.command.findFirst({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(command)
}
