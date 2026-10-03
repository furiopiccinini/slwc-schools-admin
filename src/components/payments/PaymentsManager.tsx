"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/FormElements"
import { PaymentStatsChart } from "@/components/payments/PaymentStatsChart"

const MONTH_NAMES = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
]

type PaymentEntry = {
  id: number
  subscriberId: number
  year: number
  month: number
  expectedAmount: number
  paidAmount: number | null
  paidAt: string | null
  subscriber?: {
    id: number
    firstName: string
    lastName: string
  }
}

type Summary = {
  rosterCount: number
  paidCount: number
  unpaidCount: number
  totalCollected: number
  expectedTotal: number
}

type SchoolSettings = {
  id: number
  name: string
  defaultMonthlyFee: number
  paymentsEnabled: boolean
}

type SubscriberOption = {
  id: number
  firstName: string
  lastName: string
}

type MonthStat = {
  year: number
  month: number
  label: string
  totalCollected: number
  paidCount: number
  rosterCount: number
  newSubscribers: number
}

type ApiConfig = {
  paymentsBase: string
  settingsUrl: string
  membersUrl: string
  statsUrl: string
  schoolId?: number
  buildPaymentsQuery: (year: number, month: number) => string
  buildStatsQuery: () => string
  buildSettingsBody: (data: Partial<{ defaultMonthlyFee: number; paymentsEnabled: boolean }>) => object
  buildAddBody: (data: {
    subscriberId: number
    year: number
    month: number
    expectedAmount?: number
  }) => object
  buildCarryForwardBody: (fromYear: number, fromMonth: number) => object
}

type Props = {
  api: ApiConfig
  title?: string
  showSchoolPicker?: boolean
  schools?: { id: number; name: string }[]
  onSchoolChange?: (schoolId: number) => void
}

