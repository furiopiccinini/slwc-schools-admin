import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createTessereWorkbook, currentTesseramentoYear } from "@/lib/libertas-tessere"

export const runtime = "nodejs"

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const pending = await prisma.subscriber.findMany({
      where: {
        annualPayment: true,
        epsJoinDate: null,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    })

    if (pending.length === 0) {
      return NextResponse.json(
        { error: "Nessun iscritto con pagamento annuale effettuato e senza data di iscrizione EPS da esportare." },
        { status: 404 }
      )
    }

    const year = currentTesseramentoYear()
    const excelBuffer = createTessereWorkbook(
      pending.map((subscriber) => ({
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        birthDate: subscriber.birthDate,
        birthPlace: subscriber.birthPlace,
        birthCap: subscriber.birthCap,
        fiscalCode: subscriber.fiscalCode,
        residence: subscriber.residence,
        residenceCity: subscriber.residenceCity,
        residenceCap: subscriber.residenceCap,
        email: subscriber.email,
        phone: subscriber.phone,
      })),
      year
    )

    return new NextResponse(new Uint8Array(excelBuffer), {
      headers: {
        "Content-Type": "application/vnd.ms-excel",
        "Content-Disposition": `attachment; filename="caricamentoTessere-${year}.xls"`,
        "Cache-Control": "no-store",
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
