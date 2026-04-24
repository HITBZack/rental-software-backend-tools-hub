// CSV ingestion for the Product Search Bar generator.
// Parses a Booqable product export CSV (see product-exports/*.csv) and maps it
// to the same Product shape the search bar tool has always used, so the
// generated products_with_tags.json stays byte-compatible with prior outputs.

export interface CsvProduct {
  name: string
  id: string
  url: string
  image: string | null
  tags: string[]
  description: string | null
}

export interface CsvParseResult {
  headers: string[]
  rows: string[][]
}

/**
 * Minimal RFC 4180 CSV parser.
 * Handles quoted fields, escaped quotes ("") and CR/LF line endings.
 * Intentionally dependency-free to keep the client bundle small.
 */
export function parseCsv(text: string): CsvParseResult {
  const rows: string[][] = []
  let field = ""
  let row: string[] = []
  let inQuotes = false
  let i = 0

  // Strip BOM if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
  }

  while (i < text.length) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }

    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }

    if (ch === ",") {
      row.push(field)
      field = ""
      i++
      continue
    }

    if (ch === "\r") {
      // Normalize CRLF / CR line endings
      if (text[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      field = ""
      row = []
      i++
      continue
    }

    if (ch === "\n") {
      row.push(field)
      rows.push(row)
      field = ""
      row = []
      i++
      continue
    }

    field += ch
    i++
  }

  // Flush any trailing field/row (files without final newline)
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  // Drop trailing fully-empty rows
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c === "")) {
    rows.pop()
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] }
  }

  const [headerRow, ...dataRows] = rows
  return { headers: headerRow.map((h) => h.trim()), rows: dataRows }
}

function toRecord(headers: string[], row: string[]): Record<string, string> {
  const record: Record<string, string> = {}
  for (let i = 0; i < headers.length; i++) {
    record[headers[i]] = row[i] ?? ""
  }
  return record
}

function splitTagList(raw: string): string[] {
  if (!raw) return []
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
}

export interface MapCsvOptions {
  businessSlug?: string
  // When true, also include collection names as tags (Booqable tags field is
  // usually empty on exports, while collections reflect grouping — useful as
  // seed tags for fuzzy search).
  includeCollectionsAsTags?: boolean
  // When true, excludes products whose name includes shipping keywords,
  // matching the prior Booqable fetch behavior.
  excludeShippingNames?: boolean
}

export interface MapCsvResult {
  products: CsvProduct[]
  skipped: {
    shipping: number
    missingIdOrName: number
  }
  missingColumns: string[]
}

const REQUIRED_COLUMNS = ["id", "name"] as const

export function mapCsvToProducts(
  parsed: CsvParseResult,
  options: MapCsvOptions = {},
): MapCsvResult {
  const {
    businessSlug,
    includeCollectionsAsTags = true,
    excludeShippingNames = true,
  } = options

  const missingColumns = REQUIRED_COLUMNS.filter((c) => !parsed.headers.includes(c))
  if (missingColumns.length > 0) {
    return {
      products: [],
      skipped: { shipping: 0, missingIdOrName: 0 },
      missingColumns,
    }
  }

  const slug = (businessSlug ?? "").trim().toLowerCase().replace(/\s+/g, "-")
  const products: CsvProduct[] = []
  let shippingSkipped = 0
  let invalidSkipped = 0

  for (const row of parsed.rows) {
    const record = toRecord(parsed.headers, row)
    const id = (record["id"] ?? "").trim()
    const name = (record["name"] ?? "").trim()

    if (!id || !name) {
      invalidSkipped++
      continue
    }

    if (excludeShippingNames) {
      const lower = name.toLowerCase()
      if (lower.includes("delivery") || lower.includes("pick up") || lower.includes("pickup")) {
        shippingSkipped++
        continue
      }
    }

    const description = (record["description"] ?? "").trim() || null
    const image = (record["photo_1_url_main"] ?? "").trim() || null

    const tagList = splitTagList(record["tags"] ?? "")
    if (includeCollectionsAsTags) {
      const collections = splitTagList(record["collections"] ?? "")
      for (const c of collections) {
        if (!tagList.includes(c)) tagList.push(c)
      }
    }

    const url = slug
      ? `https://${slug}.booqable.com/rentals/${id}`
      : `/rentals/${id}`

    products.push({
      id,
      name,
      url,
      image,
      tags: tagList,
      description,
    })
  }

  return {
    products,
    skipped: { shipping: shippingSkipped, missingIdOrName: invalidSkipped },
    missingColumns: [],
  }
}
