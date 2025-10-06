"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/FormElements"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Checkbox } from "@/components/ui/Checkbox"

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
        <p className="mt-2 text-gray-600">L&apos;iscritto che stai cercando non esiste.</p>
        <Button
          onClick={() => router.push("/instructor/members")}
          className="mt-4"
        >
          Torna agli Iscritti
        </Button>
      </div>
    )
  }

  const documentTypeOptions = [
    { value: "", label: "Seleziona tipo" },
    { value: "CI", label: "Carta Identità" },
    { value: "PP", label: "Passaporto" },
    { value: "PT", label: "Patente" }
  ]

  const schoolOptions = schools.map(school => ({
    value: school.id.toString(),
    label: school.name
  }))

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Modifica Iscritto</h1>
        <p className="mt-1 text-sm text-gray-600">
          Modifica i dati dell&apos;iscritto {subscriber.firstName} {subscriber.lastName}
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
              <Input
                {...register("firstName")}
                label="Nome"
                error={errors.firstName?.message}
                required
              />
            </div>

            <div className="col-span-6 sm:col-span-3">
              <Input
                {...register("lastName")}
                label="Cognome"
                error={errors.lastName?.message}
                required
              />
            </div>

            <div className="col-span-6 sm:col-span-2">
              <Input
                type="date"
                {...register("birthDate")}
                label="Data di Nascita"
                error={errors.birthDate?.message}
                required
              />
            </div>

            <div className="col-span-6 sm:col-span-2">
              <Input
                {...register("birthPlace")}
                label="Luogo di Nascita"
                error={errors.birthPlace?.message}
                required
              />
            </div>

            <div className="col-span-6 sm:col-span-2">
              <Input
                {...register("birthCap")}
                label="CAP di Nascita"
                error={errors.birthCap?.message}
                required
              />
            </div>

            <div className="col-span-6 sm:col-span-3">
              <Input
                {...register("fiscalCode")}
                label="Codice Fiscale"
                error={errors.fiscalCode?.message}
                required
              />
            </div>

            <div className="col-span-6 sm:col-span-3">
              <Input
                type="email"
                {...register("email")}
                label="Email"
                error={errors.email?.message}
                required
              />
            </div>

            <div className="col-span-6 sm:col-span-3">
              <Input
                {...register("phone")}
                label="Telefono"
                error={errors.phone?.message}
                required
              />
            </div>

            <div className="col-span-6 sm:col-span-3">
              <Input
                type="number"
                min="0"
                max="18"
                {...register("duan", { valueAsNumber: true })}
                label="Duan"
                error={errors.duan?.message}
                required
              />
            </div>

            {/* Residenza */}
            <div className="col-span-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Residenza</h3>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <Input
                {...register("residence")}
                label="Indirizzo"
                error={errors.residence?.message}
                required
              />
            </div>

            <div className="col-span-6 sm:col-span-2">
              <Input
                {...register("residenceCity")}
                label="Città"
                error={errors.residenceCity?.message}
                required
              />
            </div>

            <div className="col-span-6 sm:col-span-1">
              <Input
                {...register("residenceCap")}
                label="CAP"
                error={errors.residenceCap?.message}
                required
              />
            </div>

            {/* Documenti */}
            <div className="col-span-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Documenti (Obbligatori)</h3>
            </div>

            <div className="col-span-6 sm:col-span-2">
              <Select
                {...register("documentType")}
                label="Tipo Documento"
                error={errors.documentType?.message}
                options={documentTypeOptions}
                required
              />
            </div>

            <div className="col-span-6 sm:col-span-2">
              <Input
                {...register("documentNumber")}
                label="Numero Documento"
                error={errors.documentNumber?.message}
                required
              />
            </div>

            <div className="col-span-6 sm:col-span-2">
              <Input
                type="date"
                {...register("documentExpiry")}
                label="Scadenza Documento"
                error={errors.documentExpiry?.message}
                required
              />
            </div>

            {/* Pagamenti e EPS */}
            <div className="col-span-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Pagamenti e EPS</h3>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <Checkbox
                {...register("annualPayment")}
                label="Pagamento Annuale Effettuato"
              />
            </div>

            <div className="col-span-6 sm:col-span-3">
              <Checkbox
                {...register("isEpsMember")}
                label="Membro EPS"
              />
            </div>

            <div className="col-span-6 sm:col-span-3">
              <Input
                {...register("epsCardNumber")}
                label="Numero Tessera EPS"
                helperText="Opzionale"
              />
            </div>

            <div className="col-span-6 sm:col-span-3">
              <Input
                type="date"
                {...register("epsJoinDate")}
                label="Data Iscrizione EPS"
                helperText="Opzionale"
              />
            </div>

            {/* Scuola */}
            <div className="col-span-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Scuola</h3>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <Select
                {...register("schoolId")}
                label="Scuola"
                error={errors.schoolId?.message}
                options={schoolOptions}
                required
              />
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