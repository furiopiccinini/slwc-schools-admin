import fs from "fs"
import path from "path"
import * as XLSX from "xlsx"
import { fillLibertasWorkbook } from "./libertas-biff"

/**
 * Valori identici su ogni riga, come nel template Libertas di esempio.
 * Categoria nel file di esempio è vuota e resta vuota.
 */
const FIXED = {
  zona: "PV",
  numSoc: "507",
  privacy: "s",
  qualifica: "apr-atleta praticante",
  disciplina: "wing chun",
  assicurazione: ".A1 (EX BASE 1) ASSOCIATI PRATICANTI",
}

/** Intestazioni del foglio "Dati tesserato", nello stesso ordine del template Libertas. */
export const LIBERTAS_HEADERS = [
  "Codice\n Zona\n(*)",
  "Num \nSoc (*)",
  "Anno Tesser\n(*)",
  "Tessera\nLib naz",
  "Tess interna",
  "Cognome \n(*)",
  "Nome\n(*)",
  "Data di \nnascita\n(*)",
  "Provincia \nNascita\n(*)",
  "Comune \nNascita\n(*)",
  "Sesso\n(*)",
  "Prov \nResid\n(*)",
  "Comune Residenza\n(*)",
  "Cap \nresidenza\n(*)",
  "Indirizzo residenza\n(*)",
  "Consenso\nprivacy commerc\n(*)",
  "Qualifica1\n(*)",
  "Socio",
  "Cognome genitore",
  "Nome genitore",
  "Qualifica2",
  "Qualifica3",
  "Email",
  "Telefono",
  "Cellulare",
  "Codice Fiscale",
  "Disciplina 1 (prevalente)",
  "Disciplina 2",
  "Assicurazione",
  "Categoria",
] as const

const COL = {
  zona: 0,
  numSoc: 1,
  anno: 2,
  cognome: 5,
  nome: 6,
  nascita: 7,
  provNascita: 8,
  comuneNascita: 9,
  sesso: 10,
  provRes: 11,
  comuneRes: 12,
  cap: 13,
  indirizzo: 14,
  privacy: 15,
  qualifica: 16,
  email: 22,
  telefono: 23,
  cellulare: 24,
  cf: 25,
  disciplina: 26,
  assicurazione: 28,
} as const

export type TesseratoInput = {
  firstName: string
  lastName: string
  birthDate: Date
  birthPlace: string
  birthCap: string
  fiscalCode: string
  residence: string
  residenceCity: string
  residenceCap: string
  email: string
  phone: string
}

type ComuneRecord = {
  name: string
  prov: string
  cap: string
}

type ComuneIndex = {
  byName: Map<string, ComuneRecord[]>
  byCap: Map<string, ComuneRecord[]>
}

export function currentTesseramentoYear(now = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    year: "numeric",
  }).format(now)
}

