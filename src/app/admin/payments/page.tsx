"use client"

import { useEffect, useMemo, useState } from "react"
import { PaymentsManager } from "@/components/payments/PaymentsManager"

type School = {
  id: number
  name: string
}

export default function AdminPaymentsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [schoolId, setSchoolId] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/schools", { credentials: "include", cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          const list = (Array.isArray(data) ? data : []).map((s: School) => ({
            id: s.id,
            name: s.name,
          }))
          setSchools(list)
          if (list.length === 1) setSchoolId(list[0].id)
        }
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const api = useMemo(
    () => ({
      paymentsBase: "/api/admin/payments",
      settingsUrl: "/api/admin/payments/settings",
      membersUrl: "/api/admin/members",
      statsUrl: "/api/admin/payments/stats",
      schoolId,
      buildPaymentsQuery: (year: number, month: number) =>
        `/api/admin/payments?schoolId=${schoolId}&year=${year}&month=${month}`,
      buildStatsQuery: () => `/api/admin/payments/stats?schoolId=${schoolId}&months=12`,
      buildSettingsBody: (data: Partial<{ defaultMonthlyFee: number; paymentsEnabled: boolean }>) => ({
        schoolId,
        ...data,
      }),
      buildAddBody: (data: {
        subscriberId: number
        year: number
        month: number
        expectedAmount?: number
      }) => ({
        schoolId,
        ...data,
      }),
      buildCarryForwardBody: (fromYear: number, fromMonth: number) => ({
        schoolId,
        fromYear,
        fromMonth,
      }),
    }),
    [schoolId]
  )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gold" />
      </div>
    )
  }

  return (
    <PaymentsManager
      title="Pagamenti mensili"
      showSchoolPicker
      schools={schools}
      onSchoolChange={setSchoolId}
      api={api}
    />
  )
}
