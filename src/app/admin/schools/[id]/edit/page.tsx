"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const schoolSchema = z.object({
  name: z.string().min(2, "Nome deve essere di almeno 2 caratteri"),
  gymName: z.string().optional(),
  slug: z.string().min(2, "Slug deve essere di almeno 2 caratteri"),
  address: z.string().min(5, "Indirizzo deve essere di almeno 5 caratteri")
})

type SchoolForm = z.infer<typeof schoolSchema>

interface School {
  id: number
  name: string
  gymName: string | null
  slug: string
  address: string | null
}

export default function EditSchoolPage() {
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const router = useRouter()
  const params = useParams()
  const schoolId = params.id as string

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<SchoolForm>({
    resolver: zodResolver(schoolSchema)
  })

  const fetchSchool = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/schools/${schoolId}`)
      if (response.ok) {
        const data = await response.json()
        setSchool(data)
        reset({
          name: data.name,
          gymName: data.gymName || '',
          slug: data.slug,
          address: data.address || ''
        })
      } else {
        console.error('Errore nel caricamento scuola')
        router.push('/admin/schools')
      }
    } catch (error) {
      console.error('Errore:', error)
      router.push('/admin/schools')
    } finally {
      setPageLoading(false)
    }
  }, [schoolId, reset, router])

  useEffect(() => {
    if (schoolId) {
      fetchSchool()
    }
  }, [schoolId, fetchSchool])

  const onSubmit = async (data: SchoolForm) => {
    setLoading(true)
    
    try {
      const response = await fetch(`/api/admin/schools/${schoolId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        router.push('/admin/schools')
      } else {
        console.error('Errore nell\'aggiornamento scuola')
      }
    } catch (error) {
      console.error('Errore:', error)
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) {
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
          <p className="text-gray-500">Scuola non trovata</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Modifica Scuola
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Aggiorna le informazioni della scuola di Wing Chun
            </p>
          </div>
        </div>
        <div className="mt-5 md:col-span-2 md:mt-0">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="shadow sm:overflow-hidden sm:rounded-md">
              <div className="space-y-6 bg-white px-4 py-5 sm:p-6">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Informazioni Scuola</h3>
                  </div>
                  
                  <div className="col-span-6">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Nome Scuola *
                    </label>
                    <input
                      {...register("name")}
                      type="text"
                      placeholder="Es. SLWC - Scuola Roma Centro"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="gymName" className="block text-sm font-medium text-gray-700">
                      Nome Palestra
                    </label>
                    <input
                      {...register("gymName")}
                      type="text"
                      placeholder="Es. Palazzetto dello Sport, Centro Sportivo Roma"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Nome del luogo fisico dove si svolgono le lezioni
                    </p>
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                      Slug URL *
                    </label>
                    <input
                      {...register("slug")}
                      type="text"
                      placeholder="slwc-roma-centro"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Usato per l&apos;URL del form di iscrizione: /iscrizione/[slug]
                    </p>
                    {errors.slug && (
                      <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>
                    )}
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                      Indirizzo *
                    </label>
                    <textarea
                      {...register("address")}
                      rows={3}
                      placeholder="Via Roma 123, 00100 Roma"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.address && (
                      <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 text-right sm:px-6">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="mr-3 inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? "Aggiornamento..." : "Aggiorna Scuola"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
