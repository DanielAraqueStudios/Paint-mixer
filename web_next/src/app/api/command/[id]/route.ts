import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { status } = (await req.json()) as { status: string }

  const command = await prisma.command.update({
    where: { id: parseInt(id, 10) },
    data: { status },
  })

  return NextResponse.json(command)
}
