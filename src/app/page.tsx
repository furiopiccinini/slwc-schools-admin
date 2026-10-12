"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading

    if (!session) {
      router.push("/auth/signin")
    } else if ((session.user as any)?.role === "ADMIN") { // eslint-disable-line @typescript-eslint/no-explicit-any
      router.push("/admin")
    } else {
      router.push("/instructor")
    }
  }, [session, status, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-gold" />
        <p className="mt-4 text-sm text-white/80">Caricamento...</p>
      </div>
    </div>
  )
}
