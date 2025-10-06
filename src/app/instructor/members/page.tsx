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

  const totalPages = Math.ceil(subscribers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentSubscribers = subscribers.slice(startIndex, endIndex)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Iscritti</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gestisci gli iscritti della tua scuola
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Nome
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Data Iscrizione
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Data Nascita
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Luogo Nascita
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Codice Fiscale
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Residenza
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Email
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Telefono
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Duan
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Documento
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Certificato Medico
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Pagamento Annuale
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Membro EPS
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentSubscribers.map((subscriber) => (
                    <tr key={subscriber.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {subscriber.firstName} {subscriber.lastName}
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
                        {subscriber.hasMedicalCert ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Presente
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Mancante
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {subscriber.annualPayment ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Pagato
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            In sospeso
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {subscriber.isEpsMember ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Sì
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                        <Link
                          href={`/instructor/members/${subscriber.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Modifica
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Paginazione */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Precedente
            </Button>
            <Button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Successivo
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
                <span className="font-medium">{Math.min(endIndex, subscribers.length)}</span> di{' '}
                <span className="font-medium">{subscribers.length}</span> risultati
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <Button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  Precedente
                </Button>
                <Button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  Successivo
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
