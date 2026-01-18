"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { WaveMarquee } from "@/components/wave-marquee"
import { Progress } from "@/components/ui/progress"
import { useSettings } from "@/lib/use-settings"
import { useOrdersData } from "@/lib/use-orders-data"
import type { BooqableOrder } from "@/lib/use-orders-data"
import { deleteCachedValue, getCachedValue, setCachedValue } from "@/lib/orders-cache"
import { RefreshIcon, LoaderIcon, CalendarIcon, PackageIcon, FilterIcon, HelpCircleIcon } from "@/components/icons"
import {
  getOrderPickingCustomItemRules,
  normalizeRuleInput,
  orderMatchesRule,
  saveOrderPickingCustomItemRules,
  type OrderPickingCustomItemRule,
} from "@/lib/order-picking-custom-item-rules"

interface OrderItem {
  id: string
  name: string
  quantity: number
  image?: string
  booqableItemId?: string
  picked: boolean
}

interface Order {
  id: string
  dateRange: string
  items: OrderItem[]
}

type BooqableLine = {
  id: string
  title?: string
  quantity?: number
  quantity_as_decimal?: string
  item_id?: string
  product_id?: string
  [key: string]: unknown
}

const PICKED_STORAGE_KEY = "orderPickingPicked"
const CUSTOM_RULE_PICKED_PREFIX = "customRule:"

type ItemPhotoMapEntry = {
  item_id: string
  item_name: string
  photo_url: string
  photo_key: string
}

type ItemPhotoMap = {
  version: 1
  entries: Record<string, ItemPhotoMapEntry>
}

function buildItemPhotoMapCacheKey(businessSlug: string): string {
  return `itemPhotosMap:${businessSlug.trim().toLowerCase()}`
}

function buildItemPhotoBlobCacheKey(businessSlug: string, photoKey: string): string {
  return `itemPhotoBlob:${businessSlug.trim().toLowerCase()}:${photoKey}`
}