export function PaymentsManager({
  api,
  title = "Pagamenti mensili",
  showSchoolPicker = false,
  schools = [],
  onSchoolChange,
}: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [school, setSchool] = useState<SchoolSettings | null>(null)
  const [entries, setEntries] = useState<PaymentEntry[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [subscribers, setSubscribers] = useState<SubscriberOption[]>([])
  const [stats, setStats] = useState<MonthStat[]>([])
  const [selectedSubscriberId, setSelectedSubscriberId] = useState("")
  const [defaultFeeInput, setDefaultFeeInput] = useState("50")
  const [payModal, setPayModal] = useState<{
    entry: PaymentEntry
    amount: string
    paidAt: string
  } | null>(null)

  const availableSubscribers = useMemo(() => {
    const inRoster = new Set(entries.map((e) => e.subscriberId))
    return subscribers.filter((s) => !inRoster.has(s.id))
  }, [subscribers, entries])

  const loadData = useCallback(async () => {
    if (showSchoolPicker && !api.schoolId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError("")

    try {
      const [paymentsRes, membersRes, statsRes] = await Promise.all([
        fetch(api.buildPaymentsQuery(year, month), { credentials: "include", cache: "no-store" }),
        fetch(api.membersUrl, { credentials: "include", cache: "no-store" }),
        fetch(api.buildStatsQuery(), { credentials: "include", cache: "no-store" }),
      ])

      const paymentsData = await paymentsRes.json()
      if (!paymentsRes.ok) {
        throw new Error(paymentsData?.error || "Errore nel caricamento pagamenti")
      }

      setSchool(paymentsData.school)
      setEntries(paymentsData.entries || [])
      setSummary(paymentsData.summary || null)
      setDefaultFeeInput(String(paymentsData.school?.defaultMonthlyFee ?? 50))

      if (membersRes.ok) {
        const membersData = await membersRes.json()
        const list = Array.isArray(membersData) ? membersData : []
        const filtered = api.schoolId
          ? list.filter((m: { schoolId?: number; school?: { id?: number } }) =>
              m.schoolId === api.schoolId || m.school?.id === api.schoolId
            )
          : list
        setSubscribers(
          filtered.map((m: SubscriberOption) => ({
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
          }))
        )
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.months || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di caricamento")
    } finally {
      setLoading(false)
    }
  }, [api, year, month, showSchoolPicker])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const changeMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
  }

  const updateSettings = async (patch: Partial<{ defaultMonthlyFee: number; paymentsEnabled: boolean }>) => {
    setSaving(true)
    setError("")
    try {
      const res = await fetch(api.settingsUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(api.buildSettingsBody(patch)),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Errore nel salvataggio impostazioni")
      setSchool(data)
      setDefaultFeeInput(String(data.defaultMonthlyFee))
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel salvataggio")
    } finally {
      setSaving(false)
    }
  }

  const addToRoster = async () => {
    if (!selectedSubscriberId) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch(api.paymentsBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(
          api.buildAddBody({
            subscriberId: parseInt(selectedSubscriberId),
            year,
            month,
          })
        ),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Errore nell'aggiunta")
      setSelectedSubscriberId("")
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'aggiunta")
    } finally {
      setSaving(false)
    }
  }

  const removeFromRoster = async (entryId: number) => {
    if (!confirm("Rimuovere questo iscritto dal roster del mese?")) return
    setSaving(true)
    try {
      const res = await fetch(`${api.paymentsBase}/${entryId}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Errore nella rimozione")
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nella rimozione")
    } finally {
      setSaving(false)
    }
  }

  const updateExpectedAmount = async (entryId: number, amount: number) => {
    setSaving(true)
    try {
      const res = await fetch(`${api.paymentsBase}/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ expectedAmount: amount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Errore nell'aggiornamento importo")
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'aggiornamento")
    } finally {
      setSaving(false)
    }
  }

  const openPayModal = (entry: PaymentEntry) => {
    const today = new Date().toISOString().split("T")[0]
    setPayModal({
      entry,
      amount: String(entry.paidAmount ?? entry.expectedAmount),
      paidAt: entry.paidAt ? entry.paidAt.split("T")[0] : today,
    })
  }

  const savePayment = async () => {
    if (!payModal) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`${api.paymentsBase}/${payModal.entry.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: parseFloat(payModal.amount),
          paidAt: payModal.paidAt,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Errore nel salvataggio pagamento")
      setPayModal(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel salvataggio")
    } finally {
      setSaving(false)
    }
  }

  const deletePayment = async (entryId: number) => {
    if (!confirm("Eliminare questo pagamento? L'iscritto resterà nel roster.")) return
    setSaving(true)
    try {
      const res = await fetch(`${api.paymentsBase}/${entryId}/pay`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Errore nell'eliminazione pagamento")
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'eliminazione")
    } finally {
      setSaving(false)
    }
  }

  const carryForward = async () => {
    const nextLabel =
      month === 12
        ? `${MONTH_NAMES[0]} ${year + 1}`
        : `${MONTH_NAMES[month]} ${year}`
    if (
      !confirm(
        `Riportare gli iscritti del roster su ${nextLabel} senza attribuire pagamenti?`
      )
    ) {
      return
    }

    setSaving(true)
    setError("")
    try {
      const res = await fetch(`${api.paymentsBase}/carry-forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(api.buildCarryForwardBody(year, month)),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Errore nel riporta mese")
      alert(`Riportati ${data.created} iscritti${data.skipped ? ` (${data.skipped} già presenti)` : ""}.`)
      const d = new Date(year, month, 1)
      setYear(d.getFullYear())
      setMonth(d.getMonth() + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel riporta mese")
    } finally {
      setSaving(false)
    }
  }

  if (showSchoolPicker && !api.schoolId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Seleziona scuola</label>
          <select
            className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2"
            defaultValue=""
            onChange={(e) => onSchoolChange?.(parseInt(e.target.value))}
          >
            <option value="" disabled>
              Scegli una scuola…
            </option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {school && (
            <p className="mt-1 text-sm text-slate-500">{school.name}</p>
          )}
        </div>
        {showSchoolPicker && schools.length > 0 && (
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={api.schoolId || ""}
            onChange={(e) => onSchoolChange?.(parseInt(e.target.value))}
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Settings */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Impostazioni</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Quota mensile predefinita (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={defaultFeeInput}
              onChange={(e) => setDefaultFeeInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              disabled={!school}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={saving || !school}
            onClick={() =>
              void updateSettings({ defaultMonthlyFee: parseFloat(defaultFeeInput) })
            }
          >
            Salva quota
          </Button>
          <Button
            type="button"
            variant={school?.paymentsEnabled ? "danger" : "success"}
            disabled={saving || !school}
            onClick={() =>
              void updateSettings({ paymentsEnabled: !school?.paymentsEnabled })
            }
          >
            {school?.paymentsEnabled ? "Disattiva gest. pagamenti" : "Attiva gest. pagamenti"}
          </Button>
        </div>
      </div>

      {!school?.paymentsEnabled ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <p className="text-slate-700">
            La gestione pagamenti non è attiva per questa scuola.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Attivala dalle impostazioni qui sopra per iniziare.
          </p>
        </div>
      ) : (
        <>
          {/* Month selector + summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  ◀
                </button>
                <div className="min-w-[160px] text-center text-lg font-bold text-slate-900">
                  {MONTH_NAMES[month - 1]} {year}
                </div>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  ▶
                </button>
              </div>
              <Button type="button" variant="secondary" disabled={saving} onClick={() => void carryForward()}>
                Riporta al mese successivo
              </Button>
            </div>

            {summary && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-500">In roster</p>
                  <p className="text-xl font-bold tabular-nums text-slate-900">{summary.rosterCount}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 px-3 py-3">
                  <p className="text-xs text-emerald-700">Pagati</p>
                  <p className="text-xl font-bold tabular-nums text-emerald-800">{summary.paidCount}</p>
                </div>
                <div className="rounded-lg bg-amber-50 px-3 py-3">
                  <p className="text-xs text-amber-700">Non pagati</p>
                  <p className="text-xl font-bold tabular-nums text-amber-800">{summary.unpaidCount}</p>
                </div>
                <div className="rounded-lg bg-indigo-50 px-3 py-3">
                  <p className="text-xs text-indigo-700">Totale mese</p>
                  <p className="text-xl font-bold tabular-nums text-indigo-900">
                    €{summary.totalCollected.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Add subscriber */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Aggiungi iscritto al mese</h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
                value={selectedSubscriberId}
                onChange={(e) => setSelectedSubscriberId(e.target.value)}
              >
                <option value="">Seleziona iscritto…</option>
                {availableSubscribers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.lastName} {s.firstName}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                disabled={saving || !selectedSubscriberId}
                onClick={() => void addToRoster()}
              >
                Aggiungi
              </Button>
            </div>
            {availableSubscribers.length === 0 && (
              <p className="mt-2 text-sm text-slate-500">
                Tutti gli iscritti della scuola sono già nel roster di questo mese.
              </p>
            )}
          </div>

          {/* Roster list */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Roster del mese</h2>
            </div>
            {entries.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                Nessun iscritto nel roster. Aggiungine uno o usa &quot;Riporta al mese successivo&quot; dal mese precedente.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {entries.map((entry) => {
                  const name = entry.subscriber
                    ? `${entry.subscriber.lastName} ${entry.subscriber.firstName}`
                    : `Iscritto #${entry.subscriberId}`
                  const isPaid = entry.paidAmount !== null
                  return (
                    <li key={entry.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">{name}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              isPaid
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {isPaid ? "Pagato" : "Non pagato"}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                          <label className="flex items-center gap-1">
                            Atteso €
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={entry.expectedAmount}
                              className="w-20 rounded border border-slate-300 px-1.5 py-0.5"
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value)
                                if (!Number.isNaN(val) && val !== entry.expectedAmount) {
                                  void updateExpectedAmount(entry.id, val)
                                }
                              }}
                            />
                          </label>
                          {isPaid && (
                            <span>
                              Incassato €{entry.paidAmount!.toFixed(2)}
                              {entry.paidAt &&
                                ` · ${new Date(entry.paidAt).toLocaleDateString("it-IT")}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={isPaid ? "secondary" : "success"}
                          disabled={saving}
                          onClick={() => openPayModal(entry)}
                        >
                          {isPaid ? "Modifica" : "Registra"}
                        </Button>
                        {isPaid && (
                          <Button
                            type="button"
                            size="sm"
                            variant="warning"
                            disabled={saving}
                            onClick={() => void deletePayment(entry.id)}
                          >
                            Azzera pag.
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          disabled={saving}
                          onClick={() => void removeFromRoster(entry.id)}
                        >
                          Rimuovi
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Dashboard stats */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Andamento (ultimi 12 mesi)</h2>
            <PaymentStatsChart months={stats} />
          </div>
        </>
      )}

      {/* Payment modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {payModal.entry.paidAmount !== null ? "Modifica pagamento" : "Registra pagamento"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {payModal.entry.subscriber
                ? `${payModal.entry.subscriber.firstName} ${payModal.entry.subscriber.lastName}`
                : ""}{" "}
              · {MONTH_NAMES[month - 1]} {year}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Data</label>
                <input
                  type="date"
                  value={payModal.paidAt}
                  onChange={(e) => setPayModal({ ...payModal, paidAt: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Importo (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payModal.amount}
                  onChange={(e) => setPayModal({ ...payModal, amount: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setPayModal(null)}
              >
                Annulla
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={saving}
                onClick={() => void savePayment()}
              >
                Salva
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
