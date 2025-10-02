"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const subscriberSchema = z.object({
  firstName: z.string().min(2, "Nome deve essere di almeno 2 caratteri"),
  lastName: z.string().min(2, "Cognome deve essere di almeno 2 caratteri"),
  email: z.string().email("Email non valida"),
  phone: z.string().min(10, "Numero di telefono non valido"),
  birthDate: z.string().min(1, "Data di nascita richiesta"),
  birthPlace: z.string().min(2, "Luogo di nascita richiesto"),
  birthCap: z.string().min(5, "CAP di nascita richiesto"),
  fiscalCode: z.string().min(16, "Codice fiscale deve essere di 16 caratteri").max(16, "Codice fiscale deve essere di 16 caratteri"),
  residence: z.string().min(5, "Indirizzo di residenza richiesto"),
  residenceCity: z.string().min(2, "Comune di residenza richiesto"),
  residenceCap: z.string().min(5, "CAP di residenza richiesto"),
  schoolId: z.string().min(1, "Seleziona una scuola"),
  duan: z.string().min(1, "Seleziona un duan"),
  // Documenti (obbligatori)
  documentType: z.string().min(1, "Tipo documento richiesto"),
  documentNumber: z.string().min(1, "Numero documento richiesto"),
  documentExpiry: z.string().min(1, "Data scadenza documento richiesta"),
  hasMedicalCert: z.boolean().optional(),
  annualPayment: z.boolean().optional(),
  isEpsMember: z.boolean().optional(),
  epsCardNumber: z.string().optional(),
  epsJoinDate: z.string().optional()
})

type SubscriberForm = z.infer<typeof subscriberSchema>

interface School {
  id: number
  name: string
}

