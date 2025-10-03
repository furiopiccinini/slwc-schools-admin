import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    
    const instructor = await prisma.instructor.findUnique({
      where: { email },
      include: { school: true }
    })
    
    if (!instructor) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const isPasswordValid = await bcrypt.compare(password, instructor.passwordHash)
    
    return NextResponse.json({
      success: true,
      userFound: true,
      passwordValid: isPasswordValid,
      user: {
        id: instructor.id,
        email: instructor.email,
        name: instructor.name,
        role: instructor.role
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
