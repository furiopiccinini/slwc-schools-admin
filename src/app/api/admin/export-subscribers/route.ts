import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

import { prisma } from "@/lib/prisma"
import * as XLSX from 'xlsx'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    // Recupera tutti gli iscritti con le informazioni complete
    const subscribers = await prisma.subscriber.findMany({
      include: {
        school: {
          select: {
            name: true,
            gymName: true,
            address: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Prepara i dati per l'Excel
    const excelData = subscribers.map((subscriber) => ({
      'ID': subscriber.id,
      'Nome': subscriber.firstName,
      'Cognome': subscriber.lastName,
      'Data di Nascita': new Date(subscriber.birthDate).toLocaleDateString('it-IT'),
      'Luogo di Nascita': subscriber.birthPlace,
      'CAP Nascita': subscriber.birthCap,
      'Codice Fiscale': subscriber.fiscalCode,
      'Residenza': subscriber.residence,
      'Comune Residenza': subscriber.residenceCity,
      'CAP Residenza': subscriber.residenceCap,
      'Email': subscriber.email,
      'Telefono': subscriber.phone,
      'Duan': subscriber.duan <= 9 ? `${subscriber.duan}° Duan` : `${subscriber.duan - 9}° Duan Tecnico`,
      'Tipo Documento': subscriber.documentType === 'CI' ? 'Carta Identità' : 
                       subscriber.documentType === 'PP' ? 'Passaporto' : 
                       subscriber.documentType === 'PT' ? 'Patente' : subscriber.documentType || '',
      'Numero Documento': subscriber.documentNumber || '',
      'Scadenza Documento': subscriber.documentExpiry ? new Date(subscriber.documentExpiry).toLocaleDateString('it-IT') : '',
      'Certificato Medico': subscriber.hasMedicalCert ? 'Sì' : 'No',
      'Data Iscrizione SLWC': new Date(subscriber.slwcJoinDate).toLocaleDateString('it-IT'),
      'Pagamento Annuale': subscriber.annualPayment ? 'Sì' : 'No',
      'Iscritto EPS': subscriber.isEpsMember ? 'Sì' : 'No',
      'Numero Tessera EPS': subscriber.epsCardNumber || '',
      'Scuola': subscriber.school.name,
      'Nome Palestra': subscriber.school.gymName || '',
      'Indirizzo Scuola': subscriber.school.address || '',
      'Data Creazione': new Date(subscriber.createdAt).toLocaleDateString('it-IT')
    }))

    // Crea il workbook Excel
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    
    // Imposta la larghezza delle colonne
    const columnWidths = [
      { wch: 5 },   // ID
      { wch: 15 },  // Nome
      { wch: 15 },  // Cognome
      { wch: 12 },  // Data di Nascita
      { wch: 20 },  // Luogo di Nascita
      { wch: 10 },  // CAP Nascita
      { wch: 18 },  // Codice Fiscale
      { wch: 25 },  // Residenza
      { wch: 20 },  // Comune Residenza
      { wch: 10 },  // CAP Residenza
      { wch: 25 },  // Email
      { wch: 15 },  // Telefono
      { wch: 12 },  // Duan
      { wch: 15 },  // Tipo Documento
      { wch: 20 },  // Numero Documento
      { wch: 12 },  // Scadenza Documento
      { wch: 12 },  // Certificato Medico
      { wch: 12 },  // Data Iscrizione SLWC
      { wch: 12 },  // Pagamento Annuale
      { wch: 10 },  // Iscritto EPS
      { wch: 15 },  // Numero Tessera EPS
      { wch: 20 },  // Scuola
      { wch: 20 },  // Nome Palestra
      { wch: 30 },  // Indirizzo Scuola
      { wch: 12 }   // Data Creazione
    ]
    
    worksheet['!cols'] = columnWidths

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Iscritti SLWC')

    // Genera il buffer Excel
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Restituisce il file Excel
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="iscritti-slwc-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error) {
    console.error("Errore nell'esportazione Excel:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
