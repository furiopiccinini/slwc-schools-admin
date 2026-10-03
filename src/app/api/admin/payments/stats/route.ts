import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  decimalToNumber,
  getPaymentStats,
  requireAdmin,
} from "@/lib/payments"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ("error" in auth) return auth.error

    const { searchParams } = new URL(request.url)
    const schoolId = parseInt(searchParams.get("schoolId") || "")

    if (Number.isNaN(schoolId)) {
      return NextResponse.json({ error: "schoolId obbligatorio" }, { status: 400 })
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        paymentsEnabled: true,
        defaultMonthlyFee: true,
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
          paymentsEnabled: false,
          defaultMonthlyFee: decimalToNumber(school.defaultMonthlyFee) ?? 50,
        },
        months: [],
      })
    }

    const months = Math.min(Math.max(parseInt(searchParams.get("months") || "12") || 12, 1), 24)
    const stats = await getPaymentStats(schoolId, months)

    return NextResponse.json({
      school: {
        id: school.id,
        name: school.name,
        paymentsEnabled: true,
        defaultMonthlyFee: decimalToNumber(school.defaultMonthlyFee) ?? 50,
      },
      ...stats,
    })
  } catch (error) {
    console.error("Errore admin stats pagamenti:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
