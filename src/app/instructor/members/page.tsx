"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { matchesMemberQuery } from "@/lib/member-search"

interface Subscriber {
  id: number
  firstName: string
  lastName: string
  birthDate: string
  birthPlace: string
  birthCap: string
  fiscalCode: string
  residence: string
  residenceCity: string
  residenceCap: string
  email: string
  phone: string
  duan: number
  documentType?: string
  documentNumber?: string
  documentExpiry?: string
  hasMedicalCert: boolean
  medicalCertS3Key?: string
  slwcJoinDate: string
  annualPayment: boolean
  isEpsMember: boolean
  epsCardNumber?: string
  epsJoinDate?: string
  school: {
    name: string
  }
  createdAt: string
}

export default function InstructorMembersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [query, setQuery] = useState("")

  useEffect(() => {
    fetchSubscribers()
  }, [])

  const fetchSubscribers = async () => {
    try {
      const response = await fetch('/api/instructor/members')
      if (response.ok) {
        const data = await response.json()
        setSubscribers(data)
      }
    } catch (error) {
      console.error('Errore nel caricamento iscritti:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDuanLabel = (duan: number) => {
    if (duan <= 9) {
      return `${duan}° Duan`
    } else {
      const techDuan = duan - 9
      return `${techDuan}° Duan Tecnico`
    }
  }

  const getDocumentTypeLabel = (type?: string) => {
    switch (type) {
      case 'CI': return 'Carta Identità'
      case 'PP': return 'Passaporto'
      case 'PT': return 'Patente'
      default: return type || 'Non specificato'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  const filteredSubscribers = subscribers.filter((subscriber) => matchesMemberQuery(subscriber, query))
  const totalPages = Math.ceil(filteredSubscribers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentSubscribers = filteredSubscribers.slice(startIndex, endIndex)

  const changePage = (page: number) => {
    setCurrentPage(page)
    document.getElementById("elenco-iscritti")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const renderPageButtons = () => totalPages > 1 ? (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => changePage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-charcoal hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
      >
        Precedente
      </button>
      <span className="text-sm text-slate-brand">
        Pagina {currentPage} di {totalPages}
      </span>
      <button
        type="button"
        onClick={() => changePage(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-charcoal hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
      >
        Successiva
      </button>
    </div>
  ) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gold" />
      </div>
    )
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Iscritti</h1>
          <p className="mt-1 text-sm text-slate-brand">
            {query.trim()
              ? `${filteredSubscribers.length} risultati su ${subscribers.length} iscritti`
              : `${subscribers.length} iscritti della tua scuola`}
          </p>
        </div>
      </div>

      <label className="mt-5 block">
        <span className="sr-only">Cerca iscritti</span>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setCurrentPage(1)
          }}
          placeholder="Cerca per nome, email, telefono o codice fiscale"
          className="block min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-base text-ink placeholder:text-gray-400 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
      </label>

      {renderPageButtons() && <div className="mt-4">{renderPageButtons()}</div>}

      <div id="elenco-iscritti" className="mt-6 scroll-mt-20 space-y-4">
        {filteredSubscribers.length === 0 && (
          <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-slate-brand">
            {query.trim()
              ? "Nessun iscritto corrisponde alla ricerca."
              : "Nessun iscritto."}
          </p>
        )}
        {currentSubscribers.map((subscriber) => (
          <article key={subscriber.id} className="overflow-hidden rounded-xl border-t-4 border-gold bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-ink">
                  {subscriber.firstName} {subscriber.lastName}
                </h2>
                <p className="mt-1 text-sm text-slate-brand">{getDuanLabel(subscriber.duan)}</p>
              </div>
              <Link
                href={`/instructor/members/${subscriber.id}/edit`}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-gold px-4 text-sm font-semibold text-ink hover:bg-gold-dark"
              >
                Modifica
              </Link>
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Iscrizione</dt>
                <dd className="mt-0.5 text-ink">{formatDate(subscriber.slwcJoinDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Nascita</dt>
                <dd className="mt-0.5 break-words text-ink">
                  {formatDate(subscriber.birthDate)} · {subscriber.birthPlace} ({subscriber.birthCap})
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Codice fiscale</dt>
                <dd className="mt-0.5 break-all font-mono text-ink">{subscriber.fiscalCode}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Residenza</dt>
                <dd className="mt-0.5 break-words text-ink">
                  {subscriber.residence}
                  <span className="block text-xs text-gray-500">
                    {subscriber.residenceCity} ({subscriber.residenceCap})
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Contatti</dt>
                <dd className="mt-0.5 break-words text-ink">
                  {subscriber.email}
                  <span className="block">{subscriber.phone}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Documento</dt>
                <dd className="mt-0.5 break-words text-ink">
                  {subscriber.documentType ? (
                    <>
                      {getDocumentTypeLabel(subscriber.documentType)}
                      {subscriber.documentNumber && <span className="block text-xs text-gray-500">{subscriber.documentNumber}</span>}
                      {subscriber.documentExpiry && (
                        <span className="block text-xs text-gray-500">Scadenza: {formatDate(subscriber.documentExpiry)}</span>
                      )}
                    </>
                  ) : (
                    "Non specificato"
                  )}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${subscriber.hasMedicalCert ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {subscriber.hasMedicalCert ? "Certificato presente" : "Certificato mancante"}
              </span>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${subscriber.annualPayment ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                {subscriber.annualPayment ? "Pagamento effettuato" : "Pagamento in sospeso"}
              </span>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${subscriber.isEpsMember ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                {subscriber.isEpsMember ? "Membro EPS" : "Non membro EPS"}
              </span>
            </div>
          </article>
        ))}
      </div>

      {filteredSubscribers.length > 0 && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-brand">
            Mostrando {startIndex + 1}-{Math.min(endIndex, filteredSubscribers.length)} di {filteredSubscribers.length} iscritti
          </p>
          {renderPageButtons()}
        </div>
      )}
    </div>
  )
}
