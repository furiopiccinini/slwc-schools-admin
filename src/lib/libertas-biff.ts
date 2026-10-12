import { find, read, write } from "cfb"

const SST = 0x00fc
const CONTINUE = 0x003c
const EXTSST = 0x00ff
const BOUNDSHEET = 0x0085
const BOF = 0x0809
const EOF = 0x000a
const INDEX = 0x020b
const DIMENSIONS = 0x0200
const ROW = 0x0208
const DBCELL = 0x00d7
const LABELSST = 0x00fd
const NUMBER = 0x0203
const WORKSHEET = 0x0010

const TEXT_IXFE = 73
const DATE_IXFE = 70
const ROW_BLOCK = 32
const DATA_ROW_PROTO = Buffer.from("000000001e0068010000000000010f00", "hex")

const CELL_TYPES = new Set([
  ROW,
  DBCELL,
  LABELSST,
  0x027e, // RK
  NUMBER,
  0x0201, // BLANK
  0x00be, // MULBLANK
  0x0204, // LABEL
  0x0006, // FORMULA
  0x0205, // BOOLERR
  0x00bd, // MULRK
  0x00d6, // RSTRING
])

type Rec = { type: number; start: number; len: number }

function parseRecords(buf: Buffer): Rec[] {
  const records: Rec[] = []
  let offset = 0
  while (offset + 4 <= buf.length) {
    const type = buf.readUInt16LE(offset)
    const len = buf.readUInt16LE(offset + 2)
    if (offset + 4 + len > buf.length) break
    records.push({ type, start: offset, len })
    offset += 4 + len
  }
  if (offset !== buf.length) {
    throw new Error("Workbook BIFF non consumato per intero")
  }
  return records
}

function makeRecord(type: number, payload: Buffer): Buffer {
  const record = Buffer.alloc(4 + payload.length)
  record.writeUInt16LE(type, 0)
  record.writeUInt16LE(payload.length, 2)
  payload.copy(record, 4)
  return record
}

function recordPayload(buf: Buffer, rec: Rec): Buffer {
  return buf.subarray(rec.start + 4, rec.start + 4 + rec.len)
}

type ParsedSst = { count: number; strings: string[] }

function parseSst(payload: Buffer, boundaries: number[]): ParsedSst {
  const boundaryList = [...boundaries].sort((a, b) => a - b)
  const boundary = new Set(boundaryList)
  const count = payload.readUInt32LE(0)
  const unique = payload.readUInt32LE(4)
  let pos = 8
  const strings: string[] = []

  const nextBoundary = (from: number) => {
    for (const mark of boundaryList) {
      if (mark >= from) return mark
    }
    return null
  }

  for (let index = 0; index < unique; index++) {
    if (pos + 3 > payload.length) {
      throw new Error(`SST troncata alla stringa ${index}`)
    }
    const cch = payload.readUInt16LE(pos)
    pos += 2
    const flags = payload[pos++]
    let runs = 0
    let ext = 0
    if (flags & 0x08) {
      runs = payload.readUInt16LE(pos)
      pos += 2
    }
    if (flags & 0x04) {
      ext = payload.readUInt32LE(pos)
      pos += 4
    }

    let high = (flags & 0x01) !== 0
    let text = ""
    let left = cch
    while (left > 0) {
      if (boundary.has(pos)) {
        high = (payload[pos++] & 0x01) !== 0
        continue
      }
      const width = high ? 2 : 1
      const splitAt = nextBoundary(pos)
      if (splitAt !== null && pos + width > splitAt) {
        throw new Error(`SST spezzata fuori allineamento alla stringa ${index}`)
      }
      if (pos + width > payload.length) {
        throw new Error(`SST troncata nella stringa ${index}`)
      }
      text += String.fromCharCode(high ? payload.readUInt16LE(pos) : payload[pos])
      pos += width
      left--
    }

    pos += runs * 4 + ext
    if (pos > payload.length) {
      throw new Error(`SST troncata dopo la stringa ${index}`)
    }
    strings.push(text)
  }

  if (pos !== payload.length) {
    throw new Error(`SST non consumata: ${pos} di ${payload.length}`)
  }
  return { count, strings }
}

function encodeString(text: string): Buffer {
  const chars = Buffer.from(text, "utf16le")
  const header = Buffer.alloc(3)
  header.writeUInt16LE(text.length, 0)
  header.writeUInt8(0x01, 2)
  return Buffer.concat([header, chars])
}

