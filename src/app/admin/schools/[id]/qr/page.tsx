"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import QRCode from "qrcode"
import Link from "next/link"
import Image from "next/image"

interface School {
  id: number
  name: string
  gymName: string | null
  slug: string
}

export default function SchoolQRPage() {
  const params = useParams()
  const [school, setSchool] = useState<School | null>(null)
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [qrLoading, setQrLoading] = useState(false)

  const fetchSchool = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/schools/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setSchool(data)
      }
    } catch (error) {
      console.error("Errore nel caricamento scuola:", error)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    if (params.id) {
      fetchSchool()
    }
  }, [params.id, fetchSchool])

  const generateQRCode = async () => {
    if (!school) return

    setQrLoading(true)
    try {
      // URL per la pagina di iscrizione pubblica
      const registrationURL = `${window.location.origin}/register/${school.slug}`
      
      // Genera il QR Code
      const qrDataURL = await QRCode.toDataURL(registrationURL, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      setQrCodeDataURL(qrDataURL)
    } catch (error) {
      console.error("Errore nella generazione QR Code:", error)
    } finally {
      setQrLoading(false)
    }
  }

  const downloadQRCode = () => {
    if (!qrCodeDataURL || !school) return

    const link = document.createElement('a')
    link.download = `qr-code-${school.slug}.png`
    link.href = qrCodeDataURL
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!school) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">
          <p className="text-red-600">Scuola non trovata</p>
          <Link href="/admin/schools" className="text-indigo-600 hover:text-indigo-900">
            Torna alle scuole
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link 
            href="/admin/schools" 
            className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
          >
            ← Torna alle scuole
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            QR Code per {school.name}
          </h1>
          <p className="mt-2 text-gray-600">
            Genera un QR Code per permettere ai nuovi iscritti di registrarsi a questa scuola
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Informazioni Scuola
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome Scuola</label>
                <p className="mt-1 text-sm text-gray-900">{school.name}</p>
              </div>
              {school.gymName && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome Palestra</label>
                  <p className="mt-1 text-sm text-gray-900">{school.gymName}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">URL Registrazione</label>
                <p className="mt-1 text-sm text-blue-600 font-mono">
                  {typeof window !== 'undefined' ? `${window.location.origin}/register/${school.slug}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                QR Code
              </h3>
              <button
                onClick={generateQRCode}
                disabled={qrLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {qrLoading ? "Generazione..." : "Genera QR Code"}
              </button>
            </div>

            {qrCodeDataURL && (
              <div className="text-center">
                <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                  <Image 
                    src={qrCodeDataURL} 
                    alt={`QR Code per ${school.name}`}
                    width={256}
                    height={256}
                    className="w-64 h-64"
                  />
                </div>
                <div className="mt-4 space-x-3">
                  <button
                    onClick={downloadQRCode}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Scarica PNG
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/register/${school.slug}`)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Copia URL
                  </button>
                </div>
              </div>
            )}

            {!qrCodeDataURL && (
              <div className="text-center py-8 text-gray-500">
                <p>Fai clic su &quot;Genera QR Code&quot; per creare il codice QR</p>
              </div>
            )}
          </div>

          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Istruzioni per l&apos;uso
            </h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• <strong>Stampa il QR Code</strong> e posizionalo in un luogo visibile nella palestra</p>
              <p>• I nuovi iscritti potranno <strong>scannerizzare il codice</strong> con il loro smartphone</p>
              <p>• Verranno <strong>reindirizzati automaticamente</strong> alla pagina di registrazione</p>
              <p>• Potranno <strong>compilare il form</strong> e registrarsi alla scuola</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

