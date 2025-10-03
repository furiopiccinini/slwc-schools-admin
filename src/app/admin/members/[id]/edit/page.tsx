"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const editSubscriberSchema = z.object({
  firstName: z.string().min(1, "Nome richiesto"),
  lastName: z.string().min(1, "Cognome richiesto"),
  birthDate: z.string().min(1, "Data di nascita richiesta"),
  birthPlace: z.string().min(1, "Luogo di nascita richiesto"),
  birthCap: z.string().min(1, "CAP di nascita richiesto"),
  fiscalCode: z.string().min(16, "Codice fiscale richiesto"),
  residence: z.string().min(1, "Residenza richiesta"),
  residenceCity: z.string().min(1, "Comune di residenza richiesto"),
  residenceCap: z.string().min(1, "CAP di residenza richiesto"),
  email: z.string().email("Email non valida"),
  phone: z.string().min(1, "Telefono richiesto"),
  duan: z.number().min(0).max(18, "Duan deve essere tra 0 e 18"),
  documentType: z.string().min(1, "Tipo documento richiesto"),
  documentNumber: z.string().min(1, "Numero documento richiesto"),
  documentExpiry: z.string().min(1, "Data scadenza documento richiesta"),
  annualPayment: z.boolean().optional(),
  isEpsMember: z.boolean().optional(),
  epsCardNumber: z.string().optional(),
  epsJoinDate: z.string().optional(),
  schoolId: z.string().min(1, "Scuola richiesta")
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
  const [medicalCertFile, setMedicalCertFile] = useState<File | null>(null)
  const [uploadingCert, setUploadingCert] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
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
      const response = await fetch(`/api/admin/members/${subscriberId}`)
      if (response.ok) {
        const data = await response.json()
        setSubscriber(data)
        
        // Popola il form con i dati esistenti
        setValue("firstName", data.firstName)
        setValue("lastName", data.lastName)
        setValue("birthDate", data.birthDate.split('T')[0])
        setValue("birthPlace", data.birthPlace)
        setValue("birthCap", data.birthCap)
        setValue("fiscalCode", data.fiscalCode)
        setValue("residence", data.residence)
        setValue("residenceCity", data.residenceCity)
        setValue("residenceCap", data.residenceCap)
        setValue("email", data.email)
        setValue("phone", data.phone)
        setValue("duan", data.duan)
        console.log("DocumentType from API:", data.documentType)
        setValue("documentType", data.documentType || "")
        setValue("documentNumber", data.documentNumber || "")
        setValue("documentExpiry", data.documentExpiry ? data.documentExpiry.split('T')[0] : "")
        setValue("annualPayment", data.annualPayment)
        setValue("isEpsMember", data.isEpsMember)
        setValue("epsCardNumber", data.epsCardNumber || "")
        setValue("epsJoinDate", data.epsJoinDate ? data.epsJoinDate.split('T')[0] : "")
        setValue("schoolId", data.schoolId.toString())
      } else {
        alert("Iscritto non trovato")
        router.push("/admin/members")
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
      const response = await fetch('/api/admin/schools')
      if (response.ok) {
        const data = await response.json()
        setSchools(data)
      }
    } catch (error) {
      console.error("Errore nel caricamento scuole:", error)
    }
  }, [])

  useEffect(() => {
    if (subscriberId) {
      fetchSubscriber()
      fetchSchools()
    }
  }, [subscriberId, fetchSubscriber, fetchSchools])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      // Verifica che sia un file valido (immagine o PDF)
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setMedicalCertFile(file)
      } else {
        alert('Per favore seleziona solo file immagine (PNG, JPG) o PDF')
      }
    }
  }

  const uploadMedicalCert = async (file: File) => {
    setUploadingCert(true)
    try {
      // Ottieni URL presigned per l'upload
      const uploadResponse = await fetch('/api/admin/upload-medical-cert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type
        })
      })

      if (uploadResponse.ok) {
        const responseData = await uploadResponse.json()
        const { signedUrl, key } = responseData

        // Carica il file su S3
        const uploadToS3Response = await fetch(signedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          }
        })

        if (uploadToS3Response.ok) {
          return key
        } else {
          const errorText = await uploadToS3Response.text()
          console.error('Errore S3 response:', errorText)
          throw new Error(`Errore upload su S3: ${uploadToS3Response.status}`)
        }
      } else {
        const errorData = await uploadResponse.json()
        console.error('Errore presigned URL:', errorData)
        throw new Error(errorData.error || 'Errore nel generare URL presigned')
      }
    } catch (error) {
      console.error('Errore durante upload certificato:', error)
      throw error
    } finally {
      setUploadingCert(false)
    }
  }

  const onSubmit = async (data: EditSubscriberForm) => {
    setSubmitting(true)
    
    try {
      let medicalCertS3Key = subscriber?.medicalCertS3Key || null

      // Se c'è un nuovo certificato medico da caricare
      if (medicalCertFile) {
        try {
          medicalCertS3Key = await uploadMedicalCert(medicalCertFile)
        } catch {
          alert('Errore durante l\'upload del certificato medico. Riprova.')
          setSubmitting(false)
          return
        }
      }

      const response = await fetch(`/api/admin/members/${subscriberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          birthDate: new Date(data.birthDate).toISOString(),
          documentExpiry: new Date(data.documentExpiry).toISOString(),
          epsJoinDate: data.epsJoinDate ? new Date(data.epsJoinDate).toISOString() : null,
          duan: parseInt(data.duan.toString()),
          schoolId: parseInt(data.schoolId),
          medicalCertS3Key,
          // Imposta automaticamente isEpsMember a true se uno dei campi EPS è compilato
          isEpsMember: !!(data.epsCardNumber || data.epsJoinDate)
        })
      })

      if (response.ok) {
        // Ricarica la pagina per aggiornare i dati
        router.push("/admin/members")
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!subscriber) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Iscritto non trovato</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Modifica Iscritto
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Aggiorna le informazioni dell&apos;iscritto
            </p>
          </div>
        </div>
        <div className="mt-5 md:col-span-2 md:mt-0">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="shadow sm:overflow-hidden sm:rounded-md">
              <div className="space-y-6 bg-white px-4 py-5 sm:p-6">
                {/* Informazioni Personali */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Informazioni Personali</h3>
                </div>

                <div className="grid grid-cols-6 gap-6">
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
                      {...register("birthDate")}
                      type="date"
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
                      CAP Nascita *
                    </label>
                    <input
                      {...register("birthCap")}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.birthCap && (
                      <p className="mt-1 text-sm text-red-600">{errors.birthCap.message}</p>
                    )}
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="fiscalCode" className="block text-sm font-medium text-gray-700">
                      Codice Fiscale *
                    </label>
                    <input
                      {...register("fiscalCode")}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
                    />
                    {errors.fiscalCode && (
                      <p className="mt-1 text-sm text-red-600">{errors.fiscalCode.message}</p>
                    )}
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="residence" className="block text-sm font-medium text-gray-700">
                      Residenza *
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
                      Comune Residenza *
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

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email *
                    </label>
                    <input
                      {...register("email")}
                      type="email"
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
                    <select
                      {...register("duan", { valueAsNumber: true })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      {Array.from({ length: 19 }, (_, i) => (
                        <option key={i} value={i}>
                          {i <= 9 ? `${i}° Duan` : `${i - 9}° Duan Tecnico`}
                        </option>
                      ))}
                    </select>
                    {errors.duan && (
                      <p className="mt-1 text-sm text-red-600">{errors.duan.message}</p>
                    )}
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
                      {...register("documentExpiry")}
                      type="date"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.documentExpiry && (
                      <p className="mt-1 text-sm text-red-600">{errors.documentExpiry.message}</p>
                    )}
                  </div>

                  {/* Certificato Medico */}
                  <div className="col-span-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Certificato Medico</h3>
                    
                    <label htmlFor="medicalCertificate" className="block text-sm font-medium text-gray-700 mb-2">
                      Carica Certificato Medico
                    </label>
                    <div 
                      className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                        isDragOver 
                          ? 'border-indigo-400 bg-indigo-50' 
                          : 'border-gray-300'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="space-y-1 text-center">
                        <svg
                          className={`mx-auto h-12 w-12 transition-colors ${
                            isDragOver ? 'text-indigo-500' : 'text-gray-400'
                          }`}
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                          aria-hidden="true"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="medicalCertificate"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                          >
                            <span>Carica un file</span>
                            <input
                              id="medicalCertificate"
                              type="file"
                              accept="image/*,.pdf"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  setMedicalCertFile(file)
                                }
                              }}
                            />
                          </label>
                          <p className="pl-1">oppure trascina e rilascia qui</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {isDragOver ? 'Rilascia il file qui' : 'PNG, JPG, PDF fino a 10MB'}
                        </p>
                      </div>
                    </div>

                    {/* Mostra file selezionato */}
                    {medicalCertFile && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <div className="flex-1">
                            <span className="text-sm text-green-800 font-medium">
                              Nuovo file: {medicalCertFile.name}
                            </span>
                            {subscriber?.medicalCertS3Key && (
                              <div className="text-xs text-green-700 mt-1">
                                ⚠️ Il certificato esistente verrà sostituito
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setMedicalCertFile(null)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Mostra certificato esistente */}
                    {subscriber?.medicalCertS3Key && !medicalCertFile && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-blue-800 font-medium">
                            Certificato presente
                          </span>
                          <div className="ml-auto flex space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                // Download del certificato esistente con nome file originale
                                const fileName = subscriber.medicalCertS3Key!.split('/').pop() || 'certificato-medico'
                                window.open(`/api/admin/download-medical-cert?key=${encodeURIComponent(subscriber.medicalCertS3Key!)}&filename=${encodeURIComponent(fileName)}`, '_blank')
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Scarica
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Sei sicuro di voler sostituire il certificato medico esistente? Il file attuale verrà sovrascritto.')) {
                                  // Triggera il click sul file input per permettere la selezione di un nuovo file
                                  const fileInput = document.getElementById('medicalCertificate') as HTMLInputElement
                                  if (fileInput) {
                                    fileInput.click()
                                  }
                                }
                              }}
                              className="text-orange-600 hover:text-orange-800 text-sm"
                            >
                              Sostituisci
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pagamento e EPS */}
                  <div className="col-span-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Pagamenti e Tessera</h3>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <div className="flex items-center">
                      <input
                        {...register("annualPayment")}
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900">
                        Ha effettuato il pagamento annuale
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
                      placeholder="Es: EPS123456"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="epsJoinDate" className="block text-sm font-medium text-gray-700">
                      Data Iscrizione EPS
                    </label>
                    <input
                      {...register("epsJoinDate")}
                      type="date"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 text-right sm:px-6">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingCert}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {uploadingCert ? "Upload certificato..." : submitting ? "Aggiornamento..." : "Aggiorna Iscritto"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
