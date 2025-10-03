import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection
    const instructors = await prisma.instructor.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      instructors: instructors
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