export function normalizePlaceName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[’`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function loosePlaceKey(value: string): string {
  return normalizePlaceName(value).replace(/['\s]/g, "")
}

function capKey(cap: string): string {
  const digits = cap.replace(/\D/g, "")
  if (!digits) return ""
  return digits.padStart(5, "0")
}

function addRecord(map: Map<string, ComuneRecord[]>, key: string, record: ComuneRecord) {
  if (!key) return
  const list = map.get(key)
  if (!list) {
    map.set(key, [record])
    return
  }
  if (!list.some((item) => item.name === record.name && item.prov === record.prov)) {
    list.push(record)
  }
}

export function isForeignFiscalCode(fiscalCode: string): boolean {
  const code = fiscalCode.toUpperCase().replace(/\s/g, "")
  return code.length >= 12 && code[11] === "Z"
}

export function sexFromFiscalCode(fiscalCode: string): "m" | "f" | "" {
  const code = fiscalCode.toUpperCase().replace(/\s/g, "")
  if (code.length < 11) return ""
  const day = Number(code.slice(9, 11))
  if (!Number.isInteger(day)) return ""
  if (day >= 41 && day <= 71) return "f"
  if (day >= 1 && day <= 31) return "m"
  return ""
}

export function excelSerialFromDate(date: Date): number {
  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  const epoch = Date.UTC(1899, 11, 30)
  return Math.round((utc - epoch) / 86400000)
}

function buildComuneIndex(workbook: XLSX.WorkBook): ComuneIndex {
  const sheet = workbook.Sheets["Comuni e province"]
  const index: ComuneIndex = { byName: new Map(), byCap: new Map() }
  if (!sheet?.["!ref"]) return index

  const range = XLSX.utils.decode_range(sheet["!ref"])
  for (let row = 2; row <= range.e.r; row++) {
    const nameCell = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })]
    const provCell = sheet[XLSX.utils.encode_cell({ r: row, c: 1 })]
    const capCell = sheet[XLSX.utils.encode_cell({ r: row, c: 2 })]
    const name = nameCell?.v == null ? "" : String(nameCell.v).trim()
    const prov = provCell?.v == null ? "" : String(provCell.v).trim()
    const cap = capCell?.v == null ? "" : String(capCell.v).trim()
    if (!name || !prov) continue

    const record = { name, prov, cap }
    addRecord(index.byName, normalizePlaceName(name), record)
    addRecord(index.byName, loosePlaceKey(name), record)
    addRecord(index.byCap, capKey(cap), record)
  }

  return index
}

function uniqueMatch(records: ComuneRecord[]): ComuneRecord | null {
  if (records.length === 1) return records[0]
  const names = new Set(records.map((record) => `${record.name}|${record.prov}`))
  if (names.size === 1) return records[0]
  return null
}

export function resolveComune(
  index: ComuneIndex,
  rawName: string,
  rawCap: string
): ComuneRecord | null {
  const cleanedName = rawName.replace(/\s*\([A-Za-z]{2}\)\s*$/, "")
  const exact = index.byName.get(normalizePlaceName(cleanedName)) ?? []
  const loose = index.byName.get(loosePlaceKey(cleanedName)) ?? []
  const named = exact.length > 0 ? exact : loose
  const cap = capKey(rawCap)

  if (named.length > 0) {
    if (cap) {
      const byCap = named.filter((record) => capKey(record.cap) === cap)
      const matched = uniqueMatch(byCap)
      if (matched) return matched
    }
    return uniqueMatch(named)
  }

  if (!cap) return null
  return uniqueMatch(index.byCap.get(cap) ?? [])
}

function splitPhone(phone: string): { telefono: string; cellulare: string } {
  const trimmed = phone.trim()
  if (!trimmed) return { telefono: "", cellulare: "" }

  let digits = trimmed.replace(/\D/g, "")
  if (digits.startsWith("0039")) digits = digits.slice(4)
  if (digits.startsWith("39") && digits.length >= 11 && digits.length <= 13) {
    const national = digits.slice(2)
    if (national.startsWith("3") || national.startsWith("0")) digits = national
  }

  if (digits.startsWith("3")) return { telefono: "", cellulare: trimmed }
  return { telefono: trimmed, cellulare: "" }
}

function placeFields(
  index: ComuneIndex,
  rawName: string,
  rawCap: string,
  foreign: boolean
): { prov: string; comune: string } {
  if (foreign) {
    return { prov: "EE", comune: normalizePlaceName(rawName) }
  }
  const resolved = resolveComune(index, rawName, rawCap)
  if (resolved) return { prov: resolved.prov, comune: resolved.name }
  return { prov: "", comune: normalizePlaceName(rawName) }
}

function buildDataRow(
  subscriber: TesseratoInput,
  index: ComuneIndex,
  year: string
): (string | number)[] {
  const fiscalCode = subscriber.fiscalCode.toUpperCase().replace(/\s/g, "")
  const birth = placeFields(index, subscriber.birthPlace, subscriber.birthCap, isForeignFiscalCode(fiscalCode))
  const residence = placeFields(index, subscriber.residenceCity, subscriber.residenceCap, false)
  const phone = splitPhone(subscriber.phone)
  const row: (string | number)[] = Array(LIBERTAS_HEADERS.length).fill("")

  row[COL.zona] = FIXED.zona
  row[COL.numSoc] = FIXED.numSoc
  row[COL.anno] = year
  row[COL.cognome] = normalizePlaceName(subscriber.lastName)
  row[COL.nome] = normalizePlaceName(subscriber.firstName)
  row[COL.nascita] = excelSerialFromDate(subscriber.birthDate)
  row[COL.provNascita] = birth.prov
  row[COL.comuneNascita] = birth.comune
  row[COL.sesso] = sexFromFiscalCode(fiscalCode)
  row[COL.provRes] = residence.prov
  row[COL.comuneRes] = residence.comune
  row[COL.cap] = subscriber.residenceCap.trim()
  row[COL.indirizzo] = normalizePlaceName(subscriber.residence)
  row[COL.privacy] = FIXED.privacy
  row[COL.qualifica] = FIXED.qualifica
  row[COL.email] = subscriber.email.trim()
  row[COL.telefono] = phone.telefono
  row[COL.cellulare] = phone.cellulare
  row[COL.cf] = fiscalCode
  row[COL.disciplina] = FIXED.disciplina
  row[COL.assicurazione] = FIXED.assicurazione

  return row
}

export function templatePath(): string {
  const candidates = [
    path.join(process.cwd(), "templates", "caricamento-tessere.xls"),
    path.join(process.cwd(), "app", "templates", "caricamento-tessere.xls"),
    path.join(process.cwd(), "dev", "slwc-school-admin", "app", "templates", "caricamento-tessere.xls"),
  ]
  const found = candidates.find((candidate) => fs.existsSync(candidate))
  if (!found) {
    throw new Error("Template Libertas non trovato")
  }
  return found
}

export function createTessereWorkbook(subscribers: TesseratoInput[], year = currentTesseramentoYear()): Buffer {
  const template = fs.readFileSync(templatePath())
  const workbook = XLSX.read(template, { type: "buffer", cellDates: false })
  if (!workbook.Sheets["Dati tesserato"]) {
    throw new Error('Foglio "Dati tesserato" mancante nel template')
  }

  const index = buildComuneIndex(workbook)
  const rows = subscribers.map((subscriber) => {
    const values = buildDataRow(subscriber, index, year)
    if (values.length !== LIBERTAS_HEADERS.length) {
      throw new Error("Riga tesserato con un numero di colonne diverso dal template")
    }
    return values
  })

  return fillLibertasWorkbook(template, rows)
}
