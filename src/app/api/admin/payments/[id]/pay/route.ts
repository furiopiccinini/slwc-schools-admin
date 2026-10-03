import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { decimalToNumber, requireAdmin, serializeEntry } from "@/lib/payments"

export async function POST(
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
    const amount =
      body.amount !== undefined && body.amount !== null
        ? Number(body.amount)
        : decimalToNumber(entry.expectedAmount) ?? 0
    const paidAt = body.paidAt ? new Date(body.paidAt) : new Date()

    if (Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Importo non valido" }, { status: 400 })
    }

    if (Number.isNaN(paidAt.getTime())) {
      return NextResponse.json({ error: "Data non valida" }, { status: 400 })
    }

    const updated = await prisma.monthlyPaymentEntry.update({
      where: { id: entryId },
      data: { paidAmount: amount, paidAt },
      include: {
        subscriber: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    })

    return NextResponse.json(serializeEntry(updated))
  } catch (error) {
    console.error("Errore admin pay POST:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}

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

    const updated = await prisma.monthlyPaymentEntry.update({
      where: { id: entryId },
      data: { paidAmount: null, paidAt: null },
      include: {
        subscriber: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    })

    return NextResponse.json(serializeEntry(updated))
  } catch (error) {
    console.error("Errore admin pay DELETE:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
