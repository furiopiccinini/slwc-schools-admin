"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input, Select, Button } from "@/components/ui/FormElements"

const instructorSchema = z
  .object({
    name: z.string().min(1, "Nome richiesto"),
    email: z.string().email("Email non valida"),
    role: z.enum(["ADMIN", "INSTRUCTOR"]),
    schoolId: z.string().min(1, "Seleziona una scuola"),
    password: z.string().optional(),
    confirmPassword: z.string().optional()
  })
  .superRefine((data, ctx) => {
    const hasPassword = Boolean(data.password?.length)
    const hasConfirm = Boolean(data.confirmPassword?.length)

    if (!hasPassword && !hasConfirm) return

    if (!hasPassword || (data.password?.length ?? 0) < 8) {
      ctx.addIssue({
        code: "custom",
        message: "La password deve essere di almeno 8 caratteri",
        path: ["password"]
      })
    }

    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Le password non coincidono",
        path: ["confirmPassword"]
      })
    }
  })

type InstructorForm = z.infer<typeof instructorSchema>

interface School {
  id: number
  name: string
}

export default function EditInstructorPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()
  const params = useParams()
  const instructorId = params.id as string

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<InstructorForm>({
    resolver: zodResolver(instructorSchema)
  })

  const fetchSchools = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/schools")
      if (response.ok) {
        const data = await response.json()
        setSchools(data)
      }
    } catch (err) {
      console.error("Errore nel caricamento scuole:", err)
    }
  }, [])

  const fetchInstructor = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/instructors/${instructorId}`)
      if (response.ok) {
        const data = await response.json()
        reset({
          name: data.name,
          email: data.email,
          role: data.role,
          schoolId: data.schoolId.toString(),
          password: "",
          confirmPassword: ""
        })
      } else {
        router.push("/admin/instructors")
      }
    } catch (err) {
      console.error("Errore:", err)
      router.push("/admin/instructors")
    } finally {
      setPageLoading(false)
    }
  }, [instructorId, reset, router])

  useEffect(() => {
    if (instructorId) {
      fetchSchools()
      fetchInstructor()
    }
  }, [instructorId, fetchSchools, fetchInstructor])

  const onSubmit = async (data: InstructorForm) => {
    setLoading(true)
    setError("")

    try {
      const body: Record<string, string | number> = {
        name: data.name,
        email: data.email,
        role: data.role,
        schoolId: parseInt(data.schoolId)
      }

      if (data.password) {
        body.password = data.password
      }

      const response = await fetch(`/api/admin/instructors/${instructorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        router.push("/admin/instructors")
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Errore durante l'aggiornamento")
      }
    } catch {
      setError("Errore durante l'aggiornamento")
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

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Modifica Istruttore
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Aggiorna i dati dell&apos;istruttore. Lascia vuota la password per non modificarla.
            </p>
          </div>
        </div>
        <div className="mt-5 md:col-span-2 md:mt-0">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="shadow sm:overflow-hidden sm:rounded-md">
              <div className="space-y-6 bg-white px-4 py-5 sm:p-6">
                <div className="grid grid-cols-6 gap-6">
                                    <div className="col-span-6 sm:col-span-3">
                    <Input
                      {...register("name")}
                      type="text"
                      label="Nome"
                      required
                      error={errors.name?.message}
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <Input
                      {...register("email")}
                      type="email"
                      label="Email"
                      required
                      error={errors.email?.message}
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <Select
                      {...register("role")}
                      label="Ruolo"
                      required
                      error={errors.role?.message}
                      options={[
                        { value: "INSTRUCTOR", label: "Istruttore" },
                        { value: "ADMIN", label: "Admin" }
                      ]}
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <Select
                      {...register("schoolId")}
                      label="Scuola"
                      required
                      error={errors.schoolId?.message}
                      options={[
                        { value: "", label: "Seleziona una scuola" },
                        ...schools.map((school) => ({
                          value: school.id.toString(),
                          label: school.name
                        }))
                      ]}
                    />
                  </div>

                  <div className="col-span-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 mt-2">
                      Nuova password (opzionale)
                    </h3>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <Input
                      {...register("password")}
                      type="password"
                      label="Password"
                      placeholder="Lascia vuoto per non modificare"
                      error={errors.password?.message}
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <Input
                      {...register("confirmPassword")}
                      type="password"
                      label="Conferma password"
                      placeholder="Ripeti la password"
                      error={errors.confirmPassword?.message}
                    />
                  </div>
                </div>
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
              </div>
              <div className="bg-gray-50 px-4 py-3 text-right sm:px-6 flex justify-end space-x-3">
                <Button type="button" variant="ghost" onClick={() => router.back()}>
                  Annulla
                </Button>
                <Button type="submit" variant="primary" loading={loading} disabled={loading}>
                  {loading ? "Aggiornamento..." : "Salva modifiche"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
