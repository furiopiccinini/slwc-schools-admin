import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const school = await prisma.school.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        gymName: true,
        slug: true
      }
    })

    if (!school) {
      return NextResponse.json({ error: "Scuola non trovata" }, { status: 404 })
    }

    return NextResponse.json(school)
  } catch (error) {
    console.error("Errore nel recupero scuola pubblica:", error)
    const message = error instanceof Error ? error.message : "Errore interno del server"
    return NextResponse.json(
      { error: "Errore di connessione al database", details: message },
      { status: 503 }
    )
  }
}

