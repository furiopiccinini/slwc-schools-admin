import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { decimalToNumber, requireAdmin } from "@/lib/payments"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ("error" in auth) return auth.error

    const schoolId = parseInt(new URL(request.url).searchParams.get("schoolId") || "")
    if (Number.isNaN(schoolId)) {
      return NextResponse.json({ error: "schoolId obbligatorio" }, { status: 400 })
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
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
    console.error("Errore admin settings GET:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ("error" in auth) return auth.error

    const body = await request.json()
    const schoolId = parseInt(body.schoolId)

    if (Number.isNaN(schoolId)) {
      return NextResponse.json({ error: "schoolId obbligatorio" }, { status: 400 })
    }

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
      where: { id: schoolId },
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
    console.error("Errore admin settings PATCH:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
