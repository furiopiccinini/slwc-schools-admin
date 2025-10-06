import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || (session.user as { role?: string }).role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    // Ottieni l'ID della scuola dell'istruttore
    const instructor = await prisma.instructor.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { schoolId: true }
    })

    if (!instructor) {
      return NextResponse.json({ error: "Istruttore non trovato" }, { status: 404 })
    }

    // Ottieni la scuola dell'istruttore
    const school = await prisma.school.findUnique({
      where: { id: instructor.schoolId },
      select: {
        id: true,
        name: true
      }
    })

    if (!school) {
      return NextResponse.json({ error: "Scuola non trovata" }, { status: 404 })
    }

    return NextResponse.json([school])
  } catch (error) {
    console.error("Errore nel recupero scuole:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
