import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const body = await request.json()
    const { subscriberId, password, schoolId } = body

    // Recupera l'iscritto
    const subscriber = await prisma.subscriber.findUnique({
      where: { id: subscriberId },
      include: {
        school: true
      }
    })

    if (!subscriber) {
      return NextResponse.json(
        { error: "Iscritto non trovato" },
        { status: 404 }
      )
    }

    // Verifica se l'email esiste già come istruttore
    const existingInstructor = await prisma.instructor.findUnique({
      where: { email: subscriber.email }
    })

    if (existingInstructor) {
      return NextResponse.json(
        { error: "Questo iscritto è già un istruttore" },
        { status: 400 }
      )
    }

    // Hash della password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Verifica che la scuola esista
    const school = await prisma.school.findUnique({
      where: { id: schoolId }
    })

    if (!school) {
      return NextResponse.json(
        { error: "Scuola non trovata" },
        { status: 404 }
      )
    }

    // Crea l'istruttore basandosi sui dati dell'iscritto
    // L'iscritto rimane nella tabella subscribers per i tesseramenti EPS
    const instructor = await prisma.instructor.create({
      data: {
        name: `${subscriber.firstName} ${subscriber.lastName}`,
        email: subscriber.email,
        passwordHash: hashedPassword,
        role: "INSTRUCTOR",
        schoolId: parseInt(schoolId)
      },
      include: {
        school: {
          select: {
            name: true
          }
        }
      }
    })

    return NextResponse.json(instructor, { status: 201 })
  } catch (error) {
    console.error("Errore nella promozione istruttore:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}

