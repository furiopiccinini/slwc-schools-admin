import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { id } = await params
    const instructorId = parseInt(id)

    if (isNaN(instructorId)) {
      return NextResponse.json({ error: "ID istruttore non valido" }, { status: 400 })
    }

    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId },
      include: {
        school: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!instructor) {
      return NextResponse.json({ error: "Istruttore non trovato" }, { status: 404 })
    }

    return NextResponse.json(instructor)
  } catch (error) {
    console.error("Errore nel recupero istruttore:", error)
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
    const instructorId = parseInt(id)

    if (isNaN(instructorId)) {
      return NextResponse.json({ error: "ID istruttore non valido" }, { status: 400 })
    }

    const existingInstructor = await prisma.instructor.findUnique({
      where: { id: instructorId }
    })

    if (!existingInstructor) {
      return NextResponse.json({ error: "Istruttore non trovato" }, { status: 404 })
    }

    const body = await request.json()
    const { name, email, role, schoolId, password } = body

    if (!name || !email || !role || !schoolId) {
      return NextResponse.json(
        { error: "Nome, email, ruolo e scuola sono obbligatori" },
        { status: 400 }
      )
    }

    if (role !== "ADMIN" && role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Ruolo non valido" }, { status: 400 })
    }

    const parsedSchoolId = parseInt(schoolId)
    if (isNaN(parsedSchoolId)) {
      return NextResponse.json({ error: "Scuola non valida" }, { status: 400 })
    }

    const school = await prisma.school.findUnique({
      where: { id: parsedSchoolId }
    })

    if (!school) {
      return NextResponse.json({ error: "Scuola non trovata" }, { status: 404 })
    }

    const emailTaken = await prisma.instructor.findFirst({
      where: {
        email,
        NOT: { id: instructorId }
      }
    })

    if (emailTaken) {
      return NextResponse.json(
        { error: "Un istruttore con questa email esiste già" },
        { status: 400 }
      )
    }

    if (
      instructorId === session.user.id &&
      existingInstructor.role === "ADMIN" &&
      role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Non è possibile rimuovere il proprio ruolo di amministratore" },
        { status: 400 }
      )
    }

    const updateData: {
      name: string
      email: string
      role: "ADMIN" | "INSTRUCTOR"
      schoolId: number
      passwordHash?: string
    } = {
      name,
      email,
      role,
      schoolId: parsedSchoolId
    }

    if (password) {
      if (password.length < 8) {
        return NextResponse.json(
          { error: "La password deve essere di almeno 8 caratteri" },
          { status: 400 }
        )
      }
      updateData.passwordHash = await bcrypt.hash(password, 12)
    }

    const instructor = await prisma.instructor.update({
      where: { id: instructorId },
      data: updateData,
      include: {
        school: {
          select: {
            name: true
          }
        }
      }
    })

    return NextResponse.json(instructor)
  } catch (error) {
    console.error("Errore nell'aggiornamento istruttore:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
