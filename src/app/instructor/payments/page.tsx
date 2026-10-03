"use client"

import { PaymentsManager } from "@/components/payments/PaymentsManager"

export default function InstructorPaymentsPage() {
  return (
    <PaymentsManager
      title="Pagamenti mensili"
      api={{
        paymentsBase: "/api/instructor/payments",
        settingsUrl: "/api/instructor/school/payments-settings",
        membersUrl: "/api/instructor/members",
        statsUrl: "/api/instructor/payments/stats",
        buildPaymentsQuery: (year, month) =>
          `/api/instructor/payments?year=${year}&month=${month}`,
        buildStatsQuery: () => "/api/instructor/payments/stats?months=12",
        buildSettingsBody: (data) => data,
        buildAddBody: (data) => data,
        buildCarryForwardBody: (fromYear, fromMonth) => ({ fromYear, fromMonth }),
      }}
    />
  )
}
