import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  assertPaymentsEnabled,
  decimalToNumber,
  getMonthRoster,
  isValidYearMonth,
  requireInstructorSchool,
  serializeEntry,
} from "@/lib/payments"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireInstructorSchool()
    if ("error" in auth) return auth.error

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get("year") || "")
    const month = parseInt(searchParams.get("month") || "")

    if (!isValidYearMonth(year, month)) {
      return NextResponse.json({ error: "Anno o mese non validi" }, { status: 400 })
    }

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

    // Allow reading settings even when disabled (for enable UI)
    if (!school.paymentsEnabled) {
      return NextResponse.json({
        school: {
          id: school.id,
          name: school.name,
          defaultMonthlyFee: decimalToNumber(school.defaultMonthlyFee) ?? 50,
          paymentsEnabled: false,
        },
        year,
        month,
        entries: [],
        summary: {
          rosterCount: 0,
          paidCount: 0,
          unpaidCount: 0,
          totalCollected: 0,
          expectedTotal: 0,
        },
      })
    }

    const data = await getMonthRoster(auth.schoolId, year, month)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Errore nel recupero pagamenti:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireInstructorSchool()
    if ("error" in auth) return auth.error

    const enabled = await assertPaymentsEnabled(auth.schoolId)
    if ("error" in enabled) return enabled.error

    const body = await request.json()
    const subscriberId = parseInt(body.subscriberId)
    const year = parseInt(body.year)
    const month = parseInt(body.month)
    const expectedAmount =
      body.expectedAmount !== undefined && body.expectedAmount !== null
        ? Number(body.expectedAmount)
        : decimalToNumber(enabled.school.defaultMonthlyFee) ?? 50

    if (!subscriberId || !isValidYearMonth(year, month)) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 })
    }

    if (Number.isNaN(expectedAmount) || expectedAmount < 0) {
      return NextResponse.json({ error: "Importo atteso non valido" }, { status: 400 })
    }

    const subscriber = await prisma.subscriber.findFirst({
      where: { id: subscriberId, schoolId: auth.schoolId },
    })

    if (!subscriber) {
      return NextResponse.json({ error: "Iscritto non trovato" }, { status: 404 })
    }

    const existing = await prisma.monthlyPaymentEntry.findUnique({
      where: {
        subscriberId_year_month: { subscriberId, year, month },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Iscritto già presente nel roster del mese" },
        { status: 400 }
      )
    }

    const entry = await prisma.monthlyPaymentEntry.create({
      data: {
        schoolId: auth.schoolId,
        subscriberId,
        year,
        month,
        expectedAmount,
      },
      include: {
        subscriber: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    })

    return NextResponse.json(serializeEntry(entry), { status: 201 })
  } catch (error) {
    console.error("Errore nell'aggiunta al roster:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
