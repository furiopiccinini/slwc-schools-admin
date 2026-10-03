"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PaymentStatsChart } from "@/components/payments/PaymentStatsChart"

type MonthStat = {
  year: number
  month: number
  label: string
  totalCollected: number
  paidCount: number
  rosterCount: number
  newSubscribers: number
}

type SchoolInfo = {
  id: number
  name: string
  paymentsEnabled: boolean
  defaultMonthlyFee: number
}

export default function InstructorPage() {
  const [loading, setLoading] = useState(true)
  const [school, setSchool] = useState<SchoolInfo | null>(null)
  const [months, setMonths] = useState<MonthStat[]>([])
  const [currentTotal, setCurrentTotal] = useState(0)
  const [currentPaid, setCurrentPaid] = useState(0)
  const [currentRoster, setCurrentRoster] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() + 1

        const [statsRes, paymentsRes] = await Promise.all([
          fetch("/api/instructor/payments/stats?months=12", {
            credentials: "include",
            cache: "no-store",
          }),
          fetch(`/api/instructor/payments?year=${year}&month=${month}`, {
            credentials: "include",
            cache: "no-store",
          }),
        ])

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setSchool(statsData.school)
          setMonths(statsData.months || [])
        }

        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json()
          if (paymentsData.school) setSchool(paymentsData.school)
          setCurrentTotal(paymentsData.summary?.totalCollected ?? 0)
          setCurrentPaid(paymentsData.summary?.paidCount ?? 0)
          setCurrentRoster(paymentsData.summary?.rosterCount ?? 0)
        }
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Dashboard Istruttore
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {school?.name
            ? `Panoramica della scuola ${school.name}`
            : "Benvenuto nell'area riservata agli istruttori."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/instructor/members"
          className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-6 text-center text-sm font-semibold text-slate-800 transition hover:border-indigo-400 hover:bg-indigo-50"
        >
          Gestisci iscritti
        </Link>
        <Link
          href="/instructor/payments"
          className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-6 text-center text-sm font-semibold text-slate-800 transition hover:border-indigo-400 hover:bg-indigo-50"
        >
          Pagamenti mensili
        </Link>
      </div>

      {school?.paymentsEnabled ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Incasso mese corrente</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
                €{currentTotal.toFixed(2)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Paganti questo mese</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{currentPaid}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">In roster</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{currentRoster}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Andamento pagamenti e iscrizioni
            </h2>
            <PaymentStatsChart months={months} />
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <p className="text-slate-700">La gestione pagamenti non è ancora attiva.</p>
          <p className="mt-2 text-sm text-slate-500">
            Puoi attivarla dalla pagina{" "}
            <Link href="/instructor/payments" className="font-semibold text-indigo-600 hover:underline">
              Pagamenti
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  )
}
