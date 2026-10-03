import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Decimal } from "@prisma/client/runtime/library"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type SessionUser = {
  id: string
  role?: string
  schoolId?: number
}

export function decimalToNumber(value: Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  return typeof value === "number" ? value : Number(value)
}

export function serializeEntry(entry: {
  id: number
  schoolId: number
  subscriberId: number
  year: number
  month: number
  expectedAmount: Decimal
  paidAmount: Decimal | null
  paidAt: Date | null
  createdAt: Date
  updatedAt: Date
  subscriber?: {
    id: number
    firstName: string
    lastName: string
  }
}) {
  return {
    id: entry.id,
    schoolId: entry.schoolId,
    subscriberId: entry.subscriberId,
    year: entry.year,
    month: entry.month,
    expectedAmount: decimalToNumber(entry.expectedAmount) ?? 0,
    paidAmount: decimalToNumber(entry.paidAmount),
    paidAt: entry.paidAt,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    subscriber: entry.subscriber
      ? {
          id: entry.subscriber.id,
          firstName: entry.subscriber.firstName,
          lastName: entry.subscriber.lastName,
        }
      : undefined,
  }
}

export async function requireInstructorSchool(): Promise<
  { schoolId: number; user: SessionUser } | { error: NextResponse }
> {
  const session = await getServerSession(authOptions)
  const user = session?.user as SessionUser | undefined

  if (!session || !user || user.role !== "INSTRUCTOR") {
    return { error: NextResponse.json({ error: "Non autorizzato" }, { status: 401 }) }
  }

  const instructor = await prisma.instructor.findUnique({
    where: { id: parseInt(user.id) },
    select: { schoolId: true },
  })

  if (!instructor) {
    return { error: NextResponse.json({ error: "Istruttore non trovato" }, { status: 404 }) }
  }

  return { schoolId: instructor.schoolId, user }
}

export async function requireAdmin(): Promise<
  { user: SessionUser } | { error: NextResponse }
> {
  const session = await getServerSession(authOptions)
  const user = session?.user as SessionUser | undefined

  if (!session || !user || user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Non autorizzato" }, { status: 401 }) }
  }

  return { user }
}

export async function assertPaymentsEnabled(schoolId: number): Promise<
  | {
      school: {
        id: number
        name: string
        defaultMonthlyFee: Decimal
        paymentsEnabled: boolean
      }
    }
  | { error: NextResponse }
> {
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
    return { error: NextResponse.json({ error: "Scuola non trovata" }, { status: 404 }) }
  }

  if (!school.paymentsEnabled) {
    return {
      error: NextResponse.json(
        { error: "Gestione pagamenti non attiva per questa scuola" },
        { status: 403 }
      ),
    }
  }

  return { school }
}

export function nextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 }
  return { year, month: month + 1 }
}

export function previousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 }
  return { year, month: month - 1 }
}

export function isValidYearMonth(year: number, month: number): boolean {
  return Number.isInteger(year) && year >= 2000 && year <= 2100 && Number.isInteger(month) && month >= 1 && month <= 12
}

export async function getMonthRoster(schoolId: number, year: number, month: number) {
  const entries = await prisma.monthlyPaymentEntry.findMany({
    where: { schoolId, year, month },
    include: {
      subscriber: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [
      { subscriber: { lastName: "asc" } },
      { subscriber: { firstName: "asc" } },
    ],
  })

  const serialized = entries.map(serializeEntry)
  const totalCollected = serialized.reduce((sum, e) => sum + (e.paidAmount ?? 0), 0)
  const paidCount = serialized.filter((e) => e.paidAmount !== null).length
  const expectedTotal = serialized.reduce((sum, e) => sum + e.expectedAmount, 0)

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      defaultMonthlyFee: true,
      paymentsEnabled: true,
    },
  })

  return {
    school: school
      ? {
          id: school.id,
          name: school.name,
          defaultMonthlyFee: decimalToNumber(school.defaultMonthlyFee) ?? 50,
          paymentsEnabled: school.paymentsEnabled,
        }
      : null,
    year,
    month,
    entries: serialized,
    summary: {
      rosterCount: serialized.length,
      paidCount,
      unpaidCount: serialized.length - paidCount,
      totalCollected,
      expectedTotal,
    },
  }
}

export async function getPaymentStats(schoolId: number, monthsCount = 12) {
  const now = new Date()
  const points: {
    year: number
    month: number
    label: string
    totalCollected: number
    paidCount: number
    rosterCount: number
    newSubscribers: number
  }[] = []

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 1)

    const [entries, newSubscribers] = await Promise.all([
      prisma.monthlyPaymentEntry.findMany({
        where: { schoolId, year, month },
        select: { paidAmount: true },
      }),
      prisma.subscriber.count({
        where: {
          schoolId,
          createdAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
      }),
    ])

    const totalCollected = entries.reduce(
      (sum, e) => sum + (decimalToNumber(e.paidAmount) ?? 0),
      0
    )
    const paidCount = entries.filter((e) => e.paidAmount !== null).length

    points.push({
      year,
      month,
      label: `${String(month).padStart(2, "0")}/${year}`,
      totalCollected,
      paidCount,
      rosterCount: entries.length,
      newSubscribers,
    })
  }

  return { months: points }
}

export async function carryForwardRoster(
  schoolId: number,
  fromYear: number,
  fromMonth: number,
  toYear: number,
  toMonth: number
) {
  const sourceEntries = await prisma.monthlyPaymentEntry.findMany({
    where: { schoolId, year: fromYear, month: fromMonth },
  })

  if (sourceEntries.length === 0) {
    return { created: 0, skipped: 0 }
  }

  const existing = await prisma.monthlyPaymentEntry.findMany({
    where: { schoolId, year: toYear, month: toMonth },
    select: { subscriberId: true },
  })
  const existingIds = new Set(existing.map((e) => e.subscriberId))

  const toCreate = sourceEntries.filter((e) => !existingIds.has(e.subscriberId))

  if (toCreate.length > 0) {
    await prisma.monthlyPaymentEntry.createMany({
      data: toCreate.map((e) => ({
        schoolId,
        subscriberId: e.subscriberId,
        year: toYear,
        month: toMonth,
        expectedAmount: e.expectedAmount,
        paidAmount: null,
        paidAt: null,
      })),
    })
  }

  return {
    created: toCreate.length,
    skipped: sourceEntries.length - toCreate.length,
  }
}
