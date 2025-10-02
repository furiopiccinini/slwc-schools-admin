"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input, Select, Button } from "@/components/ui/FormElements"

const promoteSchema = z.object({
  subscriberId: z.string().min(1, "Seleziona un iscritto"),
  password: z.string().min(8, "Password deve essere di almeno 8 caratteri"),
  confirmPassword: z.string().min(8, "Conferma password richiesta"),
  schoolId: z.string().min(1, "Seleziona una scuola")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non coincidono",
  path: ["confirmPassword"],
})

type PromoteForm = z.infer<typeof promoteSchema>

interface Subscriber {
  id: number
  firstName: string
  lastName: string
  email: string
  school: {
    name: string
  }
}

interface School {
  id: number
  name: string
}

export default function PromoteSubscriberPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<PromoteForm>({
    resolver: zodResolver(promoteSchema)
  })

  const selectedSubscriberId = watch("subscriberId")
  const selectedSubscriber = subscribers.find(s => s.id.toString() === selectedSubscriberId)

  useEffect(() => {
    fetchSubscribers()
    fetchSchools()
  }, [])

  // Pre-seleziona l'iscritto se viene passato l'ID nell'URL
  useEffect(() => {
    const subscriberIdFromUrl = searchParams.get('subscriberId')
    if (subscriberIdFromUrl && subscribers.length > 0) {
      setValue('subscriberId', subscriberIdFromUrl)
    }
  }, [subscribers, searchParams, setValue])

  const fetchSubscribers = async () => {
    try {
      const response = await fetch('/api/admin/members/promote')
      if (response.ok) {
        const data = await response.json()
        setSubscribers(data)
      }
    } catch (error) {
      console.error('Errore nel caricamento iscritti:', error)
    }
  }

  const fetchSchools = async () => {
    try {
      const response = await fetch('/api/admin/schools')
      if (response.ok) {
        const data = await response.json()
        setSchools(data)
      }
    } catch (error) {
      console.error('Errore nel caricamento scuole:', error)
    }
  }

  const onSubmit = async (data: PromoteForm) => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/admin/instructors/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriberId: parseInt(data.subscriberId),
          password: data.password,
          schoolId: parseInt(data.schoolId)
        })
      })

      if (response.ok) {
        router.push('/admin/instructors')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Errore durante la promozione')
      }
    } catch (error) {
      console.error('Errore:', error)
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
              {searchParams.get('subscriberId') ? 'Promuovi Istruttore' : 'Promuovi a Istruttore'}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {searchParams.get('subscriberId') 
                ? 'Completa la promozione dell\'iscritto selezionato a istruttore'
                : 'Promuovi un iscritto esistente a istruttore di Wing Chun'
              }
            </p>
          </div>
        </div>
        <div className="mt-5 md:col-span-2 md:mt-0">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="shadow sm:overflow-hidden sm:rounded-md">
              <div className="space-y-6 bg-white px-4 py-5 sm:p-6">
                <div className="grid grid-cols-6 gap-6">
                  {/* Selezione Iscritto */}
                  <div className="col-span-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Seleziona Iscritto</h3>
                  </div>
                  
                  <div className="col-span-6">
                    {!searchParams.get('subscriberId') && subscribers.length === 0 && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex">
                          <svg className="h-5 w-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <p className="text-sm text-blue-800">
                            Non ci sono iscritti disponibili per la promozione.
                          </p>
                        </div>
                      </div>
                    )}
                    {searchParams.get('subscriberId') ? (
                      // Se l'ID è nell'URL, mostra come campo read-only
                      <div>
                        <input
                          type="hidden"
                          {...register("subscriberId")}
                        />
                        {selectedSubscriber ? (
                          <div className="block w-full rounded-lg border-0 py-2.5 px-3 text-gray-900 bg-gray-50 shadow-sm ring-1 ring-inset ring-gray-300">
                            {selectedSubscriber.firstName} {selectedSubscriber.lastName} - {selectedSubscriber.email} ({selectedSubscriber.school.name})
                          </div>
                        ) : (
                          <div className="block w-full rounded-lg border-0 py-2.5 px-3 text-red-900 bg-red-50 shadow-sm ring-1 ring-inset ring-red-300">
                            Iscritto non trovato
                          </div>
                        )}
                      </div>
                    ) : (
                      // Se non c'è ID nell'URL, mostra il dropdown
                      <Select
                        {...register("subscriberId")}
                        label="Iscritto da Promuovere"
                        required
                        error={errors.subscriberId?.message}
                        options={[
                          { value: "", label: "Seleziona un iscritto" },
                          ...subscribers.map((subscriber) => ({
                            value: subscriber.id.toString(),
                            label: `${subscriber.firstName} ${subscriber.lastName} - ${subscriber.email} (${subscriber.school.name})`
                          }))
                        ]}
                      />
                    )}
                  </div>

                  {/* Informazioni dell'Iscritto Selezionato */}
                  {selectedSubscriber && (
                    <div className="col-span-6">
                      <div className="bg-blue-50 p-4 rounded-md">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">Iscritto Selezionato:</h4>
                        <p className="text-sm text-blue-800">
                          <strong>Nome:</strong> {selectedSubscriber.firstName} {selectedSubscriber.lastName}
                        </p>
                        <p className="text-sm text-blue-800">
                          <strong>Email:</strong> {selectedSubscriber.email}
                        </p>
                        <p className="text-sm text-blue-800">
                          <strong>Scuola:</strong> {selectedSubscriber.school.name}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Credenziali di Accesso */}
                  <div className="col-span-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Credenziali di Accesso</h3>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <Input
                      {...register("password")}
                      type="password"
                      label="Password per Accesso Istruttore"
                      placeholder="Minimo 8 caratteri"
                      required
                      error={errors.password?.message}
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <Input
                      {...register("confirmPassword")}
                      type="password"
                      label="Conferma Password"
                      placeholder="Ripeti la password"
                      required
                      error={errors.confirmPassword?.message}
                    />
                  </div>

                  {/* Scuola di Appartenenza */}
                  <div className="col-span-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Scuola di Appartenenza</h3>
                  </div>

                  <div className="col-span-6">
                    <Select
                      {...register("schoolId")}
                      label="Scuola per cui sarà istruttore"
                      required
                      error={errors.schoolId?.message}
                      options={[
                        { value: "", label: "Seleziona la scuola" },
                        ...schools.map((school) => ({
                          value: school.id.toString(),
                          label: school.name
                        }))
                      ]}
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 text-right sm:px-6 flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={loading || (!!searchParams.get('subscriberId') && !selectedSubscriber)}
                >
                  {loading ? "Promozione..." : "Promuovi a Istruttore"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

