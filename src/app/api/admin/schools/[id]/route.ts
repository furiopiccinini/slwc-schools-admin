import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { id } = await params
    const schoolId = parseInt(id)

    if (isNaN(schoolId)) {
      return NextResponse.json({ error: "ID scuola non valido" }, { status: 400 })
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId }
    })

    if (!school) {
      return NextResponse.json({ error: "Scuola non trovata" }, { status: 404 })
    }

    return NextResponse.json(school)
  } catch {
    console.error("Errore nel recupero scuola")
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { id } = await params
    const schoolId = parseInt(id)

    if (isNaN(schoolId)) {
      return NextResponse.json({ error: "ID scuola non valido" }, { status: 400 })
    }

    const body = await request.json()
    const { name, gymName, slug, address } = body

    // Verifica se lo slug è già utilizzato da un'altra scuola
    const existingSchool = await prisma.school.findFirst({
      where: {
        slug,
        NOT: { id: schoolId }
      }
    })

    if (existingSchool) {
      return NextResponse.json(
        { error: "Uno slug con questo nome esiste già" },
        { status: 400 }
      )
    }

    // Aggiorna la scuola
    const school = await prisma.school.update({
      where: { id: schoolId },
      data: {
        name,
        gymName,
        slug,
        address
      }
    })

    return NextResponse.json(school)
  } catch {
    console.error("Errore nell'aggiornamento scuola")
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { id } = await params
    const schoolId = parseInt(id)

    if (isNaN(schoolId)) {
      return NextResponse.json({ error: "ID scuola non valido" }, { status: 400 })
    }

    // Verifica se la scuola ha membri o istruttori associati
    const memberCount = await prisma.subscriber.count({
      where: { schoolId }
    })

    const instructorCount = await prisma.instructor.count({
      where: { schoolId }
    })

    if (memberCount > 0 || instructorCount > 0) {
      return NextResponse.json(
        { error: "Non è possibile eliminare una scuola con membri o istruttori associati" },
        { status: 400 }
      )
    }

    // Elimina la scuola
    await prisma.school.delete({
      where: { id: schoolId }
    })

    return NextResponse.json({ message: "Scuola eliminata con successo" })
  } catch {
    console.error("Errore nell'eliminazione scuola")
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
