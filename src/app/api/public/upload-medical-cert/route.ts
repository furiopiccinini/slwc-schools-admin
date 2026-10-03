import { NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileName, fileType } = body

    console.log('Public upload medical cert request:', { fileName, fileType })

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "Nome file e tipo richiesti" },
        { status: 400 }
      )
    }

    // Verifica che le variabili d'ambiente siano presenti
    console.log('Environment check:', {
      AWS_REGION: process.env.AWS_REGION,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Missing',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Missing',
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET
    })

    if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_S3_BUCKET) {
      console.error('Variabili AWS mancanti:', {
        AWS_REGION: !!process.env.AWS_REGION,
        AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
        AWS_S3_BUCKET: !!process.env.AWS_S3_BUCKET
      })
      return NextResponse.json(
        { error: "Configurazione AWS non completa" },
        { status: 500 }
      )
    }

    // Genera un nome file unico
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const key = `medical-certificates/${timestamp}-${randomString}-${fileName}`

    // Solo Bucket/Key/ContentType: i Metadata andrebbero firmati e il browser
    // non li invia nel PUT, causando 403 SignatureDoesNotMatch su S3.
    const contentType = fileType || "application/octet-stream"
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      ContentType: contentType,
    })

    console.log('Generating presigned URL for key:', key)
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    console.log('Presigned URL generated successfully')

    return NextResponse.json({
      signedUrl,
      key,
      contentType,
      bucket: process.env.AWS_S3_BUCKET
    })

  } catch (error) {
    console.error("Errore nella generazione URL upload:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}