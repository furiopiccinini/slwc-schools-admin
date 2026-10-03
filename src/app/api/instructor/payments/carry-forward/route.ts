import { NextRequest, NextResponse } from "next/server"
import {
  assertPaymentsEnabled,
  carryForwardRoster,
  isValidYearMonth,
  nextMonth,
  requireInstructorSchool,
} from "@/lib/payments"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireInstructorSchool()
    if ("error" in auth) return auth.error

    const enabled = await assertPaymentsEnabled(auth.schoolId)
    if ("error" in enabled) return enabled.error

    const body = await request.json()
    const fromYear = parseInt(body.fromYear)
    const fromMonth = parseInt(body.fromMonth)

    if (!isValidYearMonth(fromYear, fromMonth)) {
      return NextResponse.json({ error: "Mese di origine non valido" }, { status: 400 })
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
      auth.schoolId,
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
    console.error("Errore nel carry-forward:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
