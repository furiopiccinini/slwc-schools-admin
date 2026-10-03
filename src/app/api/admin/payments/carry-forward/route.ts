import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  carryForwardRoster,
  isValidYearMonth,
  nextMonth,
  requireAdmin,
} from "@/lib/payments"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ("error" in auth) return auth.error

    const body = await request.json()
    const schoolId = parseInt(body.schoolId)
    const fromYear = parseInt(body.fromYear)
    const fromMonth = parseInt(body.fromMonth)

    if (!schoolId || !isValidYearMonth(fromYear, fromMonth)) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 })
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { paymentsEnabled: true },
    })

    if (!school) {
      return NextResponse.json({ error: "Scuola non trovata" }, { status: 404 })
    }

    if (!school.paymentsEnabled) {
      return NextResponse.json(
        { error: "Gestione pagamenti non attiva per questa scuola" },
        { status: 403 }
      )
    }

    let toYear: number
    let toMonth: number

    if (body.toYear !== undefined && body.toMonth !== undefined) {
      toYear = parseInt(body.toYear)
      toMonth = parseInt(body.toMonth)
      if (!isValidYearMonth(toYear, toMonth)) {
        return NextResponse.json({ error: "Mese di destinazione non valido" }, { status: 400 })
      }
    } else {
      const next = nextMonth(fromYear, fromMonth)
      toYear = next.year
      toMonth = next.month
    }

    const result = await carryForwardRoster(
      schoolId,
      fromYear,
      fromMonth,
      toYear,
      toMonth
    )

    return NextResponse.json({
      ...result,
      from: { year: fromYear, month: fromMonth },
      to: { year: toYear, month: toMonth },
    })
  } catch (error) {
    console.error("Errore admin carry-forward:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
