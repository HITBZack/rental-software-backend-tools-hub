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

    const pageItems =
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

  return allResults
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
