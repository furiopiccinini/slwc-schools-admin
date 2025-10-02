import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const requestedFileName = searchParams.get('filename')

    if (!key) {
      return NextResponse.json(
        { error: "Chiave file richiesta" },
        { status: 400 }
      )
    }

    try {
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
      })

      const response = await s3Client.send(command)
      
      if (!response.Body) {
        return NextResponse.json(
          { error: "File non trovato" },
          { status: 404 }
        )
      }

      const buffer = await response.Body.transformToByteArray()
      
      // Usa il nome del file richiesto o estrai dalla chiave S3
      const fileName = requestedFileName || key.split('/').pop() || 'certificato-medico'
      
      // Determina il tipo MIME basato sull'estensione del file
      let contentType = response.ContentType || 'application/octet-stream'
      const finalFileName = fileName
      
      if (fileName.toLowerCase().endsWith('.png')) {
        contentType = 'image/png'
      } else if (fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg')) {
        contentType = 'image/jpeg'
      } else if (fileName.toLowerCase().endsWith('.pdf')) {
        contentType = 'application/pdf'
      } else if (fileName.toLowerCase().endsWith('.gif')) {
        contentType = 'image/gif'
      } else if (fileName.toLowerCase().endsWith('.webp')) {
        contentType = 'image/webp'
      }
      
      return new NextResponse(buffer as any, { // eslint-disable-line @typescript-eslint/no-explicit-any
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${finalFileName}"`,
        },
      })
    } catch (s3Error) {
      console.error('Errore S3:', s3Error)
      return NextResponse.json(
        { error: "Errore nel recupero del file" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Errore nel download certificato medico:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}
