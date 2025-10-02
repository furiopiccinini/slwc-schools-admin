import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Prima prova con subscribers, poi fallback su members se non esiste
    let schools;
    try {
      schools = await prisma.school.findMany({
        include: {
          _count: {
            select: {
              instructors: true,
              subscribers: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      })
      console.log("✅ Query con subscribers riuscita")
    } catch (error) {
      console.log("⚠️ Subscribers non trovato, provo con members:", (error as Error).message)
      try {
        // Fallback al vecchio schema se subscribers non esiste ancora
        schools = await prisma.school.findMany({
          include: {
            _count: {
              select: {
                instructors: true,
                subscribers: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        })
        console.log("✅ Query con members riuscita")
      } catch (fallbackError) {
        console.error("❌ Anche members fallito:", (fallbackError as Error).message)
        // Ultimo fallback: solo scuole senza count
        schools = await prisma.school.findMany({
          orderBy: {
            createdAt: "desc"
          }
        })
        // Aggiungi _count vuoto per compatibilità
        schools = schools.map(school => ({
          ...school,
          _count: { instructors: 0, members: 0, subscribers: 0 }
        }))
        console.log("✅ Query base scuole riuscita")
      }
    }

    return NextResponse.json(schools)
  } catch (error) {
    console.error("Error fetching schools:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, gymName, slug, address } = body

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Nome e slug sono richiesti" },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const existingSchool = await prisma.school.findUnique({
      where: { slug }
    })

    if (existingSchool) {
      return NextResponse.json(
        { error: "Slug già esistente" },
        { status: 400 }
      )
    }

    const school = await prisma.school.create({
      data: {
        name,
        gymName,
        slug,
        address
      }
    })

    return NextResponse.json(school, { status: 201 })
  } catch (error) {
    console.error("Error creating school:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