function extractPhotoKeyFromUrl(photoUrl: string): string | null {
  try {
    const url = new URL(photoUrl)
    const marker = "/uploads/"
    const idx = url.pathname.indexOf(marker)
    if (idx === -1) return null
    const after = url.pathname.slice(idx + marker.length)
    const parts = after.split("/").filter(Boolean)
    if (parts.length < 2) return null
    return parts.slice(0, -1).join("/")
  } catch {
    return null
  }
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

function formatDateTime(dt: string | undefined): string {
  if (!dt) return ""
  const d = new Date(dt)
  if (Number.isNaN(d.getTime())) return ""
  return d
    .toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(", ", ", ")
    .replace("AM", "a.m.")
    .replace("PM", "p.m.")
}

function buildDateRange(order: BooqableOrder): string {
  const start = formatDateTime(order.starts_at)
  const stop = formatDateTime(order.stops_at)
  if (start && stop) return `${start} → ${stop}`
  return start || stop || ""
}

function parseNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
  if (typeof value === "string") {
    const n = Number.parseFloat(value)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 1
}

function getOrderLines(order: BooqableOrder): BooqableLine[] {
  if (Array.isArray(order.lines)) return order.lines
  if (Array.isArray(order.order_lines)) return order.order_lines as BooqableLine[]
  return []
}

function isOrderInDateRange(order: BooqableOrder, startDate: string, endDate: string): boolean {
  if (!order.starts_at) return false
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T23:59:59`)
  const orderStart = new Date(order.starts_at)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || Number.isNaN(orderStart.getTime())) return true
  return orderStart >= start && orderStart <= end
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function OrderPickingPage() {
  const { settings } = useSettings()
  const { orders: rawOrders, isLoading, error, lastFetched, progress, progressText, refreshOrders } = useOrdersData()
  const [startDate, setStartDate] = useState(() => formatLocalDate(new Date()))
  const [endDate, setEndDate] = useState(() => {
    const future = new Date()
    future.setDate(future.getDate() + 10)
    return formatLocalDate(future)
  })
  const [sortByQuantity, setSortByQuantity] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [combineAll, setCombineAll] = useState(false)
  const [combineSameDays, setCombineSameDays] = useState(false)
  const [showImages, setShowImages] = useState(false)
  const [customRules, setCustomRules] = useState<OrderPickingCustomItemRule[]>(() => getOrderPickingCustomItemRules())
  const [customRulesDialogOpen, setCustomRulesDialogOpen] = useState(false)
  const [newRuleMatchText, setNewRuleMatchText] = useState("")
  const [newRuleAddItemName, setNewRuleAddItemName] = useState("")
  const [newRuleAddQuantity, setNewRuleAddQuantity] = useState("1")
  const [itemPhotosMap, setItemPhotosMap] = useState<ItemPhotoMap | null>(null)
  const [imageBuildProgress, setImageBuildProgress] = useState(0)
  const [imageBuildText, setImageBuildText] = useState("")
  const [imageBuildError, setImageBuildError] = useState<string | null>(null)
  const [isImageBuilding, setIsImageBuilding] = useState(false)
  const [localImageUrls, setLocalImageUrls] = useState<Record<string, string>>({})
  const [showImagePanel, setShowImagePanel] = useState(false)
  const localImageUrlsRef = useRef<Record<string, string>>({})
  useEffect(() => {
    localImageUrlsRef.current = localImageUrls
  }, [localImageUrls])
  const [pickedKeys, setPickedKeys] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(PICKED_STORAGE_KEY)
      const parsed = raw ? (JSON.parse(raw) as string[]) : []
      return new Set(Array.isArray(parsed) ? parsed : [])
    } catch {
      return new Set()
    }
  })
  const pickedKeysRef = useRef(pickedKeys)
  useEffect(() => {
    pickedKeysRef.current = pickedKeys
    try {
      localStorage.setItem(PICKED_STORAGE_KEY, JSON.stringify(Array.from(pickedKeys)))
    } catch {
      // ignore
    }
  }, [pickedKeys])

  useEffect(() => {
    saveOrderPickingCustomItemRules(customRules)
  }, [customRules])

  const addNewRule = () => {
    const matchText = newRuleMatchText.trim()
    const addItemName = newRuleAddItemName.trim()
    const qty = Number.parseInt(newRuleAddQuantity, 10)
    const addQuantity = Number.isFinite(qty) && qty > 0 ? qty : 1

    if (!matchText || !addItemName) return

    const rule: OrderPickingCustomItemRule = normalizeRuleInput({
      id: `user:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`,
      enabled: true,
      matchText,
      addItemName,
      addQuantity,
    })

    setCustomRules((prev) => [...prev, rule])
    setNewRuleMatchText("")
    setNewRuleAddItemName("")
    setNewRuleAddQuantity("1")
  }

  const applyCurrentFilter = useCallback(
    (sourceOrders: BooqableOrder[]) => {
      const filtered = sourceOrders.filter((o) => isOrderInDateRange(o, startDate, endDate))
      const sorted = [...filtered].sort((a, b) => {
        const aDate = new Date(a.starts_at ?? 0).getTime()
        const bDate = new Date(b.starts_at ?? 0).getTime()
        if (Number.isNaN(aDate) && Number.isNaN(bDate)) return 0
        if (Number.isNaN(aDate)) return 1
        if (Number.isNaN(bDate)) return -1
        return aDate - bDate
      })
      const uiOrders: Order[] = sorted.map((o) => {
        const dateRange = buildDateRange(o)
        const lines = getOrderLines(o)
        let items = lines
          .map((l) => {
            const id = l.id ?? `${o.id}:${String(l.item_id ?? l.title ?? "line")}`
            const name = (typeof l.title === "string" && l.title.trim().length > 0 ? l.title : "Item")
            const qty = parseNumber(l.quantity ?? l.quantity_as_decimal)
            const pickedKey = `${o.id}:${id}`
            const booqableItemId = typeof l.item_id === "string" ? l.item_id : undefined
            return {
              id,
              name,
              quantity: qty,
              booqableItemId,
              picked: pickedKeysRef.current.has(pickedKey),
            }
          })
          .filter((i) => i.quantity > 0)

        const enabledRules = customRules.filter((r) => r.enabled)
        if (enabledRules.length > 0) {
          const itemNames = items.map((i) => i.name)
          for (const rule of enabledRules) {
            if (!orderMatchesRule(itemNames, rule)) continue
            const injectedId = `${CUSTOM_RULE_PICKED_PREFIX}${rule.id}`
            const pickedKey = `${o.id}:${injectedId}`
            const already = items.find((i) => i.id === injectedId)
            if (already) {
              already.quantity += rule.addQuantity
              continue
            }
            items.push({
              id: injectedId,
              name: rule.addItemName,
              quantity: rule.addQuantity,
              booqableItemId: undefined,
              picked: pickedKeysRef.current.has(pickedKey),
            })
          }
        }

        if (items.length === 0) {
          const fallbackQty =
            typeof o.item_count === "number" && Number.isFinite(o.item_count) && o.item_count > 0 ? o.item_count : 1
          items = [
            {
              id: `${o.id}:placeholder`,
              name: "Items not loaded yet",
              quantity: fallbackQty,
              booqableItemId: undefined,
              picked: false,
            },
          ]
        }

        return {
          id: o.id,
          dateRange,
          items,
        }
      })

      setOrders(uiOrders)
    },
    [customRules, endDate, startDate],
  )

  useEffect(() => {
    applyCurrentFilter(rawOrders)
  }, [applyCurrentFilter, rawOrders, startDate, endDate])

  useEffect(() => {
    if (!settings?.businessSlug) return
    const key = buildItemPhotoMapCacheKey(settings.businessSlug)
    void getCachedValue<ItemPhotoMap>(key)
      .then((cached) => {
        if (cached?.value) {
          setItemPhotosMap(cached.value)
          setShowImages(true)
        } else {
          setItemPhotosMap(null)
          setShowImages(false)
        }
      })
      .catch(() => {
        setItemPhotosMap(null)
        setShowImages(false)
      })
  }, [settings?.businessSlug])

  useEffect(() => {
    return () => {
      const urls = Object.values(localImageUrlsRef.current)
      for (const url of urls) {
        try {
          URL.revokeObjectURL(url)
        } catch {
          // ignore
        }
      }
    }
  }, [])

  const handleRefresh = async () => {
    await refreshOrders({ enrichStartDate: startDate, enrichEndDate: endDate })
  }

  const handleApplyFilter = () => {
    applyCurrentFilter(rawOrders)
  }

  const toggleItemPicked = (orderId: string, itemId: string) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              items: order.items.map((item) => (item.id === itemId ? { ...item, picked: !item.picked } : item)),
            }
          : order,
      ),
    )

    const key = `${orderId}:${itemId}`
    setPickedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const unpickAll = () => {
    setOrders((prevOrders) =>
      prevOrders.map((order) => ({
        ...order,
        items: order.items.map((item) => ({ ...item, picked: false })),
      })),
    )
    setPickedKeys(new Set())
  }

  const getCombinedItems = () => {
    const combined: Record<string, OrderItem> = {}
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (combined[item.name]) {
          combined[item.name].quantity += item.quantity
        } else {
          combined[item.name] = { ...item }
        }
      })
    })
    let items = Object.values(combined)
    if (sortByQuantity) {
      items = items.sort((a, b) => b.quantity - a.quantity)
    }
    return items
  }

  const getCombinedByDate = () => {
    const byDate: Record<string, { dateRange: string; items: Record<string, OrderItem> }> = {}
    
    orders.forEach((order) => {
      const dateKey = order.dateRange
      if (!byDate[dateKey]) {
        byDate[dateKey] = { dateRange: order.dateRange, items: {} }
      }
      
      order.items.forEach((item) => {
        if (byDate[dateKey].items[item.name]) {
          byDate[dateKey].items[item.name].quantity += item.quantity
        } else {
          byDate[dateKey].items[item.name] = { ...item }
        }
      })
    })
    
    return Object.values(byDate).map((group) => {
      let items = Object.values(group.items)
      if (sortByQuantity) {
        items = items.sort((a, b) => b.quantity - a.quantity)
      }
      return { dateRange: group.dateRange, items }
    })
  }

  const sortedOrders = useMemo(() => {
    return sortByQuantity
      ? orders.map((order) => ({
          ...order,
          items: [...order.items].sort((a, b) => b.quantity - a.quantity),
        }))
      : orders
  }, [orders, sortByQuantity])

  const toggleCombinedItemByName = useCallback(
    (itemName: string, currentlyPicked: boolean) => {
      setOrders((prevOrders) =>
        prevOrders.map((order) => ({
          ...order,
          items: order.items.map((i) => (i.name === itemName ? { ...i, picked: !currentlyPicked } : i)),
        })),
      )

      setPickedKeys((prev) => {
        const next = new Set(prev)
        for (const order of orders) {
          for (const item of order.items) {
            if (item.name !== itemName) continue
            const key = `${order.id}:${item.id}`
            if (currentlyPicked) next.delete(key)
            else next.add(key)
          }
        }
        return next
      })
    },
    [orders],
  )

  const buildItemPhotoMapAndDownload = useCallback(async () => {
    setImageBuildError(null)
    setImageBuildProgress(0)
    setImageBuildText("")

    if (!settings?.businessSlug || !settings?.apiKey) {
      setImageBuildError("Missing API key or business slug. Please configure your settings first.")
      return
    }

    setIsImageBuilding(true)
    try {
      const slug = settings.businessSlug.trim().toLowerCase().replace(/\s+/g, "-")
      const baseUrl = `https://${slug}.booqable.com/api/4/items`

      const allEntries: ItemPhotoMapEntry[] = []
      let page = 1
      let keepGoing = true
      while (keepGoing) {
        const url = new URL(baseUrl)
        url.searchParams.set("fields[items]", "id,name,photo_url")
        url.searchParams.set("page[number]", page.toString())
        url.searchParams.set("page[size]", "100")
        const response = await fetchWithTimeout(url.toString(), {
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            Accept: "application/vnd.api+json",
          },
        })

        if (!response.ok) {
          const text = await response.text()
          throw new Error(`Failed to fetch items (page ${page}): ${response.status} ${text}`)
        }

        const json = (await response.json()) as {
          data?: Array<{ id: string; attributes?: { name?: string; photo_url?: string | null } }>
        }
        const data = Array.isArray(json.data) ? json.data : []

        for (const item of data) {
          const itemId = item?.id
          const itemName = item?.attributes?.name ?? ""
          const photoUrl = item?.attributes?.photo_url ?? null
          if (!itemId || !photoUrl) continue
          const photoKey = extractPhotoKeyFromUrl(photoUrl)
          if (!photoKey) continue
          allEntries.push({ item_id: itemId, item_name: itemName, photo_url: photoUrl, photo_key: photoKey })
        }

        keepGoing = data.length === 100
        page++
        setImageBuildText(`Found ${allEntries.length} items with photos...`)
      }

      allEntries.sort((a, b) => a.item_name.localeCompare(b.item_name))

      const map: ItemPhotoMap = {
        version: 1,
        entries: Object.fromEntries(allEntries.map((e) => [e.item_id, e])),
      }

      await setCachedValue<ItemPhotoMap>({
        key: buildItemPhotoMapCacheKey(settings.businessSlug),
        fetchedAt: new Date().toISOString(),
        businessSlug: settings.businessSlug.trim().toLowerCase(),
        value: map,
      })
      setItemPhotosMap(map)

      const entries = Object.values(map.entries)
      const total = entries.length
      let completed = 0
      let skipped = 0
      let failed = 0

      for (const entry of entries) {
        const blobKey = buildItemPhotoBlobCacheKey(settings.businessSlug, entry.photo_key)
        const existing = await getCachedValue<Blob>(blobKey)
        if (existing?.value) {
          skipped++
          completed++
          setImageBuildProgress((completed / total) * 100)
          setImageBuildText(`Downloading images: ${completed}/${total} (skipped ${skipped}, failed ${failed})`)
          continue
        }

        try {
          const imgResponse = await fetchWithTimeout(entry.photo_url, {}, 30000)
          if (!imgResponse.ok) {
            failed++
            completed++
            continue
          }
          const blob = await imgResponse.blob()
          await setCachedValue<Blob>({
            key: blobKey,
            fetchedAt: new Date().toISOString(),
            businessSlug: settings.businessSlug.trim().toLowerCase(),
            value: blob,
          })
        } catch {
          failed++
        } finally {
          completed++
          setImageBuildProgress((completed / total) * 100)
          setImageBuildText(`Downloading images: ${completed}/${total} (skipped ${skipped}, failed ${failed})`)
        }
      }

      setImageBuildText(`Images cached locally. Downloaded ${total - skipped - failed}, skipped ${skipped}, failed ${failed}.`)
      setImageBuildProgress(100)
      setShowImages(true)
    } catch (e) {
      setImageBuildError(e instanceof Error ? e.message : "Failed to build image cache")
    } finally {
      setIsImageBuilding(false)
    }
  }, [settings])

  const clearImageCache = useCallback(async () => {
    if (!settings?.businessSlug) return
    setImageBuildError(null)
    setImageBuildProgress(0)
    setImageBuildText("")
    try {
      const mapKey = buildItemPhotoMapCacheKey(settings.businessSlug)
      const existingMap = await getCachedValue<ItemPhotoMap>(mapKey)
      const map = existingMap?.value
      if (map?.entries) {
        const entries = Object.values(map.entries)
        for (const entry of entries) {
          await deleteCachedValue(buildItemPhotoBlobCacheKey(settings.businessSlug, entry.photo_key))
        }
      }
      await deleteCachedValue(mapKey)
      setItemPhotosMap(null)
      setShowImages(false)
      const urls = Object.values(localImageUrlsRef.current)
      for (const url of urls) {
        try {
          URL.revokeObjectURL(url)
        } catch {
          // ignore
        }
      }
      setLocalImageUrls({})
    } catch (e) {
      setImageBuildError(e instanceof Error ? e.message : "Failed to clear image cache")
    }
  }, [settings?.businessSlug])

  const resolveLocalImageUrl = useCallback(
    async (itemId: string): Promise<string | null> => {
      if (!settings?.businessSlug) return null
      if (!itemPhotosMap?.entries?.[itemId]) return null
      const entry = itemPhotosMap.entries[itemId]
      const existing = localImageUrlsRef.current[itemId]
      if (existing) return existing
      const blobKey = buildItemPhotoBlobCacheKey(settings.businessSlug, entry.photo_key)
      const blobRecord = await getCachedValue<Blob>(blobKey)
      const blob = blobRecord?.value
      if (!blob) return null
      const url = URL.createObjectURL(blob)
      setLocalImageUrls((prev) => ({ ...prev, [itemId]: url }))
      return url
    },
    [itemPhotosMap, settings?.businessSlug],
  )

  useEffect(() => {
    if (!showImages) return
    const itemIds = new Set<string>()
    for (const order of orders) {
      for (const item of order.items) {
        if (item.booqableItemId) itemIds.add(item.booqableItemId)
      }
    }
    const missing = Array.from(itemIds).filter((id) => !localImageUrlsRef.current[id])
    if (missing.length === 0) return
    void Promise.all(missing.slice(0, 30).map((id) => resolveLocalImageUrl(id)))
  }, [orders, resolveLocalImageUrl, showImages])

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-card px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-pastel-blue flex items-center justify-center">
            <PackageIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Order Picking Helper</h1>
            <p className="text-muted-foreground">Manage and track upcoming orders efficiently</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-6">
        {/* Filter Panel */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FilterIcon className="h-5 w-5" />
              Filter Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-6">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <div className="relative">
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-48"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <div className="relative">
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-48"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pb-2">
                <Switch id="sort-quantity" checked={sortByQuantity} onCheckedChange={setSortByQuantity} />
                <Label htmlFor="sort-quantity" className="cursor-pointer">
                  Sorting by Quantity
                </Label>
              </div>
              <Button onClick={handleApplyFilter} className="bg-pastel-blue hover:bg-pastel-blue/80 text-foreground">
                Apply Filter
              </Button>
              <div className="ml-auto">
                <div className="flex items-center gap-2">
                  <Dialog open={customRulesDialogOpen} onOpenChange={setCustomRulesDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs">
                        Custom item rules
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[96vw] max-w-4xl max-h-[85vh] overflow-y-auto p-6 sm:p-8">
                      <DialogHeader>
                        <DialogTitle>Custom item rules</DialogTitle>
                        <DialogDescription>
                          Automatically add custom picking items when an order contains a matching product name.
                        </DialogDescription>
                      </DialogHeader>
 
                      <div className="space-y-6">
                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label>Match text</Label>
                              <Input
                                value={newRuleMatchText}
                                onChange={(e) => setNewRuleMatchText(e.target.value)}
                                placeholder='e.g. "arch"'
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Add item</Label>
                              <Input
                                value={newRuleAddItemName}
                                onChange={(e) => setNewRuleAddItemName(e.target.value)}
                                placeholder='e.g. "Sandbags"'
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Qty</Label>
                              <Input
                                value={newRuleAddQuantity}
                                onChange={(e) => setNewRuleAddQuantity(e.target.value)}
                                inputMode="numeric"
                                placeholder="1"
                              />
                            </div>
                          </div>
                          <div className="pt-4">
                            <Button
                              onClick={addNewRule}
                              disabled={!newRuleMatchText.trim() || !newRuleAddItemName.trim()}
                              className="bg-pastel-blue hover:bg-pastel-blue/80 text-foreground"
                            >
                              Add rule
                            </Button>
                          </div>
                        </div>
 
                        <div className="border-t border-border pt-4">
                          <div className="text-sm font-medium text-foreground">Your custom rules</div>
                          <div className="text-xs text-muted-foreground pt-1">Enable or disable rules to control what gets auto-added.</div>
                        </div>

                        <div className="space-y-2">
                          {customRules.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No rules yet.</div>
                          ) : (
                            customRules.map((rule) => (
                              <div
                                key={rule.id}
                                className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-border p-3"
                              >
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={rule.enabled}
                                    onCheckedChange={(checked) =>
                                      setCustomRules((prev) =>
                                        prev.map((r) => (r.id === rule.id ? { ...r, enabled: checked } : r)),
                                      )
                                    }
                                  />
                                  <div className="text-sm">
                                    <span className="font-medium">If</span> name contains{" "}
                                    <span className="font-mono">{rule.matchText}</span>, add{" "}
                                    <span className="font-medium">{rule.addItemName}</span> x{rule.addQuantity}
                                  </div>
                                </div>
                                <div className="sm:ml-auto flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCustomRules((prev) => prev.filter((r) => r.id !== rule.id))}
                                    className="text-destructive"
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
 
                      <DialogFooter>
                        <Button variant="secondary" onClick={() => setCustomRulesDialogOpen(false)}>
                          Done
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button
                    onClick={() => setShowImagePanel(!showImagePanel)}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    {showImagePanel ? "Hide" : "Show"} Product Images
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            showImagePanel ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product images (optional)</CardTitle>
              <CardDescription>
                You can use the tool without images. Building an image cache can take time and store many images in your browser storage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={buildItemPhotoMapAndDownload} disabled={isLoading || isImageBuilding} variant="secondary">
                Build local image cache
              </Button>
              <Button onClick={clearImageCache} disabled={isLoading || isImageBuilding || !itemPhotosMap} variant="ghost">
                Clear image cache
              </Button>
              <div className="flex items-center gap-2">
                <Switch checked={showImages} onCheckedChange={setShowImages} disabled={!itemPhotosMap} />
                <Label>Show thumbnails</Label>
              </div>
              {itemPhotosMap && (
                <span className="text-xs text-muted-foreground">{Object.keys(itemPhotosMap.entries).length} items mapped</span>
              )}
            </div>
            {(imageBuildText || imageBuildProgress > 0) && (
              <div className="space-y-2">
                <Progress value={imageBuildProgress} />
                {imageBuildText && <p className="text-xs text-muted-foreground">{imageBuildText}</p>}
              </div>
            )}
            {imageBuildError && <p className="text-sm text-destructive">{imageBuildError}</p>}
          </CardContent>
        </Card>
        </div>

        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="py-4">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              className="bg-pastel-mint hover:bg-pastel-mint/80 text-foreground"
            >
              {isLoading ? (
                <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshIcon className="h-4 w-4 mr-2" />
              )}
              Refresh Orders
            </Button>
            <Button
              onClick={() => {
                setCombineSameDays(!combineSameDays)
                if (!combineSameDays) setCombineAll(false)
              }}
              variant={combineSameDays ? "default" : "secondary"}
              className={combineSameDays ? "bg-foreground text-background" : ""}
            >
              {combineSameDays ? "Show by Order" : "Combine Same Days"}
            </Button>
            <Button
              onClick={() => {
                setCombineAll(!combineAll)
                if (!combineAll) setCombineSameDays(false)
              }}
              variant={combineAll ? "default" : "secondary"}
              className={combineAll ? "bg-foreground text-background" : ""}
            >
              {combineAll ? "Show by Date" : "Combine All Days"}
            </Button>
            <Button onClick={unpickAll} variant="secondary">
              Unpick All
            </Button>
            {lastFetched && <span className="text-sm text-muted-foreground">Last fetched: {lastFetched}</span>}
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg border border-border max-w-md w-full sm:w-auto">
            <HelpCircleIcon className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-xs leading-snug">Click items to mark them as picked, makes keeping track easy</p>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Progress value={progress} />
            {progressText && <p className="text-xs text-muted-foreground">{progressText}</p>}
          </div>
        )}

        {/* Orders Display */}
        {combineAll ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-pastel-lavender">All Items Combined</CardTitle>
              <CardDescription>{getCombinedItems().length} unique items across all orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getCombinedItems().map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      item.picked
                        ? "bg-pastel-mint/20 border-pastel-mint"
                        : "bg-card border-border hover:border-pastel-lavender/50"
                    }`}
                  >
                    {showImages && (
                      <img
                        src={(item.booqableItemId && localImageUrls[item.booqableItemId]) || "/placeholder.svg"}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover bg-muted"
                      />
                    )}
                    <Checkbox checked={item.picked} onCheckedChange={() => toggleCombinedItemByName(item.name, item.picked)} />
                    <span className={`flex-1 ${item.picked ? "line-through text-muted-foreground" : ""}`}>
                      {item.name}
                    </span>
                    <span className="text-lg font-semibold text-muted-foreground">{item.quantity}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : combineSameDays ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getCombinedByDate().map((dateGroup) => (
              <Card key={dateGroup.dateRange} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium text-pastel-lavender flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {dateGroup.dateRange}
                  </CardTitle>
                  <CardDescription>{dateGroup.items.length} unique items</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dateGroup.items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${
                        item.picked
                          ? "bg-pastel-mint/20 border-pastel-mint"
                          : "bg-card border-border hover:border-pastel-lavender/50"
                      }`}
                    >
                      {showImages && (
                        <img
                          src={(item.booqableItemId && localImageUrls[item.booqableItemId]) || "/placeholder.svg"}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover bg-muted"
                        />
                      )}
                      <Checkbox checked={item.picked} onCheckedChange={() => toggleCombinedItemByName(item.name, item.picked)} />
                      <span className={`flex-1 ${item.picked ? "line-through text-muted-foreground" : ""}`}>
                        {item.name}
                      </span>
                      <span className="text-lg font-semibold text-muted-foreground">{item.quantity}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium text-pastel-lavender flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {order.dateRange}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${
                        item.picked
                          ? "bg-pastel-mint/20 border-pastel-mint"
                          : "bg-card border-border hover:border-pastel-lavender/50"
                      }`}
                      onClick={() => toggleItemPicked(order.id, item.id)}
                    >
                      {showImages && (
                        <img
                          src={(item.booqableItemId && localImageUrls[item.booqableItemId]) || "/placeholder.svg"}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover bg-muted"
                        />
                      )}
                      <Checkbox
                        checked={item.picked}
                        onCheckedChange={() => toggleItemPicked(order.id, item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className={`flex-1 text-sm ${item.picked ? "line-through text-muted-foreground" : ""}`}>
                        {item.name}
                      </span>
                      <span className="text-sm font-semibold text-muted-foreground">{item.quantity}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && !error && orders.length === 0 && (
          <Card className="border-dashed border-2 bg-muted/20">
            <CardContent className="py-8 text-center">
              <PackageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No order items found for the selected date range.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <WaveMarquee text="track deliveries • manage inventory • stay organized" variant="blue" speed={30} />
    </div>
  )
}