export default function NewSubscriberPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(false)
  const [medicalCertFile, setMedicalCertFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SubscriberForm>({
    resolver: zodResolver(subscriberSchema),
    defaultValues: {
      hasMedicalCert: false,
      annualPayment: false
    }
  })


  useEffect(() => {
    fetchSchools()
  }, [])

  const fetchSchools = async () => {
    try {
      const response = await fetch('/api/admin/schools')
      if (response.ok) {
        const data = await response.json()
        setSchools(data)
      }
    } catch {
      console.error('Errore nel caricamento scuole')
    }
  }

  const onSubmit = async (data: SubscriberForm) => {
    setLoading(true)
    
    try {
      let medicalCertS3Key = null

      // Se c'è un certificato medico da caricare
      if (medicalCertFile) {
        try {
          // Ottieni URL presigned per l'upload
          const uploadResponse = await fetch('/api/admin/upload-medical-cert', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileName: medicalCertFile.name,
              fileType: medicalCertFile.type
            })
          })

          if (uploadResponse.ok) {
            const { signedUrl, key } = await uploadResponse.json()
            
            // Carica il file su S3
            const uploadToS3Response = await fetch(signedUrl, {
              method: 'PUT',
              body: medicalCertFile,
              headers: {
                'Content-Type': medicalCertFile.type,
              }
            })

            if (uploadToS3Response.ok) {
              medicalCertS3Key = key
            } else {
              console.error('Errore upload su S3')
            }
          }
        } catch (uploadError) {
          console.error('Errore durante upload certificato:', uploadError)
          // Continua comunque con la registrazione
        }
      }

      const response = await fetch('/api/admin/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          schoolId: parseInt(data.schoolId),
          birthDate: new Date(data.birthDate).toISOString(),
          documentExpiry: new Date(data.documentExpiry).toISOString(),
          epsJoinDate: data.epsJoinDate ? new Date(data.epsJoinDate).toISOString() : null,
          isEpsMember: !!(data.epsCardNumber || data.epsJoinDate), // true se c'è almeno un campo EPS compilato
          hasMedicalCert: !!medicalCertFile, // true se c'è un file, false altrimenti
          medicalCertS3Key
        })
      })

      if (response.ok) {
        router.push('/admin/members')
      } else {
        console.error('Errore nella creazione iscritto')
      }
    } catch {
      console.error('Errore nella creazione iscritto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Nuovo Iscritto
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Registra un nuovo iscritto nella scuola di Wing Chun
            </p>
          </div>
        </div>
        <div className="mt-5 md:col-span-2 md:mt-0">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="shadow sm:overflow-hidden sm:rounded-md">
              <div className="space-y-6 bg-white px-4 py-5 sm:p-6">
                <div className="grid grid-cols-6 gap-6">
                  {/* Informazioni Personali */}
                  <div className="col-span-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Informazioni Personali</h3>
                  </div>
                  
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                      Nome *
                    </label>
                    <input
                      {...register("firstName")}
                      type="text"
                      placeholder="Es. Mario"
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
                      type="text"
                      placeholder="Es. Rossi"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                    )}
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email *
                    </label>
                    <input
                      {...register("email")}
                      type="email"
                      placeholder="mario.rossi@email.com"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Cellulare *
                    </label>
                    <input
                      {...register("phone")}
                      type="tel"
                      placeholder="+39 333 123 4567"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>

                  {/* Data e Luogo di Nascita */}
                  <div className="col-span-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Data e Luogo di Nascita</h3>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
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

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="birthPlace" className="block text-sm font-medium text-gray-700">
                      Luogo di Nascita *
                    </label>
                    <input
                      {...register("birthPlace")}
                      type="text"
                      placeholder="Es. Roma"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.birthPlace && (
                      <p className="mt-1 text-sm text-red-600">{errors.birthPlace.message}</p>
                    )}
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="birthCap" className="block text-sm font-medium text-gray-700">
                      CAP di Nascita *
                    </label>
                    <input
                      {...register("birthCap")}
                      type="text"
                      placeholder="00100"
                      maxLength={5}
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
                      type="text"
                      placeholder="RSSMRA80A01H501U"
                      maxLength={16}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm uppercase"
                    />
                    {errors.fiscalCode && (
                      <p className="mt-1 text-sm text-red-600">{errors.fiscalCode.message}</p>
                    )}
                  </div>

                  {/* Residenza */}
                  <div className="col-span-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Residenza</h3>
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="residence" className="block text-sm font-medium text-gray-700">
                      Indirizzo *
                    </label>
                    <input
                      {...register("residence")}
                      type="text"
                      placeholder="Via Roma 123"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.residence && (
                      <p className="mt-1 text-sm text-red-600">{errors.residence.message}</p>
                    )}
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="residenceCity" className="block text-sm font-medium text-gray-700">
                      Comune *
                    </label>
                    <input
                      {...register("residenceCity")}
                      type="text"
                      placeholder="Es. Roma"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.residenceCity && (
                      <p className="mt-1 text-sm text-red-600">{errors.residenceCity.message}</p>
                    )}
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="residenceCap" className="block text-sm font-medium text-gray-700">
                      CAP *
                    </label>
                    <input
                      {...register("residenceCap")}
                      type="text"
                      placeholder="00100"
                      maxLength={5}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.residenceCap && (
                      <p className="mt-1 text-sm text-red-600">{errors.residenceCap.message}</p>
                    )}
                  </div>

                  {/* Duan Wing Chun */}
                  <div className="col-span-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Duan Wing Chun</h3>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="duan" className="block text-sm font-medium text-gray-700">
                      Duan *
                    </label>
                    <select
                      {...register("duan")}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Seleziona duan</option>
                      <option value="0">0° Duan (Principiante)</option>
                      <option value="1">1° Duan</option>
                      <option value="2">2° Duan</option>
                      <option value="3">3° Duan</option>
                      <option value="4">4° Duan</option>
                      <option value="5">5° Duan</option>
                      <option value="6">6° Duan</option>
                      <option value="7">7° Duan</option>
                      <option value="8">8° Duan</option>
                      <option value="9">9° Duan</option>
                      <option value="10">1° Duan Tecnico</option>
                      <option value="11">2° Duan Tecnico</option>
                      <option value="12">3° Duan Tecnico</option>
                      <option value="13">4° Duan Tecnico</option>
                      <option value="14">5° Duan Tecnico</option>
                      <option value="15">6° Duan Tecnico</option>
                      <option value="16">7° Duan Tecnico</option>
                      <option value="17">8° Duan Tecnico</option>
                      <option value="18">9° Duan Tecnico</option>
                    </select>
                    {errors.duan && (
                      <p className="mt-1 text-sm text-red-600">{errors.duan.message}</p>
                    )}
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="schoolId" className="block text-sm font-medium text-gray-700">
                      Scuola di Appartenenza *
                    </label>
                    <select
                      {...register("schoolId")}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Seleziona la scuola</option>
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

                  {/* Documento (Obbligatorio) */}
                  <div className="col-span-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Documento (Obbligatorio)</h3>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="documentType" className="block text-sm font-medium text-gray-700">
                      Tipo Documento *
                    </label>
                    <select
                      {...register("documentType")}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Seleziona tipo</option>
                      <option value="Carta Identità">Carta Identità</option>
                      <option value="Passaporto">Passaporto</option>
                      <option value="Patente">Patente</option>
                    </select>
                    {errors.documentType && (
                      <p className="mt-1 text-sm text-red-600">{errors.documentType.message}</p>
                    )}
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="documentNumber" className="block text-sm font-medium text-gray-700">
                      Numero Documento *
                    </label>
                    <input
                      {...register("documentNumber")}
                      type="text"
                      placeholder="Es. AA1234567"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.documentNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.documentNumber.message}</p>
                    )}
                  </div>

                  <div className="col-span-6 sm:col-span-3">
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

                  {/* Certificato Medico (Opzionale) */}
                  <div className="col-span-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Certificato Medico (Opzionale)</h3>
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="medicalCertificate" className="block text-sm font-medium text-gray-700">
                      Carica Certificato Medico
                    </label>
                    <div 
                      className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
                        isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setIsDragOver(true)
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setIsDragOver(false)
                        const files = e.dataTransfer.files
                        if (files.length > 0) {
                          setMedicalCertFile(files[0])
                        }
                      }}
                    >
                      <div className="space-y-1 text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
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
                          <p className="pl-1">o trascina qui</p>
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
                              File selezionato: {medicalCertFile.name}
                            </span>
                            <div className="text-xs text-green-700 mt-1">
                              ✅ Certificato medico caricato correttamente
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                // Permette di selezionare un file diverso
                                const fileInput = document.getElementById('medicalCertificate') as HTMLInputElement
                                if (fileInput) {
                                  fileInput.click()
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Sostituisci
                            </button>
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
                      </div>
                    )}
                  </div>

                  {/* Pagamenti e Tessera */}
                  <div className="col-span-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Pagamenti e Tessera</h3>
                  </div>

                  <div className="col-span-6">
                    <div className="flex items-center">
                      <input
                        {...register("annualPayment")}
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="annualPayment" className="ml-2 block text-sm text-gray-900">
                        Pagamento annuale effettuato
                      </label>
                    </div>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="epsCardNumber" className="block text-sm font-medium text-gray-700">
                      Numero Tessera EPS
                    </label>
                    <input
                      {...register("epsCardNumber")}
                      type="text"
                      placeholder="Es. EPS123456"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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

              {/* Disclaimer e Condizioni */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mx-4 mb-4">
                <div className="text-sm text-blue-800">
                  <h4 className="font-semibold mb-2">Condizioni di Iscrizione</h4>
                  <p className="mb-3">
                    Avendo preso visione dello statuto, l&apos;iscritto chiede di poter aderire all&apos;associazione in qualità di socio ordinario. A tale scopo, dichiara di condividere gli obiettivi espressi nello statuto e di voler contribuire alla loro realizzazione. Il sottoscritto inoltre:
                  </p>
                  <ul className="list-disc list-inside space-y-1 mb-3 text-xs">
                    <li>si impegna nell&apos;osservanza delle norme statutarie e delle disposizioni del consiglio direttivo;</li>
                    <li>prende atto che l&apos;adesione è subordinata all&apos;accettazione della domanda da parte dell&apos;organo statutario;</li>
                    <li>dichiara che in caso di accettazione verserà la quota associativa annuale secondo le modalità stabilite dal consiglio direttivo;</li>
                    <li>in quanto socio avrà diritto a essere iscritto nel libro dei soci e a partecipare alle attività associative e alle assemblee, a eleggere le cariche sociali e a essere eletto;</li>
                    <li>è informato sulle coperture assicurative previste al rilascio della tessera;</li>
                    <li>la conferma di questo modulo digitale equivale alla raccolta della firma ad accettazione delle condizioni specificate.</li>
                  </ul>
                  <p className="text-xs font-medium">
                    Nim Lik ASD, Località Castagnola 8 - 27052 Rocca Susella (PV) - PI: 02918480183
                  </p>
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
                  {loading ? "Creazione..." : "Crea Iscritto"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}