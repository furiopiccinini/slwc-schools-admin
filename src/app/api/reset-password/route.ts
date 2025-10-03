import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, newPassword } = await request.json()
    
    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    // Update the user's password
    const updatedUser = await prisma.instructor.update({
      where: { email },
      data: { passwordHash: hashedPassword },
      select: { id: true, email: true, name: true }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      user: updatedUser
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
