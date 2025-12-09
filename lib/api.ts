// Booqable API wrapper that handles pagination, rate limiting, and error handling
// All requests go directly to Booqable from the browser - never through our servers

import { getSettings } from "./storage"

interface PaginatedResponse<T> {
  data: T[]
  meta?: {
    total?: number
    count?: number
  }
}

interface FetchOptions {
  pageSize?: number
  sleepDelay?: number
  onProgress?: (fetched: number, total: number | null) => void
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function fetchFromBooqable<T>(endpoint: string, apiKey: string): Promise<T> {
  const response = await fetch(`https://api.booqable.com/1/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Booqable API error: ${response.status} - ${errorText}`)
  }

  return response.json()
}

export async function getAllPaginated<T>(endpoint: string, options: FetchOptions = {}): Promise<T[]> {
  const settings = getSettings()
  const { pageSize = settings.pageSize, sleepDelay = settings.sleepDelay, onProgress } = options

  const apiKey = settings.apiKey
  if (!apiKey) {
    throw new Error("No API key configured. Please complete onboarding first.")
  }

  let allResults: T[] = []
  let page = 1
  let hasMore = true
  let totalCount: number | null = null

  while (hasMore) {
    const separator = endpoint.includes("?") ? "&" : "?"
    const paginatedEndpoint = `${endpoint}${separator}page=${page}&per=${pageSize}`

    const response = await fetchFromBooqable<PaginatedResponse<T>>(paginatedEndpoint, apiKey)

    if (response.data && Array.isArray(response.data)) {
      allResults = [...allResults, ...response.data]

      if (response.meta?.total && !totalCount) {
        totalCount = response.meta.total
      }

      onProgress?.(allResults.length, totalCount)

      if (response.data.length < pageSize) {
        hasMore = false
      } else {
        page++
        await sleep(sleepDelay)
      }
    } else {
      hasMore = false
    }
  }

  return allResults
}

export async function testApiConnection(apiKey: string): Promise<boolean> {
  try {
    await fetchFromBooqable("orders?per=1", apiKey)
    return true
  } catch {
    return false
  }
}
