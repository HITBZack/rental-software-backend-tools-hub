import { useCallback, useEffect, useState } from "react"
import { useSettings } from "./use-settings"
import { getAllPaginated, fetchOrderWithLinesV4 } from "./api"
import { getCachedOrders, setCachedOrders } from "./orders-cache"

type BooqableLine = {
  id: string
  title?: string
  quantity?: number
  quantity_as_decimal?: string
  item_id?: string
  product_id?: string
  order_id?: string
  [key: string]: unknown
}

export type BooqableOrder = {
  id: string
  number?: string | number
  starts_at?: string
  stops_at?: string
  status?: string
  statuses?: string[]
  lines?: BooqableLine[]
  order_lines?: BooqableLine[]
  item_count?: number
  customer?: {
    id?: string
    name?: string
    email?: string
    properties_attributes?: {
      cell_phone?: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  properties_attributes?: {
    notes?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

export type OrdersDataState = {
  orders: BooqableOrder[]
  isLoading: boolean
  error: string | null
  lastFetched: string | null
  progress: number
  progressText: string
  refreshOrders: (options?: RefreshOrdersOptions) => Promise<void>
}

export type RefreshOrdersOptions = {
  enrichStartDate?: string
  enrichEndDate?: string
}

export function useOrdersData(): OrdersDataState {
  const { settings } = useSettings()
  const [orders, setOrders] = useState<BooqableOrder[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState("")

  const loadOrders = useCallback(
    async (forceRefresh: boolean, options?: RefreshOrdersOptions) => {
      setError(null)
      setProgress(0)
      setProgressText("")

      if (!settings) {
        setError("Settings not loaded")
        return
      }
      if (!settings.apiKey || !settings.businessSlug) {
        setError("Missing API key or business slug. Please configure your settings first.")
        return
      }

      setIsLoading(true)
      try {
        if (forceRefresh) {
          setOrders([])
        }

        let ordersList: BooqableOrder[] | null = null

        if (!forceRefresh) {
          const cached = await getCachedOrders<BooqableOrder>(settings.businessSlug)
          if (cached?.orders?.length) {
            ordersList = cached.orders
            setLastFetched(new Date(cached.fetchedAt).toLocaleTimeString())
          }
        }

        if (!ordersList) {
          setProgressText("Fetching orders from Booqable...")
          ordersList = await getAllPaginated<BooqableOrder>("orders", {
            onProgress: (fetched, total) => {
              const pct = total ? Math.round((fetched / total) * 100) : 0
              setProgress(pct)
              setProgressText(`Fetched ${fetched}${total ? ` of ${total}` : ""} orders...`)
            },
          })
          
          // Enrich orders that don't have lines by fetching from API v4
          // Only enrich orders within ±1 month of today to avoid excessive API calls
          const today = new Date()
          const oneMonthAgo = new Date(today)
          oneMonthAgo.setMonth(today.getMonth() - 1)
          const oneMonthAhead = new Date(today)
          oneMonthAhead.setMonth(today.getMonth() + 1)

          const enrichStart = options?.enrichStartDate ? new Date(`${options.enrichStartDate}T00:00:00`) : null
          const enrichEnd = options?.enrichEndDate ? new Date(`${options.enrichEndDate}T23:59:59`) : null
          const hasValidEnrichWindow =
            enrichStart instanceof Date &&
            enrichEnd instanceof Date &&
            Number.isFinite(enrichStart.getTime()) &&
            Number.isFinite(enrichEnd.getTime()) &&
            enrichStart.getTime() <= enrichEnd.getTime()
          
          const ordersNeedingEnrichment = ordersList.filter((order) => {
            const hasLines =
              (Array.isArray(order.lines) && order.lines.length > 0) ||
              (Array.isArray(order.order_lines) && (order.order_lines as BooqableLine[]).length > 0)
            if (hasLines || !order.id) return false
            
            if (order.starts_at) {
              const orderDate = new Date(order.starts_at)
              if (Number.isNaN(orderDate.getTime())) return false

              // If we have a caller-provided window, use it
              if (hasValidEnrichWindow) {
                return orderDate >= (enrichStart as Date) && orderDate <= (enrichEnd as Date)
              }

              // Otherwise default to ±1 month around today
              if (orderDate < oneMonthAgo || orderDate > oneMonthAhead) return false
            }
            
            return true
          })
          
          if (ordersNeedingEnrichment.length > 0) {
            setProgressText(`Enriching ${ordersNeedingEnrichment.length} orders with line items...`)
            
            // Process in batches of 10 for faster enrichment
            const batchSize = 10
            let enriched = 0
            
            for (let i = 0; i < ordersNeedingEnrichment.length; i += batchSize) {
              const batch = ordersNeedingEnrichment.slice(i, i + batchSize)
              
              await Promise.all(
                batch.map(async (order) => {
                  try {
                    const v4Response = await fetchOrderWithLinesV4(order.id, settings.businessSlug, settings.apiKey)
                    const responseObj = v4Response as Record<string, unknown>
                    const included = Array.isArray(responseObj.included) ? responseObj.included : []
                    
                    // Build lookup for included resources
                    const linesById = new Map<string, Record<string, unknown>>()
                    for (const inc of included) {
                      const incObj = inc as Record<string, unknown>
                      if (incObj.type === "lines" && typeof incObj.id === "string") {
                        linesById.set(incObj.id, incObj)
                      }
                    }
                    
                    // Extract lines from relationships
                    const data = responseObj.data as Record<string, unknown> | undefined
                    const relationships = data?.relationships as Record<string, unknown> | undefined
                    const linesRel = relationships?.lines as Record<string, unknown> | undefined
                    const linesData = linesRel?.data
                    
                    if (Array.isArray(linesData)) {
                      const lines: BooqableLine[] = []
                      for (const ref of linesData) {
                        const refObj = ref as Record<string, unknown>
                        const lineId = refObj.id as string | undefined
                        if (lineId) {
                          const lineResource = linesById.get(lineId)
                          if (lineResource) {
                            const attrs = lineResource.attributes as Record<string, unknown> | undefined
                            const lineRelationships = lineResource.relationships as Record<string, unknown> | undefined
                            const itemRel = lineRelationships?.item as Record<string, unknown> | undefined
                            const itemData = itemRel?.data as Record<string, unknown> | undefined
                            
                            lines.push({
                              id: lineId,
                              title: attrs?.title as string | undefined,
                              quantity: attrs?.quantity as number | undefined,
                              quantity_as_decimal: attrs?.quantity_as_decimal as string | undefined,
                              item_id: itemData?.id as string | undefined,
                            })
                          }
                        }
                      }
                      
                      if (lines.length > 0) {
                        order.lines = lines
                        order.order_lines = lines
                      }
                    }
                  } catch (err) {
                    console.warn(`Failed to enrich order ${order.id}:`, err)
                  }
                }),
              )
              
              enriched += batch.length
              setProgressText(`Enriched ${enriched} of ${ordersNeedingEnrichment.length} orders...`)
              
              // Minimal delay between batches
              if (i + batchSize < ordersNeedingEnrichment.length) {
                await new Promise((resolve) => setTimeout(resolve, 100))
              }
            }
          }
          
          await setCachedOrders<BooqableOrder>(settings.businessSlug, ordersList)
          setLastFetched(new Date().toLocaleTimeString())
        }

        setOrders(ordersList)
        setProgressText("")
        setProgress(0)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load orders")
      } finally {
        setIsLoading(false)
      }
    },
    [settings],
  )

  const refreshOrders = useCallback(
    async (options?: RefreshOrdersOptions) => {
      await loadOrders(true, options)
    },
    [loadOrders],
  )

  useEffect(() => {
    if (!settings?.businessSlug) return
    void loadOrders(false)
  }, [loadOrders, settings?.businessSlug])

  return {
    orders,
    isLoading,
    error,
    lastFetched,
    progress,
    progressText,
    refreshOrders,
  }
}
