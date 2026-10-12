"use client"

import { useEffect, useState } from "react"

interface DashboardStats {
  totalSchools: number
  totalInstructors: number
  totalSubscribers: number
  recentSubscribers: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats")
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gold" />
      </div>
    )
  }

  const cards = stats
    ? [
        { label: "Scuole", value: stats.totalSchools },
        { label: "Istruttori", value: stats.totalInstructors },
        { label: "Iscritti", value: stats.totalSubscribers },
        { label: "Nuovi iscritti (30 giorni)", value: stats.recentSubscribers },
      ]
    : []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-brand">Panoramica delle scuole Sam Lau Wing Chun.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border-t-4 border-gold bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-brand">{card.label}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-ink">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-ink">Azioni rapide</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="/admin/schools/new"
            className="flex min-h-16 items-center rounded-xl bg-charcoal px-5 py-4 text-sm font-semibold text-white hover:bg-ink"
          >
            Aggiungi una scuola
          </a>
          <a
            href="/admin/members/promote"
            className="flex min-h-16 items-center rounded-xl bg-gold px-5 py-4 text-sm font-semibold text-ink hover:bg-gold-dark"
          >
            Promuovi un iscritto
          </a>
          <a
            href="/admin/members"
            className="flex min-h-16 items-center rounded-xl bg-white px-5 py-4 text-sm font-semibold text-charcoal shadow-sm ring-1 ring-black/5 hover:bg-indigo-50"
          >
            Vedi tutti gli iscritti
          </a>
        </div>
      </div>
    </div>
  )
}

