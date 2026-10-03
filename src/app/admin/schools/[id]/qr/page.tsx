"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import QRCode from "qrcode"
import Link from "next/link"
import Image from "next/image"
import { getSchoolRegistrationUrl } from "@/lib/public-url"

interface School {
  id: number
  name: string
  gymName: string | null
  slug: string
}

export default function SchoolQRPage() {
  const params = useParams()
  const [school, setSchool] = useState<School | null>(null)
  const [registrationURL, setRegistrationURL] = useState("")
  const [qrCodeDataURL, setQrCodeDataURL] = useState("")
  const [loading, setLoading] = useState(true)
  const [qrLoading, setQrLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchSchool = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/schools/${params.id}`, {
        credentials: "include",
      })
      if (!response.ok) {
        setError("Scuola non trovata")
        return
      }
      const data = await response.json()
      setSchool(data)
      setRegistrationURL(getSchoolRegistrationUrl(data.slug))
    } catch (err) {
      console.error("Errore nel caricamento scuola:", err)
      setError("Errore nel caricamento scuola")
    } finally {
      setLoading(false)
    }
  }, [params.id])

  const generateQRCode = useCallback(async (url: string) => {
    setQrLoading(true)
    setError("")
    try {
      const qrDataURL = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
      setQrCodeDataURL(qrDataURL)
    } catch (err) {
      console.error("Errore nella generazione QR Code:", err)
      setError("Impossibile generare il QR Code")
    } finally {
      setQrLoading(false)
    }
  }, [])

  useEffect(() => {
    if (params.id) {
      void fetchSchool()
    }
  }, [params.id, fetchSchool])

  useEffect(() => {
    if (registrationURL) {
      void generateQRCode(registrationURL)
    }
  }, [registrationURL, generateQRCode])

  const downloadQRCode = () => {
    if (!qrCodeDataURL || !school) return

    const link = document.createElement("a")
    link.download = `qr-code-${school.slug}.png`
    link.href = qrCodeDataURL
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!school) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">
          <p className="text-red-600">{error || "Scuola non trovata"}</p>
          <Link href="/admin/schools" className="text-indigo-600 hover:text-indigo-900">
            Torna alle scuole
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            href="/admin/schools"
            className="mb-4 inline-block text-indigo-600 hover:text-indigo-900"
          >
            ← Torna alle scuole
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            QR Code per {school.name}
          </h1>
          <p className="mt-2 text-slate-600">
            Gli iscritti scansionano questo codice e aprono il form di registrazione
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Nome Scuola</p>
              <p className="mt-1 text-slate-900">{school.name}</p>
            </div>
            {school.gymName && (
              <div>
                <p className="text-sm font-medium text-slate-500">Palestra</p>
                <p className="mt-1 text-slate-900">{school.gymName}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-slate-500">URL nel QR Code</p>
              <p className="mt-1 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm text-indigo-700">
                {registrationURL}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Usa sempre questo URL pubblico (non localhost), altrimenti dal telefono non funziona.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            {error && (
              <p className="mb-4 text-sm text-red-600">{error}</p>
            )}

            {qrLoading && (
              <div className="py-10 text-center text-slate-500">Generazione QR Code...</div>
            )}

            {qrCodeDataURL && !qrLoading && (
              <div className="text-center">
                <div className="inline-block rounded-xl border-2 border-slate-200 bg-white p-4">
                  <Image
                    src={qrCodeDataURL}
                    alt={`QR Code per ${school.name}`}
                    width={256}
                    height={256}
                    className="h-64 w-64"
                    unoptimized
                  />
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={downloadQRCode}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Scarica PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(registrationURL)}
                    className="rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Copia URL
                  </button>
                  <a
                    href={registrationURL}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Apri form
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-6">
            <h3 className="mb-3 text-lg font-semibold text-slate-900">Istruzioni</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p>• Stampa il QR Code e mettilo in palestra</p>
              <p>• Gli iscritti lo scansionano con lo smartphone</p>
              <p>• Si apre il form di registrazione per questa scuola</p>
              <p>• Se cambi lo slug della scuola, rigenera e ristampa il QR</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
