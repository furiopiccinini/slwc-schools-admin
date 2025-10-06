"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/FormElements"

const editSubscriberSchema = z.object({
  firstName: z.string().min(1, "Nome obbligatorio"),
  lastName: z.string().min(1, "Cognome obbligatorio"),
  birthDate: z.string().min(1, "Data di nascita obbligatoria"),
  birthPlace: z.string().min(1, "Luogo di nascita obbligatorio"),
  birthCap: z.string().min(1, "CAP di nascita obbligatorio"),
  fiscalCode: z.string().min(16, "Codice fiscale obbligatorio"),
  residence: z.string().min(1, "Residenza obbligatoria"),
  residenceCity: z.string().min(1, "Città di residenza obbligatoria"),
  residenceCap: z.string().min(1, "CAP di residenza obbligatorio"),
  email: z.string().email("Email non valida"),
  phone: z.string().min(1, "Telefono obbligatorio"),
  duan: z.number().min(0, "Duan obbligatorio"),
  documentType: z.string().optional(),
  documentNumber: z.string().optional(),
  documentExpiry: z.string().min(1, "Scadenza documento obbligatoria"),
  annualPayment: z.boolean(),
  isEpsMember: z.boolean(),
  epsCardNumber: z.string().optional(),
  epsJoinDate: z.string().optional(),
  schoolId: z.string().min(1, "Scuola obbligatoria")
})

type EditSubscriberForm = z.infer<typeof editSubscriberSchema>

interface School {
  id: number
  name: string
}

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
  documentExpiry: string
  medicalCertS3Key?: string
  annualPayment: boolean
  isEpsMember: boolean
  epsCardNumber?: string
  epsJoinDate?: string
  schoolId: number
  school: {
    name: string
  }
}

