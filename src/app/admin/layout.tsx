"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"
import Image from "next/image"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const getNavLinkClasses = (href: string) => {
    const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href))
    return isActive
      ? "border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
  }

  useEffect(() => {
    if (status === "loading") return
    if (!session || !session.user || (session.user as any).role !== "ADMIN") { // eslint-disable-line @typescript-eslint/no-explicit-any
      router.push("/auth/signin")
    }
  }, [session, status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!session || !session.user || (session.user as any).role !== "ADMIN") { // eslint-disable-line @typescript-eslint/no-explicit-any
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
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
                  SLWC Admin
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/admin"
                  className={getNavLinkClasses("/admin")}
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/schools"
                  className={getNavLinkClasses("/admin/schools")}
                >
                  Scuole
                </Link>
                <Link
                  href="/admin/instructors"
                  className={getNavLinkClasses("/admin/instructors")}
                >
                  Istruttori
                </Link>
                <Link
                  href="/admin/members"
                  className={getNavLinkClasses("/admin/members")}
                >
                  Iscritti
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">
                Benvenuto, {session.user.name}
              </span>
              <button
                onClick={() => signOut()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

