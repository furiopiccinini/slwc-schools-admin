"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const schoolSchema = z.object({
  name: z.string().min(1, "Nome richiesto"),
  gymName: z.string().optional(),
  slug: z.string().min(1, "Slug richiesto").regex(/^[a-z0-9-]+$/, "Slug non valido (solo lettere minuscole, numeri e trattini)"),
  address: z.string().optional()
})

type SchoolForm = z.infer<typeof schoolSchema>

export default function NewSchoolPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SchoolForm>({
    resolver: zodResolver(schoolSchema)
  })

  const onSubmit = async (data: SchoolForm) => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/admin/schools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        router.push("/admin/schools")
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Errore durante la creazione")
      }
    } catch {
      setError("Errore durante la creazione")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          Aggiungi Nuova Scuola
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nome Scuola *
            </label>
            <input
              {...register("name")}
              type="text"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Es. SLWC - Scuola Roma Centro"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="gymName" className="block text-sm font-medium text-gray-700">
              Nome Palestra
            </label>
            <input
              {...register("gymName")}
              type="text"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Es. Palazzetto dello Sport, Centro Sportivo Roma"
            />
            <p className="mt-1 text-sm text-gray-500">
              Nome del luogo fisico dove si svolgono le lezioni
            </p>
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
              Slug *
            </label>
            <input
              {...register("slug")}
              type="text"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Es. karate-roma-centro"
            />
            <p className="mt-1 text-sm text-gray-500">
              URL friendly: solo lettere minuscole, numeri e trattini
            </p>
            {errors.slug && (
              <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Indirizzo
            </label>
            <textarea
              {...register("address")}
              rows={3}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Indirizzo completo della scuola"
            />
            {errors.address && (
              <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
            )}
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? "Creazione..." : "Crea Scuola"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