export default function EditSubscriberPage() {
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null)
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const params = useParams()
  const subscriberId = params.id as string

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<EditSubscriberForm>({
    resolver: zodResolver(editSubscriberSchema)
  })

  const fetchSubscriber = useCallback(async () => {
    try {
      const response = await fetch(`/api/instructor/members/${subscriberId}`)
      if (response.ok) {
        const data = await response.json()
        setSubscriber(data)
        
        // Popola il form
        setValue("firstName", data.firstName)
        setValue("lastName", data.lastName)
        setValue("birthDate", data.birthDate ? data.birthDate.split('T')[0] : "")
        setValue("birthPlace", data.birthPlace)
        setValue("birthCap", data.birthCap)
        setValue("fiscalCode", data.fiscalCode)
        setValue("residence", data.residence)
        setValue("residenceCity", data.residenceCity)
        setValue("residenceCap", data.residenceCap)
        setValue("email", data.email)
        setValue("phone", data.phone)
        setValue("duan", data.duan)
        
        // Converti il tipo documento dal database al codice del frontend
        let documentTypeCode = ""
        if (data.documentType) {
          switch (data.documentType) {
            case "Carta Identità":
              documentTypeCode = "CI"
              break
            case "Passaporto":
              documentTypeCode = "PP"
              break
            case "Patente":
              documentTypeCode = "PT"
              break
            default:
              documentTypeCode = data.documentType
          }
        }
        
        setValue("documentType", documentTypeCode)
        setValue("documentNumber", data.documentNumber || "")
        setValue("documentExpiry", data.documentExpiry ? data.documentExpiry.split('T')[0] : "")
        setValue("annualPayment", data.annualPayment)
        setValue("isEpsMember", data.isEpsMember)
        setValue("epsCardNumber", data.epsCardNumber || "")
        setValue("epsJoinDate", data.epsJoinDate ? data.epsJoinDate.split('T')[0] : "")
        setValue("schoolId", data.schoolId.toString())
      } else {
        alert("Iscritto non trovato")
        router.push("/instructor/members")
      }
    } catch (error) {
      console.error("Errore nel caricamento iscritto:", error)
      alert("Errore nel caricamento iscritto")
    } finally {
      setLoading(false)
    }
  }, [subscriberId, setValue, router])

  const fetchSchools = useCallback(async () => {
    try {
      const response = await fetch('/api/instructor/schools')
      if (response.ok) {
        const data = await response.json()
        setSchools(data)
      }
    } catch (error) {
      console.error("Errore nel caricamento scuole:", error)
    }
  }, [])

  useEffect(() => {
    fetchSubscriber()
    fetchSchools()
  }, [fetchSubscriber, fetchSchools])

  const onSubmit = async (data: EditSubscriberForm) => {
    setSubmitting(true)
    
    try {
      // Converti il codice del frontend al valore del database
      let documentTypeValue = data.documentType
      if (data.documentType) {
        switch (data.documentType) {
          case "CI":
            documentTypeValue = "Carta Identità"
            break
          case "PP":
            documentTypeValue = "Passaporto"
            break
          case "PT":
            documentTypeValue = "Patente"
            break
          default:
            documentTypeValue = data.documentType
        }
      }
      
      const response = await fetch(`/api/instructor/members/${subscriberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          documentType: documentTypeValue,
          birthDate: new Date(data.birthDate).toISOString(),
          documentExpiry: new Date(data.documentExpiry).toISOString(),
          epsJoinDate: data.epsJoinDate ? new Date(data.epsJoinDate).toISOString() : null,
          duan: parseInt(data.duan.toString()),
          schoolId: parseInt(data.schoolId),
          // Imposta automaticamente isEpsMember a true se uno dei campi EPS è compilato
          isEpsMember: !!(data.epsCardNumber || data.epsJoinDate)
        })
      })

      if (response.ok) {
        router.push("/instructor/members")
        router.refresh()
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Errore durante l'aggiornamento")
      }
    } catch (error) {
      console.error("Errore:", error)
      alert("Errore durante l'aggiornamento")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!subscriber) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Iscritto non trovato</h1>
        <p className="mt-2 text-gray-600">L'iscritto che stai cercando non esiste.</p>
        <Button
          onClick={() => router.push("/instructor/members")}
          className="mt-4"
        >
          Torna agli Iscritti
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Modifica Iscritto</h1>
        <p className="mt-1 text-sm text-gray-600">
          Modifica i dati dell'iscritto {subscriber.firstName} {subscriber.lastName}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="grid grid-cols-6 gap-6">
            
            {/* Dati Personali */}
            <div className="col-span-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Dati Personali</h3>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                Nome *
              </label>
              <input
                {...register("firstName")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Cognome *
              </label>
              <input
                {...register("lastName")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>

            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
                Data di Nascita *
              </label>
              <input
                type="date"
                {...register("birthDate")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.birthDate && (
                <p className="mt-1 text-sm text-red-600">{errors.birthDate.message}</p>
              )}
            </div>

            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="birthPlace" className="block text-sm font-medium text-gray-700">
                Luogo di Nascita *
              </label>
              <input
                {...register("birthPlace")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.birthPlace && (
                <p className="mt-1 text-sm text-red-600">{errors.birthPlace.message}</p>
              )}
            </div>

            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="birthCap" className="block text-sm font-medium text-gray-700">
                CAP di Nascita *
              </label>
              <input
                {...register("birthCap")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.birthCap && (
                <p className="mt-1 text-sm text-red-600">{errors.birthCap.message}</p>
              )}
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="fiscalCode" className="block text-sm font-medium text-gray-700">
                Codice Fiscale *
              </label>
              <input
                {...register("fiscalCode")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.fiscalCode && (
                <p className="mt-1 text-sm text-red-600">{errors.fiscalCode.message}</p>
              )}
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email *
              </label>
              <input
                type="email"
                {...register("email")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Telefono *
              </label>
              <input
                {...register("phone")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="duan" className="block text-sm font-medium text-gray-700">
                Duan *
              </label>
              <input
                type="number"
                min="0"
                max="18"
                {...register("duan", { valueAsNumber: true })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.duan && (
                <p className="mt-1 text-sm text-red-600">{errors.duan.message}</p>
              )}
            </div>

            {/* Residenza */}
            <div className="col-span-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Residenza</h3>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="residence" className="block text-sm font-medium text-gray-700">
                Indirizzo *
              </label>
              <input
                {...register("residence")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.residence && (
                <p className="mt-1 text-sm text-red-600">{errors.residence.message}</p>
              )}
            </div>

            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="residenceCity" className="block text-sm font-medium text-gray-700">
                Città *
              </label>
              <input
                {...register("residenceCity")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.residenceCity && (
                <p className="mt-1 text-sm text-red-600">{errors.residenceCity.message}</p>
              )}
            </div>

            <div className="col-span-6 sm:col-span-1">
              <label htmlFor="residenceCap" className="block text-sm font-medium text-gray-700">
                CAP *
              </label>
              <input
                {...register("residenceCap")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.residenceCap && (
                <p className="mt-1 text-sm text-red-600">{errors.residenceCap.message}</p>
              )}
            </div>

            {/* Documenti */}
            <div className="col-span-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Documenti (Obbligatori)</h3>
            </div>

            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="documentType" className="block text-sm font-medium text-gray-700">
                Tipo Documento *
              </label>
              <select
                {...register("documentType")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Seleziona tipo</option>
                <option value="CI">Carta Identità</option>
                <option value="PP">Passaporto</option>
                <option value="PT">Patente</option>
              </select>
              {errors.documentType && (
                <p className="mt-1 text-sm text-red-600">{errors.documentType.message}</p>
              )}
            </div>

            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="documentNumber" className="block text-sm font-medium text-gray-700">
                Numero Documento *
              </label>
              <input
                {...register("documentNumber")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.documentNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.documentNumber.message}</p>
              )}
            </div>

            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="documentExpiry" className="block text-sm font-medium text-gray-700">
                Scadenza Documento *
              </label>
              <input
                type="date"
                {...register("documentExpiry")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.documentExpiry && (
                <p className="mt-1 text-sm text-red-600">{errors.documentExpiry.message}</p>
              )}
            </div>

            {/* Pagamenti e EPS */}
            <div className="col-span-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Pagamenti e EPS</h3>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register("annualPayment")}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Pagamento Annuale Effettuato
                </label>
              </div>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register("isEpsMember")}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Membro EPS
                </label>
              </div>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="epsCardNumber" className="block text-sm font-medium text-gray-700">
                Numero Tessera EPS
              </label>
              <input
                {...register("epsCardNumber")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="epsJoinDate" className="block text-sm font-medium text-gray-700">
                Data Iscrizione EPS
              </label>
              <input
                type="date"
                {...register("epsJoinDate")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            {/* Scuola */}
            <div className="col-span-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Scuola</h3>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="schoolId" className="block text-sm font-medium text-gray-700">
                Scuola *
              </label>
              <select
                {...register("schoolId")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Seleziona scuola</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
              {errors.schoolId && (
                <p className="mt-1 text-sm text-red-600">{errors.schoolId.message}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            onClick={() => router.push("/instructor/members")}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annulla
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {submitting ? "Salvataggio..." : "Salva Modifiche"}
          </Button>
        </div>
      </form>
    </div>
  )
}
