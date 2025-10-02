"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/FormElements"

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
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `iscritti-slwc-${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Errore durante l\'esportazione')
      }
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

  // Calcoli per la paginazione
  const totalPages = Math.ceil(subscribers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentSubscribers = subscribers.slice(startIndex, endIndex)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Iscritti</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gestisci tutti gli iscritti alle scuole di Wing Chun ({subscribers.length} totali)
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none space-x-3">
                 <Button
                   onClick={exportToExcel}
                   disabled={exporting || subscribers.length === 0}
                   variant="primary"
                   loading={exporting}
                   leftIcon={
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                     </svg>
                   }
                 >
                   {exporting ? 'Esportando...' : 'Esporta Excel'}
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

      {/* Controlli paginazione */}
      <div className="mt-4 flex items-center justify-between">
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
        
        {totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Precedente
            </button>
            <span className="text-sm text-gray-700">
              Pagina {currentPage} di {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Successiva
            </button>
          </div>
        )}
      </div>
      
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                           <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Nome
                    </th>
                           <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Iscritto SLWC
                    </th>
                           <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Data Nascita
                    </th>
                           <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Luogo Nascita
                    </th>
                           <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      CF
                    </th>
                           <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Residenza
                    </th>
                           <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Email
                    </th>
                           <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Telefono
                    </th>
                           <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Duan
                    </th>
                           <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Documento
                    </th>
                           <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Cert. Medico
                    </th>
                           <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Pagamento
                    </th>
                           <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      EPS & Info
                    </th>
                           <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Scuola
                    </th>
                    <th scope="col" className="relative px-3 py-3">
                      <span className="sr-only">Azioni</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentSubscribers.map((subscriber) => (
                    <tr key={subscriber.id}>
                             <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                               <div className="flex items-center space-x-2">
                                 <span>{subscriber.firstName} {subscriber.lastName}</span>
                                 {subscriber.isAlsoInstructor && (
                                   <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                     Istruttore
                                   </span>
                                 )}
                               </div>
                             </td>
                             <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                               {formatDate(subscriber.slwcJoinDate)}
                             </td>
                             <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                               {formatDate(subscriber.birthDate)}
                             </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {subscriber.birthPlace} ({subscriber.birthCap})
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {subscriber.fiscalCode}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {subscriber.residence}<br />
                        <span className="text-xs text-gray-400">
                          {subscriber.residenceCity} ({subscriber.residenceCap})
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {subscriber.email}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {subscriber.phone}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getDuanLabel(subscriber.duan)}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {subscriber.documentType ? (
                          <div>
                            <div className="font-medium">{getDocumentTypeLabel(subscriber.documentType)}</div>
                            {subscriber.documentNumber && (
                              <div className="text-xs text-gray-400">{subscriber.documentNumber}</div>
                            )}
                            {subscriber.documentExpiry && (
                              <div className="text-xs text-gray-400">
                                Scadenza: {formatDate(subscriber.documentExpiry)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Non specificato</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {subscriber.hasMedicalCert && subscriber.medicalCertS3Key ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <button
                              onClick={() => downloadMedicalCert(subscriber.medicalCertS3Key!)}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              Scarica
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Non presente
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {subscriber.annualPayment ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Pagato
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Non Pagato
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        <div className="space-y-1">
                          {/* Status EPS */}
                          {subscriber.isEpsMember ? (
                            <div>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Sì
                              </span>
                              {subscriber.epsCardNumber && (
                                <div className="text-xs text-blue-600 font-mono mt-1">
                                  {subscriber.epsCardNumber}
                                </div>
                              )}
                              {subscriber.epsJoinDate && (
                                <div className="text-xs text-green-600 mt-1">
                                  EPS: {formatDate(subscriber.epsJoinDate)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              No
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {subscriber.school.name}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col space-y-1 items-start">
                          <Link href={`/admin/members/${subscriber.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              Modifica
                            </Button>
                          </Link>
                          {!subscriber.isAlsoInstructor ? (
                            <Link href={`/admin/members/promote?subscriberId=${subscriber.id}`}>
                              <Button variant="success" size="sm">
                                Promuovi
                              </Button>
                            </Link>
                          ) : (
                            <Button variant="ghost" size="sm" disabled>
                              Già istruttore
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteClick(subscriber)}
                          >
                            Elimina
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      {subscribers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Nessun iscritto trovato</p>
        </div>
      )}

      {/* Informazioni paginazione */}
      {subscribers.length > 0 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Mostrando {startIndex + 1}-{Math.min(endIndex, subscribers.length)} di {subscribers.length} iscritti
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