import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(_request: NextRequest) {
  try {
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
      medicalCertS3Key
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

    // Genera un QR code unico per l'iscritto
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
        documentExpiry: documentExpiry ? new Date(documentExpiry) : null,
        hasMedicalCert: hasMedicalCert || false,
        medicalCertS3Key: medicalCertS3Key || null,
        annualPayment: false, // Sempre false per registrazioni pubbliche
        isEpsMember: false, // Sempre false per registrazioni pubbliche
        epsCardNumber: null // Sempre null per registrazioni pubbliche
      },
      include: {
        school: {
          select: {
            name: true
          }
        }
      }
    })

    // TODO: Invia email di conferma all'iscritto
    // TODO: Invia notifica all'istruttore della scuola

    return NextResponse.json({
      success: true,
      subscriber: {
        id: subscriber.id,
        name: `${subscriber.firstName} ${subscriber.lastName}`,
        school: subscriber.school.name
      }
    }, { status: 201 })

  } catch (error) {
    console.error("Errore nella registrazione pubblica:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
