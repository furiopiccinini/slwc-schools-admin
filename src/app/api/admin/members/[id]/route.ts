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
    const subscriberId = parseInt(id)

    if (isNaN(subscriberId)) {
      return NextResponse.json({ error: "ID iscritto non valido" }, { status: 400 })
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { id: subscriberId },
      include: {
        school: {
          select: {
            id: true,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { id } = await params
    const subscriberId = parseInt(id)

    if (isNaN(subscriberId)) {
      return NextResponse.json({ error: "ID iscritto non valido" }, { status: 400 })
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      birthDate,
      birthPlace,
      birthCap,
      fiscalCode,
      residence,
      residenceCity,
      residenceCap,
      email,
      phone,
      duan,
      documentType,
      documentNumber,
      documentExpiry,
      medicalCertS3Key,
      annualPayment,
      isEpsMember,
      epsCardNumber,
      epsJoinDate,
      schoolId
    } = body

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

    // Aggiorna l'iscritto
    const updatedSubscriber = await prisma.subscriber.update({
      where: { id: subscriberId },
      data: {
        firstName,
        lastName,
        birthDate: new Date(birthDate),
        birthPlace,
        birthCap,
        fiscalCode,
        residence,
        residenceCity,
        residenceCap,
        email,
        phone,
        duan,
        documentType: documentType || null,
        documentNumber: documentNumber || null,
        documentExpiry: documentExpiry ? new Date(documentExpiry) : new Date(),
        hasMedicalCert: medicalCertS3Key ? true : false,
        medicalCertS3Key: medicalCertS3Key || null,
        annualPayment: annualPayment || false,
        isEpsMember: isEpsMember || false,
        epsCardNumber: epsCardNumber || null,
        epsJoinDate: epsJoinDate ? new Date(epsJoinDate) : null,
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

    return NextResponse.json(updatedSubscriber)
  } catch (error) {
    console.error("Errore nell'aggiornamento iscritto:", error)
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
    const subscriberId = parseInt(id)

    if (isNaN(subscriberId)) {
      return NextResponse.json({ error: "ID iscritto non valido" }, { status: 400 })
    }

    // Verifica che l'iscritto esista
    const subscriber = await prisma.subscriber.findUnique({
      where: { id: subscriberId }
    })

    if (!subscriber) {
      return NextResponse.json({ error: "Iscritto non trovato" }, { status: 404 })
    }

    // Verifica se l'iscritto è anche un istruttore
    const instructor = await prisma.instructor.findUnique({
      where: { email: subscriber.email }
    })

    if (instructor) {
      return NextResponse.json(
        { error: "Non è possibile eliminare un iscritto che è anche istruttore. Elimina prima l'istruttore." },
        { status: 400 }
      )
    }

    // Elimina l'iscritto (i certificati medici verranno eliminati automaticamente per cascade)
    await prisma.subscriber.delete({
      where: { id: subscriberId }
    })

    return NextResponse.json({ message: "Iscritto eliminato con successo" })
  } catch (error) {
    console.error("Errore nell'eliminazione iscritto:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
