// Booqable API wrapper that handles pagination, rate limiting, and error handling
// All requests go directly to Booqable from the browser - never through our servers

import { getSettings } from "./storage"

interface PaginatedResponse<T> {
  data?: T[]
  meta?: {
    total?: number
    count?: number
  }
  [key: string]: unknown
}

interface FetchOptions {
  pageSize?: number
  sleepDelay?: number
  onProgress?: (fetched: number, total: number | null) => void
  stopWhen?: (item: unknown) => boolean
  onRateLimit?: (info: { retryAfterSeconds: number; page: number }) => void
  paginationMode?: "jsonapi" | "legacy"
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export class BooqableApiError extends Error {
  status: number
  retryAfterSeconds?: number

  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message)
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-")
}

export function normalizeApiKey(value: string): string {
  const trimmed = value.trim()

  const labeledMatch = trimmed.match(/(?:API_KEY|apiKey|api_key)\s*=\s*["']?([a-f0-9]{32,})["']?/i)
  if (labeledMatch?.[1]) return labeledMatch[1]

  const urlMatch = trimmed.match(/api_key=([a-zA-Z0-9]+)/)
  if (urlMatch?.[1]) return urlMatch[1]

  const hexMatch = trimmed.match(/[a-f0-9]{32,}/i)
  if (hexMatch?.[0]) return hexMatch[0]

  return trimmed.replace(/^["']+|["']+$/g, "")
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchFromBooqableTenant<T>(endpoint: string, businessSlug: string, apiKey: string): Promise<T> {
  const slug = normalizeSlug(businessSlug)
  const cleanApiKey = normalizeApiKey(apiKey)
  const baseUrl = `https://${slug}.booqable.com/api/1/`
  const url = new URL(endpoint, baseUrl)
  url.searchParams.set("api_key", cleanApiKey)

  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    const retryAfterHeader = response.headers.get("retry-after")
    const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : undefined
    throw new BooqableApiError(`Booqable API error: ${response.status} - ${errorText}`, response.status, retryAfterSeconds)
  }

  return response.json()
}

// Transform JSON:API format to flat structure
function flattenJsonApiResource(resource: Record<string, unknown>): Record<string, unknown> {
  const { id, type, attributes, relationships, ...rest } = resource
  return {
    id,
    type,
    ...((attributes ?? {}) as Record<string, unknown>),
    relationships, // Keep relationships for later merging
    ...rest,
  }
}

export async function getAllPaginated<T>(endpoint: string, options: FetchOptions = {}): Promise<T[]> {
  const settings = getSettings()
  const {
    pageSize = settings.pageSize,
    sleepDelay = settings.sleepDelay,
    onProgress,
    stopWhen,
    onRateLimit,
    paginationMode: paginationModeFromOptions,
  } = options

  const apiKey = settings.apiKey
  if (!apiKey) {
    throw new Error("No API key configured. Please complete onboarding first.")
  }

  const businessSlug = settings.businessSlug
  if (!businessSlug) {
    throw new Error("No business slug configured. Please complete onboarding first.")
  }

  let allResults: T[] = []
  let page = 1
  let hasMore = true
  let totalCount: number | null = null
  const seenIds = new Set<string>()
  let paginationMode: "jsonapi" | "legacy" = paginationModeFromOptions ?? "legacy"
  const allIncluded: Record<string, unknown>[] = []

  const collectionKey = endpoint
    .split("?")[0]
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .pop()

  const buildPaginatedEndpoint = (requestedPage: number) => {
    const [path, queryString = ""] = endpoint.split("?")
    const params = new URLSearchParams(queryString)
    if (paginationMode === "jsonapi") {
      params.set("page[number]", requestedPage.toString())
      params.set("page[size]", pageSize.toString())
      params.delete("page")
      params.delete("per")
    } else {
      params.set("page", requestedPage.toString())
      params.set("per", pageSize.toString())
      params.delete("page[number]")
      params.delete("page[size]")
    }

    const finalQuery = params.toString()
    return finalQuery.length > 0 ? `${path}?${finalQuery}` : path
  }

  while (hasMore) {
    let response: unknown
    try {
      response = await fetchFromBooqableTenant<unknown>(buildPaginatedEndpoint(page), businessSlug, apiKey)
    } catch (err) {
      if (err instanceof BooqableApiError && err.status === 429) {
        const retryAfterSeconds = err.retryAfterSeconds ?? 120
        onRateLimit?.({ retryAfterSeconds, page })
        await sleep(retryAfterSeconds * 1000)
        continue
      }

      if (err instanceof BooqableApiError && paginationMode === "jsonapi" && (err.status === 400 || err.status === 500 || err.status >= 502)) {
        paginationMode = "legacy"
        response = await fetchFromBooqableTenant<unknown>(buildPaginatedEndpoint(page), businessSlug, apiKey)
      } else {
        throw err
      }
    }
    const responseObj = (response ?? {}) as Record<string, unknown>

    // Extract included resources (for JSON:API includes like order_lines)
    const included = Array.isArray(responseObj.included) ? responseObj.included : []
    allIncluded.push(...included)

    let pageItems =
      (Array.isArray((responseObj as PaginatedResponse<T>).data) ? ((responseObj as PaginatedResponse<T>).data as T[]) : null) ??
      (collectionKey && Array.isArray(responseObj[collectionKey]) ? (responseObj[collectionKey] as T[]) : null)

    if (!pageItems) {
      if (page === 1) {
        const keys = Object.keys(responseObj)
        throw new Error(
          `Unexpected Booqable response shape for '${endpoint}'. Expected 'data' or '${collectionKey ?? "<collection>"}'. Got keys: ${keys.join(", ")}`,
        )
      }
      hasMore = false
      continue
    }

    // Flatten JSON:API structure to simple objects
    if (pageItems.length > 0 && typeof pageItems[0] === "object" && pageItems[0] !== null) {
      const first = pageItems[0] as Record<string, unknown>
      if ("attributes" in first || "relationships" in first) {
        pageItems = pageItems.map((item) => flattenJsonApiResource(item as Record<string, unknown>) as T)
      }
    }

    const metaObj = (responseObj.meta ?? {}) as Record<string, unknown>
    const metaTotal =
      (typeof metaObj.total === "number" ? metaObj.total : null) ??
      (typeof metaObj.total_count === "number" ? metaObj.total_count : null) ??
      (typeof metaObj.total_entries === "number" ? metaObj.total_entries : null) ??
      null
    if (metaTotal && !totalCount) {
      totalCount = metaTotal
    }

    let shouldStop = false
    let addedThisPage = 0
    for (const item of pageItems) {
      if (stopWhen?.(item)) {
        shouldStop = true
        break
      }
      const maybeId = (item as { id?: unknown } | null)?.id
      if (typeof maybeId === "string") {
        if (seenIds.has(maybeId)) {
          continue
        }
        seenIds.add(maybeId)
      }
      allResults.push(item)
      addedThisPage++
    }

    onProgress?.(allResults.length, totalCount)

    if (shouldStop) {
      hasMore = false
      continue
    }

    if (pageItems.length === 0) {
      hasMore = false
      continue
    }

    if (page > 1 && pageItems.length > 0 && addedThisPage === 0) {
      throw new Error(
        `Pagination did not advance for '${endpoint}'. Page ${page} returned only previously seen items. This usually means the API ignored the paging params.`,
      )
    }

    page++
    await sleep(sleepDelay)
  }

  // Merge included resources back into main results for JSON:API responses
  if (allIncluded.length > 0 && allResults.length > 0) {
    console.log("=== API MERGE DEBUG ===")
    console.log("Total included resources:", allIncluded.length)
    console.log("Included types:", [...new Set(allIncluded.map(i => (i as any).type))])
    
    const includedByTypeAndId = new Map<string, Record<string, unknown>>()
    for (const inc of allIncluded) {
      const incObj = inc as Record<string, unknown>
      const incType = incObj.type as string | undefined
      const incId = incObj.id as string | undefined
      if (incType && incId) {
        includedByTypeAndId.set(`${incType}:${incId}`, flattenJsonApiResource(incObj))
      }
    }

    // Attach included resources to orders based on relationships
    for (const result of allResults) {
      const resultObj = result as Record<string, unknown>
      const relationships = resultObj.relationships as Record<string, unknown> | undefined
      
      if (relationships) {
        // Merge order_lines
        if (relationships.order_lines) {
          const orderLinesRel = relationships.order_lines as Record<string, unknown>
          const orderLinesData = orderLinesRel.data
          if (Array.isArray(orderLinesData)) {
            const lines: Record<string, unknown>[] = []
            for (const ref of orderLinesData) {
              const refObj = ref as Record<string, unknown>
              const refType = refObj.type as string | undefined
              const refId = refObj.id as string | undefined
              if (refType && refId) {
                const included = includedByTypeAndId.get(`${refType}:${refId}`)
                if (included) {
                  lines.push(included)
                }
              }
            }
            resultObj.order_lines = lines
            resultObj.lines = lines
          }
        }
        
        // Merge customer
        if (relationships.customer) {
          const customerRel = relationships.customer as Record<string, unknown>
          const customerData = customerRel.data as Record<string, unknown> | undefined
          if (customerData) {
            const customerType = customerData.type as string | undefined
            const customerId = customerData.id as string | undefined
            if (customerType && customerId) {
              const customer = includedByTypeAndId.get(`${customerType}:${customerId}`)
              if (customer) {
                resultObj.customer = customer
              }
            }
          }
        }
      }
    }
    
    console.log("First order after merge:", allResults[0])
    console.log("=======================")
  }

  return allResults
}

// Fetch a single order from API v4 with includes (for enriching with lines)
export async function fetchOrderWithLinesV4(orderId: string, businessSlug: string, apiKey: string): Promise<unknown> {
  const slug = normalizeSlug(businessSlug)
  const cleanApiKey = normalizeApiKey(apiKey)
  const url = `https://${slug}.booqable.com/api/4/orders/${orderId}?include=lines.item`

  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${cleanApiKey}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new BooqableApiError(`Failed to fetch order ${orderId}: ${response.status} - ${errorText}`, response.status)
  }

  return response.json()
}

export async function testApiConnection(apiKey: string, businessSlug: string): Promise<boolean> {
  try {
    const cleanApiKey = normalizeApiKey(apiKey)
    await fetchFromBooqableTenant("customers", businessSlug, cleanApiKey)
    return true
  } catch {
    return false
  }
}
