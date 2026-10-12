"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AppShell } from "@/components/AppShell"

const links = [
  { href: "/instructor", label: "Dashboard" },
  { href: "/instructor/members", label: "Iscritti" },
  { href: "/instructor/payments", label: "Pagamenti" },
]

export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return
    if (!session || !session.user || (session.user as { role?: string }).role !== "INSTRUCTOR") {
      router.push("/auth/signin")
    }
  }, [session, status, router])

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gold" />
      </div>
    )
  }

  if (!session || !session.user || (session.user as { role?: string }).role !== "INSTRUCTOR") {
    return null
  }

  return (
    <AppShell brand="Istruttore" homeHref="/instructor" links={links} userName={session.user.name}>
      {children}
    </AppShell>
  )
}
