import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection and get all subscribers
    const subscribers = await prisma.subscriber.findMany({
      include: {
        school: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json({
      success: true,
      count: subscribers.length,
      subscribers: subscribers.map(sub => ({
        id: sub.id,
        firstName: sub.firstName,
        lastName: sub.lastName,
        email: sub.email,
        schoolName: sub.school.name,
        schoolSlug: sub.school.slug,
        createdAt: sub.createdAt,
        duan: sub.duan
      }))
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
