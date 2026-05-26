import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const ROME_TIMEZONE = "Europe/Rome"
const KEEPALIVE_DELAY_MS = 3000

/** Orari target: 07:00, 13:00, 21:30 Europe/Rome */
const SLOTS = ["07:00", "13:00", "21:30"] as const

type RomeTime = { hour: number; minute: number }

function getRomeTime(): RomeTime {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ROME_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date())

  return {
    hour: Number(parts.find((p) => p.type === "hour")?.value ?? -1),
    minute: Number(parts.find((p) => p.type === "minute")?.value ?? -1),
  }
}

function getActiveSlot({ hour, minute }: RomeTime): (typeof SLOTS)[number] | null {
  if (hour === 7 && minute < 10) return "07:00"
  if (hour === 13 && minute < 10) return "13:00"
  if (hour === 21 && minute >= 28 && minute <= 39) return "21:30"
  return null
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const romeTime = getRomeTime()
  const slot = getActiveSlot(romeTime)

  if (!slot) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: `Outside scheduled windows (${SLOTS.join(", ")} Europe/Rome)`,
      romeTime,
    })
  }

  try {
    const ping = await prisma.dbKeepalive.create({ data: {} })

    await new Promise((resolve) => setTimeout(resolve, KEEPALIVE_DELAY_MS))

    await prisma.dbKeepalive.delete({ where: { id: ping.id } })

    return NextResponse.json({
      ok: true,
      slot,
      pingId: ping.id,
      deletedAfterMs: KEEPALIVE_DELAY_MS,
    })
  } catch (error) {
    console.error("DB keepalive failed:", error)
    return NextResponse.json(
      { error: "Keepalive failed" },
      { status: 500 }
    )
  }
}
