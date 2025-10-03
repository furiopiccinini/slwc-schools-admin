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

    // Per la pagina degli iscritti, mostriamo TUTTI gli iscritti (inclusi gli istruttori)
    // ma aggiungiamo un flag per indicare se sono anche istruttori
    const subscribersWithInstructorFlag = subscribers.map(subscriber => ({
      ...subscriber,
      isAlsoInstructor: instructorEmails.has(subscriber.email)
    }))

    return NextResponse.json(subscribersWithInstructorFlag)
  } catch (error) {
    console.error("Errore nel recupero iscritti:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}

export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const body = await _request.json()
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      birthDate, 
      birthPlace, 
      birthCap, 
      fiscalCode, 
      residence, 
      residenceCity, 
      residenceCap, 
      schoolId, 
      duan,
      documentType,
      documentNumber,
      documentExpiry,
      hasMedicalCert,
      medicalCertS3Key,
      annualPayment,
      isEpsMember,
      epsCardNumber
    } = body

    // Verifica se l'email o codice fiscale esiste già
    const existingSubscriber = await prisma.subscriber.findFirst({
      where: { 
        OR: [
          { email },
          { fiscalCode }
        ]
      }
    })

    if (existingSubscriber) {
      return NextResponse.json(
        { error: "Un iscritto con questa email o codice fiscale esiste già" },
        { status: 400 }
      )
    }

    // Genera un QR code unico (semplificato)
    const qrCode = `SLWC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Crea l'iscritto
    const subscriber = await prisma.subscriber.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        birthDate: new Date(birthDate),
        birthPlace,
        birthCap,
        fiscalCode: fiscalCode.toUpperCase(),
        residence,
        residenceCity,
        residenceCap,
        schoolId,
        qrCode,
        duan: parseInt(duan),
        documentType: documentType || null,
        documentNumber: documentNumber || null,
        documentExpiry: documentExpiry ? new Date(documentExpiry) : new Date(),
        hasMedicalCert: hasMedicalCert || false,
        medicalCertS3Key: medicalCertS3Key || null,
        annualPayment: annualPayment || false,
        isEpsMember: isEpsMember || false,
        epsCardNumber: epsCardNumber || null
      },
      include: {
        school: {
          select: {
            name: true
          }
        }
      }
    })

    return NextResponse.json(subscriber, { status: 201 })
  } catch (error) {
    console.error("Errore nella creazione iscritto:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
