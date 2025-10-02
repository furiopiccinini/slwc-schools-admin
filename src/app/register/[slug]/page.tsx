"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Image from "next/image"

const registrationSchema = z.object({
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
  duan: z.string().min(1, "Seleziona un duan"),
  // Documenti (obbligatori)
  documentType: z.string().min(1, "Tipo documento richiesto"),
  documentNumber: z.string().min(1, "Numero documento richiesto"),
  documentExpiry: z.string().min(1, "Data scadenza documento richiesta"),
  hasMedicalCert: z.boolean().optional(),
  annualPayment: z.boolean().optional(),
  isEpsMember: z.boolean().optional(),
  epsCardNumber: z.string().optional()
})

type RegistrationForm = z.infer<typeof registrationSchema>

interface School {
  id: number
  name: string
  gymName: string | null
  slug: string
}

export default function PublicRegistrationPage() {
  const params = useParams()
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [medicalCertFile, setMedicalCertFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      hasMedicalCert: false,
      annualPayment: false,
      isEpsMember: false
    }
  })


  const fetchSchool = useCallback(async () => {
    try {
      const response = await fetch(`/api/public/schools/${params.slug}`)
      if (response.ok) {
        const data = await response.json()
        setSchool(data)
      } else {
        console.error("Scuola non trovata")
      }
    } catch (error) {
      console.error("Errore nel caricamento scuola:", error)
    } finally {
      setLoading(false)
    }
  }, [params.slug])

  useEffect(() => {
    if (params.slug) {
      fetchSchool()
    }
  }, [params.slug, fetchSchool])

  const onSubmit = async (data: RegistrationForm) => {
    if (!school) return

    setSubmitting(true)
    
    try {
      let medicalCertS3Key = null

      // Se c'è un certificato medico da caricare
      if (medicalCertFile) {
        try {
          // Ottieni URL presigned per l'upload
          const uploadResponse = await fetch('/api/public/upload-medical-cert', {
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

      // Registra l'iscritto
      const response = await fetch('/api/public/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          schoolId: school.id,
          birthDate: new Date(data.birthDate).toISOString(),
          documentExpiry: new Date(data.documentExpiry).toISOString(),
          hasMedicalCert: !!medicalCertFile, // true se c'è un file, false altrimenti
          medicalCertS3Key
        })
      })

      if (response.ok) {
        setSuccess(true)
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Errore durante la registrazione')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore durante la registrazione')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Scuola non trovata</h1>
          <p className="text-gray-600">Il QR Code potrebbe essere scaduto o non valido.</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Registrazione Completata!</h1>
          <p className="text-gray-600 mb-4">
            La tua registrazione a <strong>{school.name}</strong> è stata inviata con successo.
          </p>
          <p className="text-sm text-gray-500">
            Riceverai una conferma via email e sarai contattato dall&apos;istruttore per completare l&apos;iscrizione.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Image
                src="/logo-slwc.png"
                alt="SLWC Logo"
                width={40}
                height={40}
                className="mr-3 rounded-full"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                }}
              />
              <h1 className="text-xl font-bold text-gray-900">
                Registrazione SLWC Ufficiale
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              Iscrizione scuola di {school.name.replace('SLWC - ', '')}
            </h2>
            {school.gymName && (
              <p className="mt-1 text-gray-600">
                {school.gymName}
              </p>
            )}
            <p className="mt-2 text-sm text-gray-500">
              Compila il form sottostante per registrarti alla scuola di Wing Chun
            </p>
          </div>

          <div className="px-6 py-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Informazioni Personali */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Informazioni Personali</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                      Nome *
                    </label>
                    <input
                      {...register("firstName")}
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                      Cognome *
                    </label>
                    <input
                      {...register("lastName")}
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                    )}
                  </div>

                  <div>
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

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Cellulare *
                    </label>
                    <input
                      {...register("phone")}
                      type="tel"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Data e Luogo di Nascita */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Data e Luogo di Nascita</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
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

                  <div>
                    <label htmlFor="birthPlace" className="block text-sm font-medium text-gray-700">
                      Luogo di Nascita *
                    </label>
                    <input
                      {...register("birthPlace")}
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.birthPlace && (
                      <p className="mt-1 text-sm text-red-600">{errors.birthPlace.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="birthCap" className="block text-sm font-medium text-gray-700">
                      CAP di Nascita *
                    </label>
                    <input
                      {...register("birthCap")}
                      type="text"
                      maxLength={5}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.birthCap && (
                      <p className="mt-1 text-sm text-red-600">{errors.birthCap.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Residenza */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Residenza</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="residence" className="block text-sm font-medium text-gray-700">
                      Indirizzo *
                    </label>
                    <input
                      {...register("residence")}
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.residence && (
                      <p className="mt-1 text-sm text-red-600">{errors.residence.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="residenceCity" className="block text-sm font-medium text-gray-700">
                        Comune *
                      </label>
                      <input
                        {...register("residenceCity")}
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      {errors.residenceCity && (
                        <p className="mt-1 text-sm text-red-600">{errors.residenceCity.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="residenceCap" className="block text-sm font-medium text-gray-700">
                        CAP *
                      </label>
                      <input
                        {...register("residenceCap")}
                        type="text"
                        maxLength={5}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      {errors.residenceCap && (
                        <p className="mt-1 text-sm text-red-600">{errors.residenceCap.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Codice Fiscale e Duan */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Informazioni Wing Chun</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="fiscalCode" className="block text-sm font-medium text-gray-700">
                      Codice Fiscale *
                    </label>
                    <input
                      {...register("fiscalCode")}
                      type="text"
                      maxLength={16}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm uppercase"
                    />
                    {errors.fiscalCode && (
                      <p className="mt-1 text-sm text-red-600">{errors.fiscalCode.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="duan" className="block text-sm font-medium text-gray-700">
                      Duan Wing Chun *
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
                </div>
              </div>

              {/* Documento (Obbligatorio) */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Documento di Identità (Obbligatorio)</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
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

                  <div>
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

                  <div>
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
                </div>
              </div>

              {/* Certificato Medico */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Certificato Medico (Opzionale)</h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="medicalCertificate" className="block text-sm font-medium text-gray-700">
                      Carica Certificato Medico
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
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
                              capture="environment"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  setMedicalCertFile(file)
                                  // Imposta automaticamente hasMedicalCert a true
                                  // quando viene selezionato un file
                                }
                              }}
                            />
                          </label>
                          <p className="pl-1">oppure trascina qui</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, PDF fino a 10MB. Puoi anche scattare una foto direttamente.
                        </p>
                      </div>
                    </div>
                    
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
                </div>
              </div>

              {/* Disclaimer e Condizioni */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-6">
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

              {/* Disclaimer e Condizioni */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-6">
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

              {/* Submit Button */}
              <div className="pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {submitting ? "Registrazione..." : "Registrati alla Scuola"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
