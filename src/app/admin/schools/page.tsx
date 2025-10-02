"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface School {
  id: number
  name: string
  gymName: string | null
  slug: string
  address: string | null
  createdAt: string
  _count: {
    instructors: number
    subscribers?: number
    members?: number
  }
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSchools()
  }, [])

  const fetchSchools = async () => {
    try {
      const response = await fetch("/api/admin/schools")
      if (response.ok) {
        const data = await response.json()
        setSchools(data || [])
      } else {
        console.error("Error response:", response.status)
        setSchools([])
      }
    } catch (error) {
      console.error("Error fetching schools:", error)
      setSchools([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (schoolId: number) => {
    if (!confirm("Sei sicuro di voler eliminare questa scuola?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/schools/${schoolId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        fetchSchools() // Refresh the list
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Errore durante l'eliminazione")
      }
    } catch (error) {
      console.error("Error deleting school:", error)
      alert("Errore durante l'eliminazione")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Scuole</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gestisci tutte le scuole dell&apos;associazione
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            href="/admin/schools/new"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            Aggiungi Scuola
          </Link>
        </div>
      </div>
      
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome Scuola
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome Palestra
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slug
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Indirizzo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Istruttori
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Iscritti
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Creazione
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Azioni</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {schools && schools.length > 0 ? schools.map((school) => (
                    <tr key={school.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {school.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {school.gymName || "Non specificato"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {school.slug}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {school.address || "Non specificato"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {school._count.instructors}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {school._count.subscribers ?? school._count.members ?? 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(school.createdAt).toLocaleDateString("it-IT")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/admin/schools/${school.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Modifica
                        </Link>
                        <Link
                          href={`/admin/schools/${school.id}/qr`}
                          className="text-green-600 hover:text-green-900 mr-4"
                        >
                          QR Code
                        </Link>
                        <button
                          onClick={() => handleDelete(school.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Elimina
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                        Nessuna scuola trovata
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
