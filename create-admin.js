const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    console.log('🔄 Creazione dati di test...')
    
    // 1. Creazione scuola principale
    let school = await prisma.school.findFirst({
      where: { slug: 'slwc-main' }
    })
    
    if (!school) {
      school = await prisma.school.create({
        data: {
          name: 'SLWC - Scuola Principale',
          gymName: 'Palazzetto dello Sport Roma',
          slug: 'slwc-main',
          address: 'Via Roma 123, 00100 Roma'
        }
      })
      console.log('✅ Scuola principale creata')
    } else {
      console.log('⚠️  Scuola principale già esistente')
    }
    
    // 2. Hash della password
    const hashedPassword = await bcrypt.hash('slwcadmin2026!', 12)
    
    // 3. Creazione utente admin
    let admin = await prisma.instructor.findUnique({
      where: { email: 'furiopiccinini@gmail.com' }
    })
    
    if (!admin) {
      admin = await prisma.instructor.create({
        data: {
          name: 'Furio Piccinini',
          email: 'furiopiccinini@gmail.com',
          passwordHash: hashedPassword,
          role: 'ADMIN',
          schoolId: school.id
        }
      })
      console.log('✅ Admin creato con successo!')
    } else {
      console.log('⚠️  Admin già esistente')
    }
    
    // 4. Creazione istruttore di test
    let instructor = await prisma.instructor.findUnique({
      where: { email: 'mario.rossi@wingchun-roma.it' }
    })
    
    if (!instructor) {
      const instructorPassword = await bcrypt.hash('instructor123', 12)
      instructor = await prisma.instructor.create({
        data: {
          name: 'Mario Rossi',
          email: 'mario.rossi@wingchun-roma.it',
          passwordHash: instructorPassword,
          role: 'INSTRUCTOR',
          schoolId: school.id
        }
      })
      console.log('✅ Istruttore di test creato')
    } else {
      console.log('⚠️  Istruttore già esistente')
    }
    
    console.log('\n🎉 DATI DI TEST CREATI:')
    console.log('👑 Admin:')
    console.log('   📧 Email: furiopiccinini@gmail.com')
    console.log('   🔑 Password: slwcadmin2026!')
    console.log('👨‍🏫 Istruttore:')
    console.log('   📧 Email: mario.rossi@wingchun-roma.it')
    console.log('   🔑 Password: instructor123')
    
  } catch (error) {
    console.error('❌ Errore:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
