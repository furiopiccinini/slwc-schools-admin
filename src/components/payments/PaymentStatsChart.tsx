"use client"

type MonthStat = {
  year: number
  month: number
  label: string
  totalCollected: number
  paidCount: number
  rosterCount: number
  newSubscribers: number
}

export function PaymentStatsChart({ months }: { months: MonthStat[] }) {
  if (months.length === 0) {
    return (
      <p className="text-sm text-slate-500">Nessun dato disponibile per il periodo selezionato.</p>
    )
  }

  const maxCollected = Math.max(...months.map((m) => m.totalCollected), 1)
  const maxEnrollments = Math.max(...months.map((m) => m.newSubscribers), 1)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Incassi mese su mese</h3>
        <div className="flex h-40 items-end gap-1.5 sm:gap-2">
          {months.map((m) => {
            const height = Math.max((m.totalCollected / maxCollected) * 100, m.totalCollected > 0 ? 6 : 2)
            return (
              <div key={m.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-medium tabular-nums text-slate-600 sm:text-xs">
                  {m.totalCollected > 0 ? `€${Math.round(m.totalCollected)}` : ""}
                </span>
                <div
                  className="w-full rounded-t bg-gold transition-all"
                  style={{ height: `${height}%` }}
                  title={`${m.label}: €${m.totalCollected.toFixed(2)} (${m.paidCount} paganti)`}
                />
                <span className="truncate text-[10px] text-slate-500 sm:text-xs">{m.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Nuove iscrizioni mese su mese</h3>
        <div className="flex h-32 items-end gap-1.5 sm:gap-2">
          {months.map((m) => {
            const height = Math.max((m.newSubscribers / maxEnrollments) * 100, m.newSubscribers > 0 ? 8 : 2)
            return (
              <div key={`enr-${m.label}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-medium tabular-nums text-slate-600 sm:text-xs">
                  {m.newSubscribers || ""}
                </span>
                <div
                  className="w-full rounded-t bg-emerald-500 transition-all"
                  style={{ height: `${height}%` }}
                  title={`${m.label}: ${m.newSubscribers} nuovi iscritti`}
                />
                <span className="truncate text-[10px] text-slate-500 sm:text-xs">{m.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Mese</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600">Incassato</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600">Paganti</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600">Roster</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600">Nuovi iscritti</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {months.map((m) => (
              <tr key={`row-${m.label}`}>
                <td className="px-3 py-2 text-slate-800">{m.label}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-800">
                  €{m.totalCollected.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-800">{m.paidCount}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-800">{m.rosterCount}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-800">{m.newSubscribers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
