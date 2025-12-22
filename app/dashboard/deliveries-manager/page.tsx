"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { WaveMarquee } from "@/components/wave-marquee"
import { useSettings } from "@/lib/use-settings"
import { useOrdersData } from "@/lib/use-orders-data"
import type { BooqableOrder } from "@/lib/use-orders-data"
import { getCachedValue, setCachedValue } from "@/lib/orders-cache"
import {
  TruckIcon,
  RefreshIcon,
  LoaderIcon,
  CalendarIcon,
  PackageIcon,
  UserIcon,
  PhoneIcon,
  ClipboardListIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
} from "@/components/icons"
import Link from "next/link"


const DRIVERS_STORAGE_KEY = "deliveryDriversList"
const ASSIGNMENTS_STORAGE_KEY = "deliveryDriverAssignments"
const DRIVER_CACHE_VERSION = 1
const ASSIGNMENTS_CACHE_VERSION = 1

type DriverCache = {
  version: typeof DRIVER_CACHE_VERSION
  drivers: string[]
}

type AssignmentCache = {
  version: typeof ASSIGNMENTS_CACHE_VERSION
  assignments: Record<string, string[]>
}

function buildDriverCacheKey(businessSlug: string): string {
  return `${DRIVERS_STORAGE_KEY}:${businessSlug.trim().toLowerCase()}`
}

function buildAssignmentCacheKey(businessSlug: string): string {
  return `${ASSIGNMENTS_STORAGE_KEY}:${businessSlug.trim().toLowerCase()}`
}

