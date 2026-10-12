"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Image from "next/image"

const signInSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(1, "Password richiesta")
})

type SignInForm = z.infer<typeof signInSchema>

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema)
  })

  const onSubmit = async (data: SignInForm) => {
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false
      })

      if (result?.error) {
        setError("Credenziali non valide")
      } else {
        const session = await getSession()
        if ((session?.user as any)?.role === "ADMIN") { // eslint-disable-line @typescript-eslint/no-explicit-any
          router.push("/admin")
        } else {
          router.push("/instructor")
        }
      }
    } catch {
      setError("Errore durante il login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Image
            src="/logo-slwc.png"
            alt="Sam Lau Wing Chun"
            width={96}
            height={96}
            className="mx-auto h-24 w-24 rounded-full"
          />
          <h1 className="mt-5 text-2xl font-bold tracking-wide text-white">
            Accedi
          </h1>
          <p className="mt-1 text-sm text-gold">Sam Lau Wing Chun</p>
        </div>
        <form
          className="space-y-4 rounded-2xl bg-white p-5 shadow-xl sm:p-6"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-charcoal">
              Email
            </label>
            <input
              {...register("email")}
              id="email"
              type="email"
              autoComplete="email"
              className="block min-h-12 w-full rounded-lg border border-gray-300 px-3 text-base text-ink placeholder:text-gray-400 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/50"
              placeholder="Indirizzo email"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-charcoal">
              Password
            </label>
            <input
              {...register("password")}
              id="password"
              type="password"
              autoComplete="current-password"
              className="block min-h-12 w-full rounded-lg border border-gray-300 px-3 text-base text-ink placeholder:text-gray-400 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/50"
              placeholder="Password"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <p className="text-center text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex min-h-12 w-full items-center justify-center rounded-lg bg-gold text-base font-semibold text-ink hover:bg-gold-dark focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? "Accesso..." : "Accedi"}
          </button>
        </form>
      </div>
    </div>
  )
}
