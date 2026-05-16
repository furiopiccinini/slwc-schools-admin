import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const ROME_TIMEZONE = "Europe/Rome"
const KEEPALIVE_DELAY_MS = 3000

function getRomeHour(): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: ROME_TIMEZONE,
    hour: "numeric",
    hour12: false,
  }).format(new Date())

  return Number.parseInt(hour, 10)
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

  const romeHour = getRomeHour()
  if (romeHour !== 2) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Outside 02:00 Europe/Rome window",
      romeHour,
    })
  }

  try {
    const ping = await prisma.dbKeepalive.create({ data: {} })

    await new Promise((resolve) => setTimeout(resolve, KEEPALIVE_DELAY_MS))

    await prisma.dbKeepalive.delete({ where: { id: ping.id } })

    return NextResponse.json({
      ok: true,
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
