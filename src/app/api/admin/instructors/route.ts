import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const instructors = await prisma.instructor.findMany({
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

    return NextResponse.json(instructors)
  } catch (error) {
    console.error("Errore nel recupero istruttori:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, password, role, schoolId } = body

    // Verifica se l'email esiste già
    const existingInstructor = await prisma.instructor.findUnique({
      where: { email }
    })

    if (existingInstructor) {
      return NextResponse.json(
        { error: "Un istruttore con questa email esiste già" },
        { status: 400 }
      )
    }

    // Hash della password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Crea l'istruttore
    const instructor = await prisma.instructor.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role,
        schoolId
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
    console.error("Errore nella creazione istruttore:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const instructorId = searchParams.get('id')

    if (!instructorId) {
      return NextResponse.json(
        { error: "ID istruttore richiesto" },
        { status: 400 }
      )
    }

    const instructorIdNum = parseInt(instructorId)

    if (isNaN(instructorIdNum)) {
      return NextResponse.json(
        { error: "ID istruttore non valido" },
        { status: 400 }
      )
    }

    // Verifica che l'istruttore esista
    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorIdNum }
    })

    if (!instructor) {
      return NextResponse.json(
        { error: "Istruttore non trovato" },
        { status: 404 }
      )
    }

    // Non permettere di eliminare l'admin corrente
    if (instructor.id === session.user.id) {
      return NextResponse.json(
        { error: "Non è possibile eliminare il proprio account" },
        { status: 400 }
      )
    }

    // Elimina l'istruttore
    await prisma.instructor.delete({
      where: { id: instructorIdNum }
    })

    return NextResponse.json({ message: "Istruttore eliminato con successo" })
  } catch (error) {
    console.error("Errore nell'eliminazione istruttore:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
