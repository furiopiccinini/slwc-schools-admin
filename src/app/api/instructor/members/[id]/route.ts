import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || (session.user as { role?: string }).role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const subscriberId = parseInt(params.id)
    if (isNaN(subscriberId)) {
      return NextResponse.json({ error: "ID non valido" }, { status: 400 })
    }

    // Ottieni l'ID della scuola dell'istruttore
    const instructor = await prisma.instructor.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { schoolId: true }
    })

    if (!instructor) {
      return NextResponse.json({ error: "Istruttore non trovato" }, { status: 404 })
    }

    // Ottieni l'iscritto solo se appartiene alla scuola dell'istruttore
    const subscriber = await prisma.subscriber.findFirst({
      where: { 
        id: subscriberId,
        schoolId: instructor.schoolId 
      },
      include: {
        school: {
          select: {
            name: true
          }
        }
      }
    })

    if (!subscriber) {
      return NextResponse.json({ error: "Iscritto non trovato" }, { status: 404 })
    }

    return NextResponse.json(subscriber)
  } catch (error) {
    console.error("Errore nel recupero iscritto:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || (session.user as { role?: string }).role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const subscriberId = parseInt(params.id)
    if (isNaN(subscriberId)) {
      return NextResponse.json({ error: "ID non valido" }, { status: 400 })
    }

    const body = await request.json()

    // Ottieni l'ID della scuola dell'istruttore
    const instructor = await prisma.instructor.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { schoolId: true }
    })

    if (!instructor) {
      return NextResponse.json({ error: "Istruttore non trovato" }, { status: 404 })
    }

    // Verifica che l'iscritto appartenga alla scuola dell'istruttore
    const existingSubscriber = await prisma.subscriber.findFirst({
      where: { 
        id: subscriberId,
        schoolId: instructor.schoolId 
      }
    })

    if (!existingSubscriber) {
      return NextResponse.json({ error: "Iscritto non trovato" }, { status: 404 })
    }

    // Aggiorna l'iscritto
    const updatedSubscriber = await prisma.subscriber.update({
      where: { id: subscriberId },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        birthDate: new Date(body.birthDate),
        birthPlace: body.birthPlace,
        birthCap: body.birthCap,
        fiscalCode: body.fiscalCode,
        residence: body.residence,
        residenceCity: body.residenceCity,
        residenceCap: body.residenceCap,
        email: body.email,
        phone: body.phone,
        duan: body.duan,
        documentType: body.documentType,
        documentNumber: body.documentNumber,
        documentExpiry: new Date(body.documentExpiry),
        annualPayment: body.annualPayment,
        isEpsMember: body.isEpsMember,
        epsCardNumber: body.epsCardNumber,
        epsJoinDate: body.epsJoinDate ? new Date(body.epsJoinDate) : null,
        schoolId: body.schoolId
      }
    })

    return NextResponse.json(updatedSubscriber)
  } catch (error) {
    console.error("Errore nell'aggiornamento iscritto:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
