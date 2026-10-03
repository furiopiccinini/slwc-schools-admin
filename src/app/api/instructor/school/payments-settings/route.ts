import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { decimalToNumber, requireInstructorSchool } from "@/lib/payments"

export async function GET() {
  try {
    const auth = await requireInstructorSchool()
    if ("error" in auth) return auth.error

    const school = await prisma.school.findUnique({
      where: { id: auth.schoolId },
      select: {
        id: true,
        name: true,
        defaultMonthlyFee: true,
        paymentsEnabled: true,
      },
    })

    if (!school) {
      return NextResponse.json({ error: "Scuola non trovata" }, { status: 404 })
    }

    return NextResponse.json({
      id: school.id,
      name: school.name,
      defaultMonthlyFee: decimalToNumber(school.defaultMonthlyFee) ?? 50,
      paymentsEnabled: school.paymentsEnabled,
    })
  } catch (error) {
    console.error("Errore nel recupero settings pagamenti:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireInstructorSchool()
    if ("error" in auth) return auth.error

    const body = await request.json()
    const data: { defaultMonthlyFee?: number; paymentsEnabled?: boolean } = {}

    if (body.defaultMonthlyFee !== undefined) {
      const fee = Number(body.defaultMonthlyFee)
      if (Number.isNaN(fee) || fee < 0) {
        return NextResponse.json({ error: "Quota mensile non valida" }, { status: 400 })
      }
      data.defaultMonthlyFee = fee
    }

    if (body.paymentsEnabled !== undefined) {
      data.paymentsEnabled = Boolean(body.paymentsEnabled)
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nessun campo da aggiornare" }, { status: 400 })
    }

    const school = await prisma.school.update({
      where: { id: auth.schoolId },
      data,
      select: {
        id: true,
        name: true,
        defaultMonthlyFee: true,
        paymentsEnabled: true,
      },
    })

    return NextResponse.json({
      id: school.id,
      name: school.name,
      defaultMonthlyFee: decimalToNumber(school.defaultMonthlyFee) ?? 50,
      paymentsEnabled: school.paymentsEnabled,
    })
  } catch (error) {
    console.error("Errore nell'aggiornamento settings pagamenti:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
