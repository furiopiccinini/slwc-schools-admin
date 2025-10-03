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
    // Chiedi la password all'utente
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const password = await new Promise((resolve) => {
      rl.question('Inserisci la password per l\'admin: ', (answer) => {
        rl.close()
        resolve(answer)
      })
    })
    
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // 3. Chiedi i dati dell'admin
    const adminEmail = await new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
      rl.question('Inserisci l\'email dell\'admin: ', (answer) => {
        rl.close()
        resolve(answer)
      })
    })
    
    const adminName = await new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
      rl.question('Inserisci il nome dell\'admin: ', (answer) => {
        rl.close()
        resolve(answer)
      })
    })
    
    // 4. Creazione utente admin
    let admin = await prisma.instructor.findUnique({
      where: { email: adminEmail }
    })
    
    if (!admin) {
      admin = await prisma.instructor.create({
        data: {
          name: adminName,
          email: adminEmail,
          passwordHash: hashedPassword,
          role: 'ADMIN',
          schoolId: school.id
        }
      })
      console.log('✅ Admin creato con successo!')
    } else {
      console.log('⚠️  Admin già esistente')
    }
    
    // 4. Chiedi se creare un istruttore di test
    const createInstructor = await new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
      rl.question('Vuoi creare un istruttore di test? (y/n): ', (answer) => {
        rl.close()
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
      })
    })
    
    if (createInstructor) {
      const instructorEmail = await new Promise((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        })
        rl.question('Inserisci l\'email dell\'istruttore: ', (answer) => {
          rl.close()
          resolve(answer)
        })
      })
      
      const instructorName = await new Promise((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        })
        rl.question('Inserisci il nome dell\'istruttore: ', (answer) => {
          rl.close()
          resolve(answer)
        })
      })
      
      const instructorPassword = await new Promise((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        })
        rl.question('Inserisci la password per l\'istruttore: ', (answer) => {
          rl.close()
          resolve(answer)
        })
      })
      
      let instructor = await prisma.instructor.findUnique({
        where: { email: instructorEmail }
      })
      
      if (!instructor) {
        const hashedInstructorPassword = await bcrypt.hash(instructorPassword, 12)
        instructor = await prisma.instructor.create({
          data: {
            name: instructorName,
            email: instructorEmail,
            passwordHash: hashedInstructorPassword,
            role: 'INSTRUCTOR',
            schoolId: school.id
          }
        })
        console.log('✅ Istruttore creato!')
      } else {
        console.log('⚠️  Istruttore già esistente')
      }
    }
    
    console.log('\n🎉 SETUP COMPLETATO!')
    console.log('👑 Admin creato con successo!')
    if (createInstructor) {
      console.log('👨‍🏫 Istruttore creato con successo!')
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
