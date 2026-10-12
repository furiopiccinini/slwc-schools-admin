"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

type NavLink = {
  href: string
  label: string
}

type AppShellProps = {
  brand: string
  homeHref: string
  links: NavLink[]
  userName?: string | null
  children: React.ReactNode
}

function isCurrent(pathname: string, href: string, homeHref: string) {
  if (href === homeHref) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppShell({ brand, homeHref, links, userName, children }: AppShellProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  return (
    <div className="min-h-screen bg-paper text-slate-brand">
      <header className="sticky top-0 z-40 bg-charcoal text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <Link href={homeHref} className="flex min-w-0 items-center gap-3" onClick={close}>
            <Image
              src="/logo-slwc.png"
              alt="Sam Lau Wing Chun"
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-full"
            />
            <span className="truncate text-base font-semibold tracking-wide">{brand}</span>
          </Link>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-gold lg:hidden"
            aria-expanded={open}
            aria-label={open ? "Chiudi menu" : "Apri menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((link) => {
              const current = isCurrent(pathname, link.href, homeHref)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`border-b-2 px-3 py-2 text-sm font-medium tracking-wide ${
                    current
                      ? "border-gold text-gold"
                      : "border-transparent text-white/80 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            {userName && <span className="text-sm text-white/75">Ciao, {userName}</span>}
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-md bg-gold px-3 py-2 text-sm font-semibold text-ink hover:bg-gold-dark"
            >
              Esci
            </button>
          </div>
        </div>

        {open && (
          <nav className="space-y-1 border-t border-white/10 px-3 py-3 lg:hidden">
            {links.map((link) => {
              const current = isCurrent(pathname, link.href, homeHref)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  className={`flex min-h-12 items-center rounded-md border-l-4 px-3 text-base font-medium ${
                    current
                      ? "border-gold bg-white/10 text-gold"
                      : "border-transparent text-white/85 hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
            <button
              type="button"
              onClick={() => {
                close()
                signOut()
              }}
              className="mt-2 flex min-h-12 w-full items-center justify-center rounded-md bg-gold text-base font-semibold text-ink"
            >
              Esci
            </button>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 lg:px-6 lg:py-8">{children}</main>
    </div>
  )
}