function packSst(count: number, strings: Buffer[]): Buffer {
  const records: Buffer[] = []
  const header = Buffer.alloc(8)
  header.writeUInt32LE(count, 0)
  header.writeUInt32LE(strings.length, 4)
  let type = SST
  let chunk: Buffer[] = [header]
  let size = header.length

  const flush = () => {
    if (size === 0) return
    records.push(makeRecord(type, Buffer.concat(chunk)))
    type = CONTINUE
    chunk = []
    size = 0
  }

  for (const encoded of strings) {
    if (encoded.length > 8224) {
      throw new Error("Stringa troppo lunga per un record SST")
    }
    if (size + encoded.length > 8224) flush()
    chunk.push(encoded)
    size += encoded.length
  }
  flush()
  return Buffer.concat(records)
}

function forEachRecord(slice: Buffer, visit: (type: number, start: number, len: number) => void) {
  let offset = 0
  while (offset + 4 <= slice.length) {
    const type = slice.readUInt16LE(offset)
    const len = slice.readUInt16LE(offset + 2)
    if (offset + 4 + len > slice.length) {
      throw new Error("Record BIFF non allineati")
    }
    visit(type, offset, len)
    offset += 4 + len
  }
  if (offset !== slice.length) {
    throw new Error("Record BIFF non allineati")
  }
}

function remapLabelsst(slice: Buffer, oldToNew: Map<number, number>) {
  forEachRecord(slice, (type, start, len) => {
    if (type !== LABELSST || len < 10) return
    const current = slice.readUInt32LE(start + 10)
    const next = oldToNew.get(current)
    if (next === undefined) {
      throw new Error(`Stringa condivisa ${current} usata ma non conservata`)
    }
    slice.writeUInt32LE(next, start + 10)
  })
}

function countLabelsst(slice: Buffer): number {
  let count = 0
  forEachRecord(slice, (type) => {
    if (type === LABELSST) count++
  })
  return count
}

function makeLabel(row: number, col: number, isst: number): Buffer {
  const payload = Buffer.alloc(10)
  payload.writeUInt16LE(row, 0)
  payload.writeUInt16LE(col, 2)
  payload.writeUInt16LE(TEXT_IXFE, 4)
  payload.writeUInt32LE(isst, 6)
  return makeRecord(LABELSST, payload)
}

function makeDate(row: number, col: number, serial: number): Buffer {
  const payload = Buffer.alloc(14)
  payload.writeUInt16LE(row, 0)
  payload.writeUInt16LE(col, 2)
  payload.writeUInt16LE(DATE_IXFE, 4)
  payload.writeDoubleLE(serial, 6)
  return makeRecord(NUMBER, payload)
}

function makeRow(row: number): Buffer {
  const payload = Buffer.from(DATA_ROW_PROTO)
  payload.writeUInt16LE(row, 0)
  return makeRecord(ROW, payload)
}

type BuiltRow = { rowRec: Buffer; cells: Buffer[] }

function buildCellTable(rows: BuiltRow[]): { table: Buffer; dbOffsets: number[] } {
  const dbOffsets: number[] = []
  const parts: Buffer[] = []
  let cursor = 0

  for (let start = 0; start < rows.length; start += ROW_BLOCK) {
    const block = rows.slice(start, start + ROW_BLOCK)
    const rowStart = cursor
    for (const row of block) {
      parts.push(row.rowRec)
      cursor += row.rowRec.length
    }

    const cellStarts: number[] = []
    for (const row of block) {
      cellStarts.push(cursor)
      for (const cell of row.cells) {
        parts.push(cell)
        cursor += cell.length
      }
    }

    const offsets = [cellStarts[0] - (rowStart + 20)]
    for (let index = 1; index < block.length; index++) {
      offsets.push(cellStarts[index] - cellStarts[index - 1])
    }
    if (offsets.some((offset) => offset < 0 || offset > 0xffff)) {
      throw new Error("Offset DBCELL fuori scala")
    }

    const payload = Buffer.alloc(4 + offsets.length * 2)
    payload.writeUInt32LE(cursor - rowStart, 0)
    offsets.forEach((offset, index) => payload.writeUInt16LE(offset, 4 + index * 2))
    const dbcell = makeRecord(DBCELL, payload)
    dbOffsets.push(cursor)
    parts.push(dbcell)
    cursor += dbcell.length
  }

  return { table: Buffer.concat(parts), dbOffsets }
}

function shiftIndex(buf: Buffer, recordStart: number, delta: number) {
  const len = buf.readUInt16LE(recordStart + 2)
  const payload = recordStart + 4
  buf.writeUInt32LE(buf.readUInt32LE(payload + 12) + delta, payload + 12)
  for (let offset = 16; offset + 4 <= len; offset += 4) {
    buf.writeUInt32LE(buf.readUInt32LE(payload + offset) + delta, payload + offset)
  }
}

