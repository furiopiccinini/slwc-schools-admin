import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const subscribers = await prisma.subscriber.findMany({
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

    // Ottieni tutti gli istruttori esistenti per filtrare quelli già promossi
    const existingInstructors = await prisma.instructor.findMany({
      select: {
        email: true
      }
    })

    const instructorEmails = new Set(existingInstructors.map(i => i.email))

    // Filtra SOLO gli iscritti che non sono già istruttori per la promozione
    const availableSubscribers = subscribers.filter(subscriber => 
      !instructorEmails.has(subscriber.email)
    )

    return NextResponse.json(availableSubscribers)
  } catch (error) {
    console.error("Errore nel recupero iscritti per promozione:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
