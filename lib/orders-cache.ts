'use client'

type CachedValue<T> = {
  key: string
  fetchedAt: string
  businessSlug: string
  value: T
}

const DB_NAME = 'booqable-helper-cache'
const DB_VERSION = 1
const STORE_NAME = 'cache'

function normalizeBusinessSlug(value: string): string {
  return value.trim().toLowerCase()
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function getStore(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME)
}

export async function getCachedValue<T>(key: string): Promise<CachedValue<T> | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const store = getStore(db, 'readonly')
    const request = store.get(key)

    request.onsuccess = () => {
      resolve((request.result as CachedValue<T> | undefined) ?? null)
    }

    request.onerror = () => reject(request.error)
  })
}

export async function setCachedValue<T>(record: CachedValue<T>): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const store = getStore(db, 'readwrite')
    const request = store.put(record)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function deleteCachedValue(key: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const store = getStore(db, 'readwrite')
    const request = store.delete(key)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export function buildOrdersCacheKey(businessSlug: string): string {
  return `orders:${normalizeBusinessSlug(businessSlug)}`
}

export async function getCachedOrders<T>(businessSlug: string): Promise<{ fetchedAt: string; orders: T[] } | null> {
  const record = await getCachedValue<T[]>(buildOrdersCacheKey(businessSlug))
  if (!record) return null
  if (normalizeBusinessSlug(record.businessSlug) !== normalizeBusinessSlug(businessSlug)) return null
  return { fetchedAt: record.fetchedAt, orders: record.value }
}

export async function setCachedOrders<T>(businessSlug: string, orders: T[]): Promise<void> {
  const key = buildOrdersCacheKey(businessSlug)
  await setCachedValue<T[]>({
    key,
    fetchedAt: new Date().toISOString(),
    businessSlug: normalizeBusinessSlug(businessSlug),
    value: orders,
  })
}

export async function clearCachedOrders(businessSlug: string): Promise<void> {
  await deleteCachedValue(buildOrdersCacheKey(businessSlug))
}