/**
 * Compila il template Libertas lasciando intatti convalide, nomi definiti e gli altri fogli.
 * `rows` sono le righe dati (senza intestazione): stringa vuota = cella assente, numero = data seriale.
 */
export function fillLibertasWorkbook(template: Buffer, rows: (string | number)[][]): Buffer {
  const container = read(template, { type: "buffer" })
  const entry = find(container, "/Workbook")
  if (!entry?.content) {
    throw new Error("Stream Workbook assente nel template")
  }
  const source = Buffer.from(entry.content)
  const records = parseRecords(source)

  const sstRecord = records.find((rec) => rec.type === SST)
  if (!sstRecord) throw new Error("SST assente nel template")
  const sstContinues: Rec[] = []
  let afterSst = false
  let extsst: Rec | null = null
  for (const rec of records) {
    if (rec.start < sstRecord.start) continue
    if (rec.start === sstRecord.start) {
      afterSst = true
      continue
    }
    if (!afterSst || extsst) break
    if (rec.type === CONTINUE) {
      sstContinues.push(rec)
      continue
    }
    if (rec.type === EXTSST) extsst = rec
    break
  }

  const sstPayloads = [recordPayload(source, sstRecord), ...sstContinues.map((rec) => recordPayload(source, rec))]
  const boundaries: number[] = []
  let consumed = sstRecord.len
  for (const rec of sstContinues) {
    boundaries.push(consumed)
    consumed += rec.len
  }
  const sst = parseSst(Buffer.concat(sstPayloads), boundaries)
  const sstEnd = (extsst ?? sstContinues[sstContinues.length - 1] ?? sstRecord).start +
    4 +
    (extsst ?? sstContinues[sstContinues.length - 1] ?? sstRecord).len

  const sheetBofs = records.filter(
    (rec) => rec.type === BOF && source.readUInt16LE(rec.start + 6) === WORKSHEET
  )
  if (sheetBofs.length < 2) throw new Error("Fogli del template incompleti")

  const sheetRecords: Rec[] = []
  let inSheet = false
  for (const rec of records) {
    if (rec.start === sheetBofs[0].start) inSheet = true
    if (!inSheet) continue
    sheetRecords.push(rec)
    if (rec.type === EOF) break
  }

  const indexRecord = sheetRecords.find((rec) => rec.type === INDEX)
  const dimensions = sheetRecords.find((rec) => rec.type === DIMENSIONS)
  const firstRow = sheetRecords.find((rec) => rec.type === ROW)
  if (!indexRecord || !dimensions || !firstRow) {
    throw new Error("Struttura del foglio Dati tesserato incompleta")
  }

  let cellEnd = -1
  let seenRow = false
  for (const rec of sheetRecords) {
    if (rec.start < firstRow.start) continue
    seenRow = true
    if (!CELL_TYPES.has(rec.type)) {
      cellEnd = rec.start
      break
    }
  }
  if (!seenRow || cellEnd < 0) throw new Error("Tabella celle del foglio principale non trovata")

  const kept = new Set<number>()
  for (const rec of records) {
    if (rec.type !== LABELSST) continue
    const row = source.readUInt16LE(rec.start + 4)
    const replaced = rec.start >= firstRow.start && rec.start < cellEnd && row >= 1
    if (replaced) continue
    kept.add(source.readUInt32LE(rec.start + 10))
  }

  const oldToNew = new Map<number, number>()
  const textToNew = new Map<string, number>()
  const encoded: Buffer[] = []
  for (const oldIndex of [...kept].sort((a, b) => a - b)) {
    const text = sst.strings[oldIndex]
    if (text === undefined) throw new Error(`Indice SST ${oldIndex} assente`)
    let next = textToNew.get(text)
    if (next === undefined) {
      next = encoded.length
      encoded.push(encodeString(text))
      textToNew.set(text, next)
    }
    oldToNew.set(oldIndex, next)
  }

  const intern = (text: string) => {
    const found = textToNew.get(text)
    if (found !== undefined) return found
    const next = encoded.length
    encoded.push(encodeString(text))
    textToNew.set(text, next)
    return next
  }

  let headerRow: Buffer | null = null
  const headerCells: Buffer[] = []
  for (const rec of sheetRecords) {
    if (rec.start < firstRow.start || rec.start >= cellEnd || rec.type === DBCELL) continue
    if (rec.type === ROW) {
      if (source.readUInt16LE(rec.start + 4) === 0) {
        headerRow = Buffer.from(source.subarray(rec.start, rec.start + 4 + rec.len))
      }
      continue
    }
    if (source.readUInt16LE(rec.start + 4) !== 0) continue
    const cell = Buffer.from(source.subarray(rec.start, rec.start + 4 + rec.len))
    if (rec.type === LABELSST) {
      const oldIndex = cell.readUInt32LE(10)
      const next = oldToNew.get(oldIndex)
      if (next === undefined) throw new Error("Intestazione con stringa non mappata")
      cell.writeUInt32LE(next, 10)
    }
    headerCells.push(cell)
  }
  if (!headerRow || headerCells.length === 0) {
    throw new Error(
      `Intestazione del foglio principale assente (riga ${Boolean(headerRow)}, celle ${headerCells.length}, fine tabella ${cellEnd}, prima riga ${firstRow.start})`
    )
  }

  const built: BuiltRow[] = [{ rowRec: headerRow, cells: headerCells }]
  rows.forEach((values, offset) => {
    const row = offset + 1
    const cells: Buffer[] = []
    values.forEach((value, col) => {
      if (value === "") return
      if (typeof value === "number") {
        cells.push(makeDate(row, col, value))
        return
      }
      cells.push(makeLabel(row, col, intern(value)))
    })
    built.push({ rowRec: makeRow(row), cells })
  })

  const pre = Buffer.from(source.subarray(0, sstRecord.start))
  const mid = Buffer.from(source.subarray(sstEnd, indexRecord.start))
  const afterIndex = Buffer.from(source.subarray(indexRecord.start + 4 + indexRecord.len, firstRow.start))
  const suffix = Buffer.from(source.subarray(cellEnd))
  remapLabelsst(pre, oldToNew)
  remapLabelsst(mid, oldToNew)
  remapLabelsst(suffix, oldToNew)

  const { table, dbOffsets } = buildCellTable(built)
  const totalRows = built.length
  const indexPayload = Buffer.alloc(16 + dbOffsets.length * 4)
  indexPayload.writeUInt32LE(0, 0)
  indexPayload.writeUInt32LE(0, 4)
  indexPayload.writeUInt32LE(totalRows, 8)

  const labelCount =
    countLabelsst(pre) +
    countLabelsst(mid) +
    countLabelsst(suffix) +
    built.reduce((sum, row) => sum + row.cells.filter((cell) => cell.readUInt16LE(0) === LABELSST).length, 0)
  const sstBytes = packSst(Math.max(labelCount, encoded.length), encoded)

  const sheet0Bof = sheetBofs[0].start
  const midPos = pre.length + sstBytes.length
  const indexPos = midPos + mid.length
  const afterIndexPos = indexPos + 4 + indexPayload.length
  const cellsPos = afterIndexPos + afterIndex.length
  const suffixPos = cellsPos + table.length

  const ibXf = source.readUInt32LE(indexRecord.start + 16)
  const indexEnd = indexRecord.start + 4 + indexRecord.len
  if (ibXf < indexEnd || ibXf >= firstRow.start) {
    throw new Error("ibXf del foglio principale fuori dalla zona attesa")
  }
  indexPayload.writeUInt32LE(afterIndexPos + (ibXf - indexEnd), 12)
  dbOffsets.forEach((offset, block) => {
    indexPayload.writeUInt32LE(cellsPos + offset, 16 + block * 4)
  })
  const indexRecordBytes = makeRecord(INDEX, indexPayload)

  const dimensionsOffset = afterIndexPos + (dimensions.start - indexEnd)
  afterIndex.writeUInt32LE(totalRows, dimensions.start - indexEnd + 8)

  const output = Buffer.concat([pre, sstBytes, mid, indexRecordBytes, afterIndex, table, suffix])
  if (dimensionsOffset + 12 > output.length) {
    throw new Error("DIMENSIONS fuori dal foglio")
  }

  for (const rec of records) {
    if (rec.type !== BOUNDSHEET) continue
    const oldPos = source.readUInt32LE(rec.start + 4)
    let newPos: number
    if (oldPos === sheet0Bof) newPos = midPos + (oldPos - sstEnd)
    else if (oldPos >= cellEnd) newPos = suffixPos + (oldPos - cellEnd)
    else throw new Error("BoundSheet in posizione inattesa")
    if (rec.start + 8 > pre.length) throw new Error("BoundSheet oltre il prefisso")
    output.writeUInt32LE(newPos, rec.start + 4)
  }

  const oldSheet1 = sheetBofs[1].start
  const newSheet1 = suffixPos + (oldSheet1 - cellEnd)
  const delta = newSheet1 - oldSheet1
  for (const rec of records) {
    if (rec.type !== INDEX || rec.start < cellEnd) continue
    shiftIndex(output, suffixPos + (rec.start - cellEnd), delta)
  }

  entry.content = output
  entry.size = output.length
  const written = write(container, { type: "buffer" })
  return Buffer.isBuffer(written) ? written : Buffer.from(written)
}
