import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, serializeEntry } from "@/lib/payments"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ("error" in auth) return auth.error

    const { id } = await params
    const entryId = parseInt(id)

    if (Number.isNaN(entryId)) {
      return NextResponse.json({ error: "ID non valido" }, { status: 400 })
    }

    const entry = await prisma.monthlyPaymentEntry.findUnique({
      where: { id: entryId },
    })

    if (!entry) {
      return NextResponse.json({ error: "Voce non trovata" }, { status: 404 })
    }

    await prisma.monthlyPaymentEntry.delete({ where: { id: entryId } })
    return NextResponse.json({ message: "Iscritto rimosso dal roster del mese" })
  } catch (error) {
    console.error("Errore admin delete entry:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ("error" in auth) return auth.error

    const { id } = await params
    const entryId = parseInt(id)

    if (Number.isNaN(entryId)) {
      return NextResponse.json({ error: "ID non valido" }, { status: 400 })
    }

    const entry = await prisma.monthlyPaymentEntry.findUnique({
      where: { id: entryId },
    })

    if (!entry) {
      return NextResponse.json({ error: "Voce non trovata" }, { status: 404 })
    }

    const body = await request.json()
    const expectedAmount = Number(body.expectedAmount)

    if (Number.isNaN(expectedAmount) || expectedAmount < 0) {
      return NextResponse.json({ error: "Importo atteso non valido" }, { status: 400 })
    }

    const updated = await prisma.monthlyPaymentEntry.update({
      where: { id: entryId },
      data: { expectedAmount },
      include: {
        subscriber: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    })

    return NextResponse.json(serializeEntry(updated))
  } catch (error) {
    console.error("Errore admin patch entry:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
