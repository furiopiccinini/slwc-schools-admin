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
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gold" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Scuole</h1>
          <p className="mt-1 text-sm text-slate-brand">
            Gestisci tutte le scuole dell&apos;associazione
          </p>
        </div>
        <Link
          href="/admin/schools/new"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-gold px-4 text-sm font-semibold text-ink hover:bg-gold-dark"
        >
          Aggiungi scuola
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        {schools && schools.length > 0 ? schools.map((school) => (
          <article key={school.id} className="rounded-xl border-t-4 border-gold bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-ink">{school.name}</h2>
                <p className="mt-1 text-sm text-slate-brand">{school.gymName || "Palestra non indicata"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/schools/${school.id}/edit`}
                  className="inline-flex min-h-10 items-center rounded-lg bg-gold px-3 text-sm font-semibold text-ink"
                >
                  Modifica
                </Link>
                <Link
                  href={`/admin/schools/${school.id}/qr`}
                  className="inline-flex min-h-10 items-center rounded-lg bg-charcoal px-3 text-sm font-semibold text-white"
                >
                  QR Code
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(school.id)}
                  className="inline-flex min-h-10 items-center rounded-lg bg-red-600 px-3 text-sm font-semibold text-white"
                >
                  Elimina
                </button>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Istruttori</dt>
                <dd className="mt-0.5 text-ink">{school._count.instructors}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Iscritti</dt>
                <dd className="mt-0.5 text-ink">{school._count.subscribers ?? school._count.members ?? 0}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Indirizzo</dt>
                <dd className="mt-0.5 break-words text-ink">{school.address || "Non specificato"}</dd>
              </div>
            </dl>
          </article>
        )) : (
          <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-slate-brand">Nessuna scuola trovata</p>
        )}
      </div>
    </div>
  )
}
