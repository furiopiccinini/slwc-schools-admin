import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || (session.user as any).role !== "INSTRUCTOR") {
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

    // Ottieni tutti gli iscritti della scuola dell'istruttore
    const subscribers = await prisma.subscriber.findMany({
      where: { schoolId: instructor.schoolId },
      include: {
        school: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(subscribers)
  } catch (error) {
    console.error("Errore nel recupero iscritti:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