function formatDate(dt: string | undefined): string {
  if (!dt) return ""
  const d = new Date(dt)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function DeliveriesManagerPage() {
  const { settings } = useSettings()
  const { orders, isLoading, error, lastFetched, progress, progressText, refreshOrders } = useOrdersData()
  const [filteredOrders, setFilteredOrders] = useState<BooqableOrder[]>([])

  const [drivers, setDrivers] = useState<string[]>([])
  const [newDriverName, setNewDriverName] = useState("")
  const [driverAssignments, setDriverAssignments] = useState<Record<string, string[]>>({})
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const copyTimeoutRef = useRef<number | null>(null)

  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const future = new Date()
    future.setDate(future.getDate() + 30)
    return future.toISOString().split("T")[0]
  })

  useEffect(() => {
    if (!settings?.businessSlug) return
    const key = buildDriverCacheKey(settings.businessSlug)
    void (async () => {
      try {
        const cached = await getCachedValue<DriverCache>(key)
        const value = cached?.value
        if (value?.version === DRIVER_CACHE_VERSION && Array.isArray(value.drivers)) {
          setDrivers(value.drivers)
        } else {
          setDrivers([])
        }
      } catch {
        setDrivers([])
      }
    })()
  }, [settings?.businessSlug])

  useEffect(() => {
    if (!settings?.businessSlug) return
    const key = buildAssignmentCacheKey(settings.businessSlug)
    void (async () => {
      try {
        const cached = await getCachedValue<AssignmentCache>(key)
        const value = cached?.value
        if (value?.version === ASSIGNMENTS_CACHE_VERSION && value.assignments && typeof value.assignments === "object") {
          const normalized: Record<string, string[]> = {}
          for (const [orderId, entry] of Object.entries(value.assignments)) {
            if (Array.isArray(entry)) {
              normalized[orderId] = entry
            } else if (typeof entry === "string") {
              normalized[orderId] = [entry]
            }
          }
          setDriverAssignments(normalized)
        } else {
          setDriverAssignments({})
        }
      } catch {
        setDriverAssignments({})
      }
    })()
  }, [settings?.businessSlug])

  useEffect(() => {
    if (!settings?.businessSlug) return
    const key = buildDriverCacheKey(settings.businessSlug)
    void setCachedValue<DriverCache>({
      key,
      fetchedAt: new Date().toISOString(),
      businessSlug: settings.businessSlug.trim().toLowerCase(),
      value: { version: DRIVER_CACHE_VERSION, drivers },
    }).catch(() => {
      // ignore
    })
  }, [drivers, settings?.businessSlug])

  useEffect(() => {
    if (!settings?.businessSlug) return
    const key = buildAssignmentCacheKey(settings.businessSlug)
    void setCachedValue<AssignmentCache>({
      key,
      fetchedAt: new Date().toISOString(),
      businessSlug: settings.businessSlug.trim().toLowerCase(),
      value: { version: ASSIGNMENTS_CACHE_VERSION, assignments: driverAssignments },
    }).catch(() => {
      // ignore
    })
  }, [driverAssignments, settings?.businessSlug])

  const addDriver = () => {
    const trimmed = newDriverName.trim()
    if (trimmed && !drivers.includes(trimmed)) {
      setDrivers((prev) => [...prev, trimmed])
      setNewDriverName("")
    }
  }

  const removeDriver = (driverName: string) => {
    setDrivers((prev) => prev.filter((d) => d !== driverName))
    setDriverAssignments((prev) => {
      const updated: Record<string, string[]> = {}
      for (const [orderId, list] of Object.entries(prev)) {
        const filtered = list.filter((d) => d !== driverName)
        if (filtered.length > 0) {
          updated[orderId] = filtered
        }
      }
      return updated
    })
  }

  const assignDriver = (orderId: string, driverName: string) => {
    if (!driverName) return
    setDriverAssignments((prev) => {
      const current = prev[orderId] ?? []
      if (current.includes(driverName)) return prev
      return { ...prev, [orderId]: [...current, driverName] }
    })
  }

  const unassignDriver = (orderId: string, driverName: string) => {
    setDriverAssignments((prev) => {
      const current = prev[orderId]
      if (!current) return prev
      const next = current.filter((d) => d !== driverName)
      if (next.length === 0) {
        const { [orderId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [orderId]: next }
    })
  }

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current)
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current))
      }, 1500)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${endDate}T23:59:59`)

    const filtered = orders.filter((order) => {
      if (!order.starts_at) return false
      const orderStart = new Date(order.starts_at)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || Number.isNaN(orderStart.getTime()))
        return true
      return orderStart >= start && orderStart <= end
    })

    const sorted = filtered.sort((a, b) => {
      const aDate = new Date(a.starts_at || 0)
      const bDate = new Date(b.starts_at || 0)
      return aDate.getTime() - bDate.getTime()
    })

    setFilteredOrders(sorted)
  }, [orders, startDate, endDate])

  const handleRefresh = async () => {
    await refreshOrders()
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="border-b border-border bg-card px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-pastel-peach flex items-center justify-center">
            <TruckIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Deliveries Manager</h1>
            <p className="text-muted-foreground">Manage upcoming orders and assign delivery drivers</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Filter Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-48"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-48"
                  />
                </div>
                <Button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="bg-pastel-mint hover:bg-pastel-mint/80 text-foreground"
                >
                  {isLoading ? <LoaderIcon className="h-4 w-4 mr-2 animate-spin" /> : <RefreshIcon className="h-4 w-4 mr-2" />}
                  Refresh Orders
                </Button>
              </div>
              {lastFetched && <p className="text-xs text-muted-foreground">Last fetched: {lastFetched}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Delivery Drivers
              </CardTitle>
              <CardDescription>Add and manage your delivery drivers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Driver name"
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDriver()}
                />
                <Button onClick={addDriver} size="icon" className="shrink-0">
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {drivers.length === 0 ? "No drivers yet" : `${drivers.length} driver${drivers.length === 1 ? "" : "s"}`}
                  </p>
                </div>

                {drivers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No drivers added yet</p>
                )}

                {drivers.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {drivers.map((driver) => (
                      <div
                        key={driver}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border"
                      >
                        <span className="text-sm font-medium">{driver}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeDriver(driver)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

        {isLoading && (
          <div className="space-y-2">
            <Progress value={progress} />
            {progressText && <p className="text-xs text-muted-foreground">{progressText}</p>}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Upcoming Orders ({filteredOrders.length})
            </h2>
          </div>

          {!isLoading && !error && filteredOrders.length === 0 && (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="py-8 text-center">
                <PackageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No orders found for the selected date range.</p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const customerName = order.customer?.name || "Unknown Customer"
              const customerEmail = order.customer?.email || ""
              const customerPhone = order.customer?.properties_attributes?.cell_phone || ""
              const deliveryNote = (order.properties_attributes?.notes as string | undefined) || ""
              const assignedDrivers = driverAssignments[order.id] ?? []
              const availableDrivers = drivers.filter((d) => !assignedDrivers.includes(d))

              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-7 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-card-foreground">
                                Order #{order.number || order.id.slice(0, 8)}
                              </h3>
                              {order.status && (
                                <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                                  {order.status}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">ID: {order.id}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Pickup</p>
                            <p className="text-sm font-medium">{formatDate(order.starts_at)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Return</p>
                            <p className="text-sm font-medium">{formatDate(order.stops_at)}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Items</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{order.item_count || 0} items</p>
                            <Link href={`/dashboard/order-picking?orderId=${order.id}`}>
                              <Button variant="outline" size="sm">
                                <ClipboardListIcon className="h-3 w-3 mr-1" />
                                View Items
                              </Button>
                            </Link>
                          </div>
                        </div>

                        <div className="border-t border-border pt-4">
                          <p className="text-xs text-muted-foreground mb-2">Customer</p>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">{customerName}</p>
                            {customerEmail && <p className="text-sm text-muted-foreground">{customerEmail}</p>}
                            {customerPhone && (
                              <div className="flex items-center gap-2">
                                <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">{customerPhone}</p>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => copyText(`phone-${order.id}`, customerPhone)}
                                  className="shrink-0"
                                >
                                  {copiedKey === `phone-${order.id}` ? (
                                    <CheckCircleIcon className="h-4 w-4 text-foreground" />
                                  ) : (
                                    <ClipboardListIcon className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {deliveryNote && (
                          <div className="border-t border-border pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-muted-foreground">Delivery Note</p>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => copyText(`note-${order.id}`, deliveryNote)}
                                className="shrink-0"
                              >
                                {copiedKey === `note-${order.id}` ? (
                                  <CheckCircleIcon className="h-4 w-4 text-foreground" />
                                ) : (
                                  <ClipboardListIcon className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <p className="text-sm bg-muted/30 p-3 rounded-lg">{deliveryNote}</p>
                          </div>
                        )}
                      </div>

                      <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6 space-y-3">
                        <p className="text-xs text-muted-foreground">Assign Driver(s)</p>

                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Assigned</p>
                          {assignedDrivers.length === 0 ? (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
                              <UserIcon className="h-4 w-4" />
                              <span className="text-sm font-medium">No drivers assigned yet</span>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {assignedDrivers.map((driver) => (
                                <div
                                  key={`${order.id}-${driver}`}
                                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-pastel-mint/20 border border-pastel-mint/30"
                                >
                                  <UserIcon className="h-4 w-4 text-foreground" />
                                  <span className="text-sm font-medium">{driver}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => unassignDriver(order.id, driver)}
                                    className="ml-1"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            {assignedDrivers.length > 0 ? "Add another driver" : "Assign driver"}
                          </p>
                          {drivers.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Add drivers to assign them to orders
                            </p>
                          ) : availableDrivers.length === 0 ? (
                            <p className="text-sm text-muted-foreground">All drivers assigned to this order.</p>
                          ) : (
                            availableDrivers.map((driver) => (
                              <Button
                                key={driver}
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => assignDriver(order.id, driver)}
                              >
                                <UserIcon className="h-4 w-4 mr-2" />
                                {driver}
                              </Button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>

      <WaveMarquee text="manage deliveries • assign drivers • track orders" variant="peach" speed={30} />
    </div>
  )
}
