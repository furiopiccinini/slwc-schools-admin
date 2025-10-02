"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/FormElements"

interface Instructor {
  id: number
  name: string
  email: string
  role: string
  school: {
    name: string
  }
  createdAt: string
}

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [instructorToDelete, setInstructorToDelete] = useState<Instructor | null>(null)

  useEffect(() => {
    fetchInstructors()
  }, [])

  const fetchInstructors = async () => {
    try {
      const response = await fetch('/api/admin/instructors')
      if (response.ok) {
        const data = await response.json()
        setInstructors(data)
      }
    } catch (error) {
      console.error('Errore nel caricamento istruttori:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (instructor: Instructor) => {
    setInstructorToDelete(instructor)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!instructorToDelete) return

    setDeletingId(instructorToDelete.id)
    
    try {
      const response = await fetch(`/api/admin/instructors?id=${instructorToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Rimuovi l'istruttore dalla lista
        setInstructors(prev => prev.filter(i => i.id !== instructorToDelete.id))
        setShowDeleteModal(false)
        setInstructorToDelete(null)
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
    setInstructorToDelete(null)
  }

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
          <h1 className="text-2xl font-semibold text-gray-900">Istruttori</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gestisci tutti gli istruttori delle scuole di Wing Chun
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link href="/admin/members/promote">
            <Button
              variant="primary"
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
            >
              Promuovi da Iscritto
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Nome
                    </th>
                    <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Ruolo
                    </th>
                    <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Scuola
                    </th>
                    <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Data Creazione
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Azioni</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {instructors.map((instructor) => (
                    <tr key={instructor.id}>
                      <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {instructor.name}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                        {instructor.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          instructor.role === 'ADMIN' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {instructor.role === 'ADMIN' ? 'Admin' : 'Istruttore'}
                        </span>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                        {instructor.school.name}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                        {new Date(instructor.createdAt).toLocaleDateString('it-IT')}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col space-y-1 items-start">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {/* TODO: Implement edit */}}
                          >
                            Modifica
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteClick(instructor)}
                            disabled={deletingId === instructor.id}
                            loading={deletingId === instructor.id}
                          >
                            {deletingId === instructor.id ? 'Eliminando...' : 'Elimina'}
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
      
      {instructors.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Nessun istruttore trovato</p>
        </div>
      )}

      {/* Modal di conferma eliminazione */}
      {showDeleteModal && instructorToDelete && (
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
                  Sei sicuro di voler eliminare l&apos;istruttore <strong>{instructorToDelete.name}</strong>?
                  Questa azione non può essere annullata.
                </p>
              </div>
              <div className="items-center px-4 py-3 space-y-3">
                <Button
                  onClick={handleDeleteConfirm}
                  disabled={deletingId === instructorToDelete.id}
                  loading={deletingId === instructorToDelete.id}
                  variant="danger"
                  className="w-full"
                >
                  {deletingId === instructorToDelete.id ? 'Eliminando...' : 'Elimina'}
                </Button>
                <Button
                  onClick={handleDeleteCancel}
                  disabled={deletingId === instructorToDelete.id}
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
