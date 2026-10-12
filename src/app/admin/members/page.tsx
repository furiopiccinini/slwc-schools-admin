"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/FormElements"
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
  isAlsoInstructor: boolean
  school: {
    name: string
  }
  createdAt: string
}

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [query, setQuery] = useState("")
  const [exporting, setExporting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [subscriberToDelete, setSubscriberToDelete] = useState<Subscriber | null>(null)

  useEffect(() => {
    fetchSubscribers()
  }, [])

  const fetchSubscribers = async () => {
    try {
      const response = await fetch('/api/admin/members')
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

  const downloadMedicalCert = async (s3Key: string) => {
    try {
      const response = await fetch(`/api/admin/download-medical-cert?key=${encodeURIComponent(s3Key)}`)
      if (response.ok) {
        const blob = await response.blob()
        
        // Estrai il nome del file dalla chiave S3
        const fileName = s3Key.split('/').pop() || 'certificato-medico'
        
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Errore nel download del certificato medico')
      }
    } catch (error) {
      console.error('Errore download:', error)
      alert('Errore nel download del certificato medico')
    }
  }

  const exportToExcel = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/admin/export-subscribers')
      const contentType = response.headers.get('content-type') || ''
      if (!response.ok || contentType.includes('application/json')) {
        const data = await response.json().catch(() => null)
        alert(data?.error || 'Errore durante l\'esportazione')
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const disposition = response.headers.get('content-disposition') || ''
      const filename = disposition.match(/filename="([^"]+)"/)?.[1]
        || `caricamentoTessere-${new Date().getFullYear()}.xls`
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Errore esportazione:', error)
      alert('Errore durante l\'esportazione')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteClick = (subscriber: Subscriber) => {
    setSubscriberToDelete(subscriber)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!subscriberToDelete) return

    setDeletingId(subscriberToDelete.id)
    
    try {
      const response = await fetch(`/api/admin/members/${subscriberToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Rimuovi l'iscritto dalla lista
        setSubscribers(prev => prev.filter(s => s.id !== subscriberToDelete.id))
        setShowDeleteModal(false)
        setSubscriberToDelete(null)
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Errore durante l\'eliminazione')
      }
    } catch (error) {
      console.error('Errore durante l\'eliminazione:', error)
      alert('Errore durante l\'eliminazione')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setSubscriberToDelete(null)
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
      <div className="flex justify-center items-center h-64">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gold" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Iscritti</h1>
          <p className="mt-1 text-sm text-slate-brand">
            {query.trim()
              ? `${filteredSubscribers.length} risultati su ${subscribers.length} iscritti`
              : `${subscribers.length} iscritti`}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
                 <Button
                   onClick={exportToExcel}
                   disabled={exporting || subscribers.length === 0}
                   variant="primary"
                   loading={exporting}
                   title="Crea il file Libertas per chi ha pagato l'anno e non ha ancora il numero tessera EPS"
                   leftIcon={
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                     </svg>
                   }
                 >
                   {exporting ? 'Esportando...' : 'Esporta non tesserati'}
                 </Button>
                 <Link href="/admin/members/new">
                   <Button
                     variant="success"
                     leftIcon={
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                       </svg>
                     }
                   >
                     Aggiungi Iscritto
                   </Button>
                 </Link>
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

      {/* Controlli paginazione */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Mostra:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value))
              setCurrentPage(1)
            }}
            className="rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-700">iscritti per pagina</span>
        </div>
        
        {renderPageButtons()}
      </div>
      
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
                <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold text-gray-900">
                  <span>{subscriber.firstName} {subscriber.lastName}</span>
                  {subscriber.isAlsoInstructor && (
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                      Istruttore
                    </span>
                  )}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {subscriber.school?.name || "Scuola non indicata"} · {getDuanLabel(subscriber.duan)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/members/${subscriber.id}/edit`}>
                  <Button variant="ghost" size="sm">Modifica</Button>
                </Link>
                {!subscriber.isAlsoInstructor ? (
                  <Link href={`/admin/members/promote?subscriberId=${subscriber.id}`}>
                    <Button variant="success" size="sm">Promuovi</Button>
                  </Link>
                ) : (
                  <Button variant="ghost" size="sm" disabled>Già istruttore</Button>
                )}
                <Button variant="danger" size="sm" onClick={() => handleDeleteClick(subscriber)}>
                  Elimina
                </Button>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Iscrizione SLWC</dt>
                <dd className="mt-0.5 text-gray-900">{formatDate(subscriber.slwcJoinDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Nascita</dt>
                <dd className="mt-0.5 break-words text-gray-900">
                  {formatDate(subscriber.birthDate)} · {subscriber.birthPlace} ({subscriber.birthCap})
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Codice fiscale</dt>
                <dd className="mt-0.5 break-all font-mono text-gray-900">{subscriber.fiscalCode}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Residenza</dt>
                <dd className="mt-0.5 break-words text-gray-900">
                  {subscriber.residence}
                  <span className="block text-xs text-gray-500">
                    {subscriber.residenceCity} ({subscriber.residenceCap})
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Contatti</dt>
                <dd className="mt-0.5 break-words text-gray-900">
                  {subscriber.email}
                  <span className="block text-xs text-gray-500">{subscriber.phone}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Documento</dt>
                <dd className="mt-0.5 break-words text-gray-900">
                  {subscriber.documentType ? (
                    <>
                      {getDocumentTypeLabel(subscriber.documentType)}
                      {subscriber.documentNumber && (
                        <span className="block text-xs text-gray-500">{subscriber.documentNumber}</span>
                      )}
                      {subscriber.documentExpiry && (
                        <span className="block text-xs text-gray-500">Scadenza: {formatDate(subscriber.documentExpiry)}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400">Non specificato</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Certificato medico</dt>
                <dd className="mt-0.5">
                  {subscriber.hasMedicalCert && subscriber.medicalCertS3Key ? (
                    <button
                      onClick={() => downloadMedicalCert(subscriber.medicalCertS3Key!)}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      Scarica
                    </button>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                      Non presente
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Pagamento annuale</dt>
                <dd className="mt-0.5">
                  {subscriber.annualPayment ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Pagato
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                      Non pagato
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Tessera EPS</dt>
                <dd className="mt-0.5 break-words text-gray-900">
                  {subscriber.isEpsMember ? (
                    <>
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Sì
                      </span>
                      {subscriber.epsCardNumber && (
                        <span className="mt-1 block font-mono text-xs text-blue-700">{subscriber.epsCardNumber}</span>
                      )}
                      {subscriber.epsJoinDate && (
                        <span className="mt-1 block text-xs text-gray-500">Iscrizione: {formatDate(subscriber.epsJoinDate)}</span>
                      )}
                    </>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                      No
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      
      {subscribers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Nessun iscritto trovato</p>
        </div>
      )}

      {filteredSubscribers.length > 0 && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-brand">
            Mostrando {startIndex + 1}-{Math.min(endIndex, filteredSubscribers.length)} di {filteredSubscribers.length} iscritti
          </p>
          {renderPageButtons()}
        </div>
      )}

      {/* Modal di conferma eliminazione */}
      {showDeleteModal && subscriberToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Conferma eliminazione</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Sei sicuro di voler eliminare l&apos;iscritto <strong>{subscriberToDelete.firstName} {subscriberToDelete.lastName}</strong>?
                  Questa azione non può essere annullata.
                </p>
              </div>
                     <div className="items-center px-4 py-3 space-y-3">
                       <Button
                         onClick={handleDeleteConfirm}
                         disabled={deletingId === subscriberToDelete.id}
                         loading={deletingId === subscriberToDelete.id}
                         variant="danger"
                         className="w-full"
                       >
                         {deletingId === subscriberToDelete.id ? 'Eliminando...' : 'Elimina'}
                       </Button>
                       <Button
                         onClick={handleDeleteCancel}
                         disabled={deletingId === subscriberToDelete.id}
                         variant="ghost"
                         className="w-full"
                       >
                         Annulla
                       </Button>
                     </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}