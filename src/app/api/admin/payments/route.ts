import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  decimalToNumber,
  getMonthRoster,
  isValidYearMonth,
  requireAdmin,
  serializeEntry,
} from "@/lib/payments"

async function resolveSchoolId(request: NextRequest): Promise<number | null> {
  const { searchParams } = new URL(request.url)
  const schoolId = parseInt(searchParams.get("schoolId") || "")
  return Number.isNaN(schoolId) ? null : schoolId
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ("error" in auth) return auth.error

    const schoolId = await resolveSchoolId(request)
    if (!schoolId) {
      return NextResponse.json({ error: "schoolId obbligatorio" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get("year") || "")
    const month = parseInt(searchParams.get("month") || "")

    if (!isValidYearMonth(year, month)) {
      return NextResponse.json({ error: "Anno o mese non validi" }, { status: 400 })
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

    const data = await getMonthRoster(schoolId, year, month)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Errore admin pagamenti GET:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ("error" in auth) return auth.error

    const body = await request.json()
    const schoolId = parseInt(body.schoolId)
    const subscriberId = parseInt(body.subscriberId)
    const year = parseInt(body.year)
    const month = parseInt(body.month)

    if (!schoolId || !subscriberId || !isValidYearMonth(year, month)) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 })
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { defaultMonthlyFee: true, paymentsEnabled: true },
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

    const expectedAmount =
      body.expectedAmount !== undefined && body.expectedAmount !== null
        ? Number(body.expectedAmount)
        : decimalToNumber(school.defaultMonthlyFee) ?? 50

    if (Number.isNaN(expectedAmount) || expectedAmount < 0) {
      return NextResponse.json({ error: "Importo atteso non valido" }, { status: 400 })
    }

    const subscriber = await prisma.subscriber.findFirst({
      where: { id: subscriberId, schoolId },
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
        schoolId,
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
    console.error("Errore admin pagamenti POST:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
