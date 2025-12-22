"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { WaveMarquee } from "@/components/wave-marquee"
import { useSettings } from "@/lib/use-settings"
import { getAllPaginated } from "@/lib/api"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { clearCachedOrders, getCachedOrders, setCachedOrders } from "@/lib/orders-cache"
import {
  ChartBarIcon,
  CopyIcon,
  ArrowRightIcon,
  HeartIcon,
  DownloadIcon,
  RefreshIcon,
  LoaderIcon,
  TrendingUpIcon,
  UsersIcon,
  PieChartIcon,
  CheckCircleIcon,
} from "@/components/icons"
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import Image from "next/image"

interface Order {
  id: string
  properties_attributes?: Record<string, unknown>
  attributes?: {
    created_at?: string
    custom_fields?: Record<string, string>
    properties?: Record<string, unknown>
  }
  properties?: Record<string, unknown>
  custom_fields?: Record<string, string>
  [key: string]: unknown
}

interface ReferralData {
  source: string
  count: number
  percentage: number
  [key: string]: string | number
}

const CHART_COLORS = [
  "oklch(0.7 0.15 350)", // pink
  "oklch(0.75 0.12 200)", // blue
  "oklch(0.7 0.12 120)", // green
  "oklch(0.8 0.12 80)", // yellow
  "oklch(0.75 0.12 220)", // blue
  "oklch(0.7 0.1 30)", // orange
  "oklch(0.7 0.1 150)", // teal
  "oklch(0.75 0.1 300)", // purple
]

function normalizeFieldKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function getValueFromRecordByNormalizedKey(record: unknown, fieldName: string): unknown {
  if (!record || typeof record !== "object") return undefined
  const normalizedTarget = normalizeFieldKey(fieldName)
  const obj = record as Record<string, unknown>

  if (Object.prototype.hasOwnProperty.call(obj, fieldName)) return obj[fieldName]

  for (const key of Object.keys(obj)) {
    if (normalizeFieldKey(key) === normalizedTarget) {
      return obj[key]
    }
  }

  return undefined
}

function findReferralField(order: Order, fieldName: string): string | null {
  const candidates: Array<unknown> = [
    getValueFromRecordByNormalizedKey(order.custom_fields, fieldName),
    getValueFromRecordByNormalizedKey(order.attributes?.custom_fields, fieldName),
    getValueFromRecordByNormalizedKey(order.properties, fieldName),
    getValueFromRecordByNormalizedKey(order.properties_attributes, fieldName),
    getValueFromRecordByNormalizedKey(order.attributes?.properties, fieldName),
    (typeof order[fieldName] === "string" ? order[fieldName] : undefined),
  ]

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate
    }
  }

  return null
}

function getOrderCreatedAt(order: Order): string | null {
  const candidate = order.attributes?.created_at ?? (order as { created_at?: unknown }).created_at
  if (typeof candidate === "string" && candidate.length > 0) return candidate
  return null
}

function buildReferralData(sourceCounts: Record<string, number>, ordersWithReferral: number): ReferralData[] {
  return Object.entries(sourceCounts)
    .map(([source, count]) => ({
      source,
      count,
      percentage: ordersWithReferral > 0 ? (count / ordersWithReferral) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

function ReferralOnboarding({
  onComplete,
}: {
  onComplete: (mode: "existing" | "manual", fieldName?: string) => void
}) {
  const [step, setStep] = useState<"choice" | "existing" | "manual">("choice")
  const [customFieldName, setCustomFieldName] = useState("")
  const [showHelpDialog, setShowHelpDialog] = useState(false)
  const [lightbox, setLightbox] = useState<null | { src: string; alt: string; title: string }>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const copyTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  const copyText = async (key: string, text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = text
        textarea.setAttribute("readonly", "")
        textarea.style.position = "absolute"
        textarea.style.left = "-9999px"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }

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

  const CopyButton = ({ copyKey, text }: { copyKey: string; text: string }) => {
    const copied = copiedKey === copyKey

    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => copyText(copyKey, text)}
        aria-label={copied ? "Copied" : "Copy to clipboard"}
        className={
          copied
            ? "shrink-0 text-foreground bg-muted/60 transition-all duration-150 active:scale-[0.98]"
            : "shrink-0 text-foreground/70 hover:text-foreground hover:bg-muted/60 transition-all duration-150 active:scale-[0.98]"
        }
      >
        {copied ? (
          <CheckCircleIcon className="h-4 w-4 text-foreground transition-transform duration-150 scale-105" />
        ) : (
          <CopyIcon className="h-4 w-4 transition-transform duration-150" />
        )}
      </Button>
    )
  }

  return (
    <div className="flex-1 p-4 sm:p-8 flex items-center justify-center">
      <Card className="max-w-5xl w-full animate-fade-in">
        <CardHeader className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-pastel-lavender flex items-center justify-center mx-auto mb-4">
            <ChartBarIcon className="h-8 w-8 text-foreground" />
          </div>
          <CardTitle className="text-2xl">Set Up Referral Tracking</CardTitle>
          <CardDescription className="text-base">
            Track where your customers are discovering your business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === "choice" && (
            <>
              <p className="text-center text-muted-foreground">
                Referral tracking works by reading a custom field from your Booqable checkout form. This field asks
                customers how they found your business.
              </p>

              <div className="grid gap-4">
                <button
                  onClick={() => setStep("manual")}
                  className="p-5 rounded-xl border-2 border-primary/40 bg-pastel-lavender/20 hover:border-primary hover:bg-pastel-lavender/30 transition-all text-left group relative overflow-hidden"
                >
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    Recommended
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-pastel-lavender flex items-center justify-center shrink-0">
                      <HeartIcon className="h-6 w-6 text-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg text-card-foreground group-hover:text-primary transition-colors">
                        Set up referral tracking (2 minutes)
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Follow a quick guide to add the required field to your Booqable checkout
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-2 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        Tracking begins once it is added. Future orders will include this data.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setStep("existing")}
                  className="p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-pastel-mint/10 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-pastel-mint flex items-center justify-center shrink-0">
                      <CheckCircleIcon className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-card-foreground group-hover:text-primary transition-colors">
                        I already have a custom field set up
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Enter the name of your existing referral tracking field
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </>
          )}

          {step === "manual" && (
            <>
              <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Need help?</DialogTitle>
                    <DialogDescription>
                      Email us and we will help you get referral tracking set up.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <a
                      href="mailto:contact@halfinthebox.com"
                      className="text-sm font-medium text-primary underline underline-offset-4"
                    >
                      contact@halfinthebox.com
                    </a>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowHelpDialog(false)}>
                      Close
                    </Button>
                    <Button type="button" onClick={() => window.open("mailto:contact@halfinthebox.com")}>Email us</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog
                open={lightbox !== null}
                onOpenChange={(open) => {
                  if (!open) {
                    setLightbox(null)
                  }
                }}
              >
                <DialogContent
                  showCloseButton={false}
                  className="max-w-none w-screen h-[100dvh] p-0 top-0 left-0 translate-x-0 translate-y-0 rounded-none border-0 shadow-none bg-transparent sm:max-w-none"
                >
                  <DialogHeader className="sr-only">
                    <DialogTitle>{lightbox?.title ?? "Screenshot"}</DialogTitle>
                    <DialogDescription>Enlarged screenshot preview.</DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-card-foreground truncate">{lightbox?.title ?? ""}</div>
                        <div className="text-xs text-muted-foreground">Screenshot preview</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setLightbox(null)
                          }}
                        >
                          Close
                        </Button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-hidden bg-black/80 p-4 flex items-center justify-center">
                      {lightbox && (
                        <Image
                          src={lightbox.src}
                          alt={lightbox.alt}
                          width={1800}
                          height={1200}
                          className="w-full h-auto max-h-[calc(100dvh-7rem)] object-contain rounded-lg"
                        />
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="space-y-5">
                <div className="rounded-xl border border-border overflow-hidden bg-muted/30">
                  <div className="px-4 py-2 bg-muted border-b border-border">
                    <p className="text-xs font-medium text-muted-foreground">Preview: What customers will see</p>
                  </div>
                  <div className="p-4 flex justify-center">
                    <Image
                      src="/images/checkout-preview.png"
                      alt="Preview of the referral dropdown field on checkout"
                      width={400}
                      height={150}
                      className="rounded-lg border border-border shadow-sm"
                    />
                  </div>
                  <div className="px-4 py-3 bg-muted/50 border-t border-border">
                    <p className="text-xs text-muted-foreground text-center">
                      This dropdown will be added to the bottom of your checkout form. You can reposition it in your
                      Booqable checkout settings.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border bg-background/40 p-4 flex flex-col">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Step 1 (required)</div>
                      <div className="mt-1 text-sm font-semibold text-card-foreground">Create the custom field</div>
                    </div>

                    <div className="mt-3 flex flex-col gap-3 flex-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-lg border border-border bg-muted/20 p-3">
                          <div className="text-xs text-muted-foreground">Custom field label</div>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <div className="font-mono text-sm text-card-foreground">ReferralHow</div>
                            <CopyButton copyKey="step1-custom-field-label" text="ReferralHow" />
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/20 p-3">
                          <div className="text-xs text-muted-foreground">Data type</div>
                          <div className="mt-1 text-sm font-medium text-card-foreground">Drop-down</div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <div className="text-xs text-muted-foreground">Recommended dropdown options</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="text-xs px-2 py-1 rounded-md bg-muted text-foreground">Google</span>
                          <span className="text-xs px-2 py-1 rounded-md bg-muted text-foreground">Instagram</span>
                          <span className="text-xs px-2 py-1 rounded-md bg-muted text-foreground">Facebook</span>
                          <span className="text-xs px-2 py-1 rounded-md bg-muted text-foreground">Word of mouth</span>
                          <span className="text-xs px-2 py-1 rounded-md bg-muted text-foreground">Other</span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          You can add any options you like. These are just a good starting point.
                        </div>
                      </div>

                      <div className="mt-auto space-y-3">
                        <div className="rounded-xl border border-border overflow-hidden bg-muted/30">
                          <div className="px-4 py-2 bg-muted border-b border-border">
                            <p className="text-xs font-medium text-muted-foreground">Screenshot (click to enlarge)</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setLightbox({
                                src: "/images/customfieldscreenshot.png",
                                alt: "Booqable custom field settings showing ReferralHow dropdown configuration",
                                title: "Step 1 screenshot",
                              })
                            }}
                            className="w-full p-3"
                          >
                            <Image
                              src="/images/customfieldscreenshot.png"
                              alt="Booqable custom field settings showing ReferralHow dropdown configuration"
                              width={900}
                              height={600}
                              className="w-full h-auto rounded-lg border border-border cursor-zoom-in"
                            />
                          </button>
                        </div>

                        <a
                          href="https://help.booqable.com/en/articles/2170699-how-to-add-custom-fields-to-customers-orders-and-products"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block text-sm text-primary underline underline-offset-4"
                        >
                          Official guide: Create custom fields (Booqable)
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background/40 p-4 flex flex-col">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Step 2 (required)</div>
                      <div className="mt-1 text-sm font-semibold text-card-foreground">Add the field to checkout</div>
                    </div>

                    <div className="mt-3 flex flex-col gap-3 flex-1">
                      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                        <div className="text-xs text-muted-foreground">What to set</div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm text-card-foreground">
                              Linked custom field: <span className="font-mono">ReferralHow</span>
                            </div>
                            <CopyButton copyKey="step2-linked-field" text="ReferralHow" />
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm text-card-foreground">
                              Label: <span className="font-medium">How did you hear about us?</span>
                            </div>
                            <CopyButton copyKey="step2-label" text="How did you hear about us?" />
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm text-card-foreground">
                              Tooltip (suggested): <span className="text-muted-foreground">Please let us know how you found out about us!</span>
                            </div>
                            <CopyButton copyKey="step2-tooltip" text="Please let us know how you found out about us!" />
                          </div>

                          <div className="text-sm text-card-foreground">
                            Recommended: turn on <span className="font-medium">Required field</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto space-y-3">
                        <div className="rounded-xl border border-border overflow-hidden bg-muted/30">
                          <div className="px-4 py-2 bg-muted border-b border-border">
                            <p className="text-xs font-medium text-muted-foreground">Screenshot (click to enlarge)</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setLightbox({
                                src: "/images/checkoutfieldsscreenshot.png",
                                alt: "Booqable checkout field settings showing how to link the ReferralHow custom field",
                                title: "Step 2 screenshot",
                              })
                            }}
                            className="w-full p-3"
                          >
                            <Image
                              src="/images/checkoutfieldsscreenshot.png"
                              alt="Booqable checkout field settings showing how to link the ReferralHow custom field"
                              width={900}
                              height={600}
                              className="w-full h-auto rounded-lg border border-border cursor-zoom-in"
                            />
                          </button>
                        </div>

                        <a
                          href="https://help.booqable.com/en/articles/9286611"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block text-sm text-primary underline underline-offset-4"
                        >
                          Official guide: Add the field to checkout (Booqable)
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> Referral tracking will only capture data from orders placed after the field
                    is added. Historical orders won't have this data.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => setStep("choice")} className="sm:flex-1">
                  Back
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowHelpDialog(true)} className="sm:flex-1">
                  Need help?
                </Button>
                <Button onClick={() => onComplete("manual", "ReferralHow")} className="sm:flex-1">
                  I added the field
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          )}

          {step === "existing" && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fieldName">Custom Field Name</Label>
                  <Input
                    id="fieldName"
                    placeholder="e.g., ReferralHow, HowDidYouHear, referral_source"
                    value={customFieldName}
                    onChange={(e) => setCustomFieldName(e.target.value)}
                    className="text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the exact name of your custom field as it appears in Booqable
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("choice")} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => onComplete("existing", customFieldName || "ReferralHow")} className="flex-1">
                  Continue
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ReferralInsightsPage() {
  const { settings, updateSettings } = useSettings()
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState("")
  const [referralData, setReferralData] = useState<ReferralData[]>([])
  const [totalOrders, setTotalOrders] = useState(0)
  const [ordersWithReferral, setOrdersWithReferral] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [rateLimitResumeAt, setRateLimitResumeAt] = useState<number | null>(null)
  const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState<number>(0)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false)
  const [useCachedOrders, setUseCachedOrders] = useState(true)
  const [cachedOrdersFetchedAt, setCachedOrdersFetchedAt] = useState<string | null>(null)
  const [lastFetchedOrders, setLastFetchedOrders] = useState<Order[]>([])
  const [showOrdersDialog, setShowOrdersDialog] = useState(false)
  const [ordersDialogLoading, setOrdersDialogLoading] = useState(false)
  const [ordersDialogError, setOrdersDialogError] = useState<string | null>(null)
  const [ordersDialogVisibleCount, setOrdersDialogVisibleCount] = useState(100)

  const [pageSize, setPageSize] = useState(settings?.pageSize?.toString() || "50")
  const [sleepDelay, setSleepDelay] = useState(settings?.sleepDelay?.toString() || "500")
  const [fieldName, setFieldName] = useState(settings?.referralFieldName || "ReferralHow")

  // Check if onboarding is needed
  useEffect(() => {
    if (settings && !settings.hasCompletedReferralOnboarding) {
      setShowOnboarding(true)
    }
  }, [settings])

  useEffect(() => {
    if (!settings) return

    setTotalOrders(settings.referralTotalOrdersScanned || 0)
    setOrdersWithReferral(settings.referralOrdersWithReferral || 0)

    if (settings.referralSourceCounts) {
      setReferralData(buildReferralData(settings.referralSourceCounts, settings.referralOrdersWithReferral || 0))
    }
  }, [settings])

  useEffect(() => {
    if (!settings?.businessSlug) return

    getCachedOrders<Order>(settings.businessSlug)
      .then((cached) => {
        setCachedOrdersFetchedAt(cached?.fetchedAt ?? null)

        if (!cached?.orders?.length) return
        const cachedUniqueCount = new Map(cached.orders.map((o) => [o.id, o])).size
        if (settings.referralTotalOrdersScanned > cachedUniqueCount) {
          setTotalOrders(cachedUniqueCount)
        }
      })
      .catch(() => {
        setCachedOrdersFetchedAt(null)
      })
  }, [settings?.businessSlug, settings?.referralTotalOrdersScanned])

  const handleOnboardingComplete = (mode: "existing" | "manual", customFieldName?: string) => {
    const name = customFieldName || "ReferralHow"
    setFieldName(name)
    updateSettings({
      referralFieldName: name,
      hasCompletedReferralOnboarding: true,
      referralSetupMode: mode,
    })
    setShowOnboarding(false)
  }

  const fetchReferralData = useCallback(async () => {
    setIsLoading(true)
    setProgress(0)
    setError(null)
    setProgressText("")

    try {
      if (!settings) {
        throw new Error("Settings not loaded")
      }

      const existingCounts = settings.referralSourceCounts || {}
      const lastScannedCreatedAt = settings.referralLastScannedCreatedAt
      const lastScannedOrderId = settings.referralLastScannedOrderId

      const stopWhen = (order: unknown) => {
        const typed = order as Order
        if (!lastScannedOrderId) return false
        if (typed.id !== lastScannedOrderId) return false

        if (!lastScannedCreatedAt) return true
        const createdAt = getOrderCreatedAt(typed)
        if (!createdAt) return true
        return createdAt <= lastScannedCreatedAt
      }

      let orders: Order[] | null = null
      let loadedFromCache = false
      if (useCachedOrders && settings.businessSlug) {
        const cached = await getCachedOrders<Order>(settings.businessSlug)
        if (cached?.orders?.length) {
          orders = cached.orders
          loadedFromCache = true
          setCachedOrdersFetchedAt(cached.fetchedAt)
        }
      }

      if (!orders) {
        orders = await getAllPaginated<Order>("orders", {
          pageSize: Number.parseInt(pageSize),
          sleepDelay: Number.parseInt(sleepDelay),
          stopWhen,
          paginationMode: "legacy",
          onRateLimit: ({ retryAfterSeconds }) => {
            const resumeAt = Date.now() + retryAfterSeconds * 1000
            setRateLimitResumeAt(resumeAt)
            setRateLimitSecondsLeft(retryAfterSeconds)
            setProgressText(`Rate limited. Waiting ${retryAfterSeconds} seconds before continuing...`)
          },
          onProgress: (fetched, total) => {
            if (total) {
              setProgress((fetched / total) * 100)
              setProgressText(`Fetched ${fetched} of ${total} orders...`)
            } else {
              setProgressText(`Fetched ${fetched} orders...`)
            }
          },
        })
      }

      const fetchedUnique = Array.from(new Map(orders.map((o) => [o.id, o])).values())

      let mergedOrders = fetchedUnique
      if (!loadedFromCache && settings.businessSlug) {
        const cachedExisting = await getCachedOrders<Order>(settings.businessSlug)
        const existingOrders = cachedExisting?.orders ?? []
        const merged = [...existingOrders, ...fetchedUnique]
        mergedOrders = Array.from(new Map(merged.map((o) => [o.id, o])).values())
        await setCachedOrders<Order>(settings.businessSlug, mergedOrders)
        setCachedOrdersFetchedAt(new Date().toISOString())
      }

      setLastFetchedOrders(mergedOrders)

      const sourceCounts: Record<string, number> = {}
      let totalScanned = 0
      let withReferralTotal = 0

      let newestCreatedAt: string | null = null
      let newestOrderId: string | null = null

      for (const order of mergedOrders) {
        const createdAt = getOrderCreatedAt(order)

        totalScanned++

        if (createdAt && (!newestCreatedAt || createdAt > newestCreatedAt)) {
          newestCreatedAt = createdAt
          newestOrderId = order.id
        }

        const referralSource = findReferralField(order, fieldName)
        if (!referralSource) continue

        withReferralTotal++
        const normalizedSource = referralSource.trim()
        sourceCounts[normalizedSource] = (sourceCounts[normalizedSource] || 0) + 1
      }

      updateSettings({
        referralSourceCounts: sourceCounts,
        referralTotalOrdersScanned: totalScanned,
        referralOrdersWithReferral: withReferralTotal,
        ...(newestOrderId && newestCreatedAt
          ? { referralLastScannedOrderId: newestOrderId, referralLastScannedCreatedAt: newestCreatedAt }
          : {}),
      })

      setTotalOrders(totalScanned)
      setOrdersWithReferral(withReferralTotal)
      setReferralData(buildReferralData(sourceCounts, withReferralTotal))
      setProgressText("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data")
    } finally {
      setIsLoading(false)
    }
  }, [fieldName, pageSize, settings, sleepDelay, updateSettings, useCachedOrders])

  const resetScan = () => {
    updateSettings({
      referralLastScannedOrderId: null,
      referralLastScannedCreatedAt: null,
      referralSourceCounts: null,
      referralTotalOrdersScanned: 0,
      referralOrdersWithReferral: 0,
    })
    setReferralData([])
    setTotalOrders(0)
    setOrdersWithReferral(0)
    setError(null)
    setProgress(0)
    setProgressText("")
  }

  const clearOrdersCache = async () => {
    if (!settings?.businessSlug) return
    await clearCachedOrders(settings.businessSlug)

    updateSettings({
      referralLastScannedOrderId: null,
      referralLastScannedCreatedAt: null,
      referralSourceCounts: null,
      referralTotalOrdersScanned: 0,
      referralOrdersWithReferral: 0,
    })

    setReferralData([])
    setTotalOrders(0)
    setOrdersWithReferral(0)
    setError(null)
    setProgress(0)
    setProgressText("")
    setCachedOrdersFetchedAt(null)
    setLastFetchedOrders([])
  }

  const openOrdersDialog = async () => {
    setShowOrdersDialog(true)
    setOrdersDialogError(null)
    setOrdersDialogVisibleCount(100)
    if (lastFetchedOrders.length > 0) return
    if (!settings?.businessSlug) {
      setOrdersDialogError("Business slug not set")
      return
    }

    setOrdersDialogLoading(true)
    try {
      const cached = await getCachedOrders<Order>(settings.businessSlug)
      if (!cached?.orders?.length) {
        setOrdersDialogError("No cached orders found. Click Fetch All Orders first.")
        return
      }
      setCachedOrdersFetchedAt(cached.fetchedAt)
      setLastFetchedOrders(cached.orders)
    } catch (err) {
      setOrdersDialogError(err instanceof Error ? err.message : "Failed to load cached orders")
    } finally {
      setOrdersDialogLoading(false)
    }
  }

  useEffect(() => {
    if (!rateLimitResumeAt) return

    const interval = window.setInterval(() => {
      const secondsLeft = Math.max(0, Math.ceil((rateLimitResumeAt - Date.now()) / 1000))
      setRateLimitSecondsLeft(secondsLeft)
      if (secondsLeft <= 0) {
        setRateLimitResumeAt(null)
      }
    }, 250)

    return () => window.clearInterval(interval)
  }, [rateLimitResumeAt])

  const exportToCSV = () => {
    if (referralData.length === 0) return

    const headers = ["Source", "Count", "Percentage"]
    const rows = referralData.map((d) => [d.source, d.count.toString(), `${d.percentage.toFixed(1)}%`])

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `referral-insights-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSettingsChange = (key: "pageSize" | "sleepDelay", value: string) => {
    if (key === "pageSize") {
      setPageSize(value)
      updateSettings({ pageSize: Number.parseInt(value) })
    } else {
      setSleepDelay(value)
      updateSettings({ sleepDelay: Number.parseInt(value) })
    }
  }

  const handleFieldNameChange = (value: string) => {
    setFieldName(value)
    updateSettings({
      referralFieldName: value,
      referralLastScannedOrderId: null,
      referralLastScannedCreatedAt: null,
      referralSourceCounts: null,
      referralTotalOrdersScanned: 0,
      referralOrdersWithReferral: 0,
    })
    setReferralData([])
    setTotalOrders(0)
    setOrdersWithReferral(0)
  }

  // Show onboarding if needed
  if (showOnboarding) {
    return (
      <div className="flex flex-col min-h-full">
        {/* Header */}
        <div className="border-b border-border bg-card px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-pastel-lavender flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-card-foreground">Referral Insights</h1>
              <p className="text-muted-foreground">Analyze where your customers are discovering your business</p>
            </div>
          </div>
        </div>

        <ReferralOnboarding onComplete={handleOnboardingComplete} />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      <Dialog open={rateLimitResumeAt !== null} onOpenChange={(open) => (!open ? setRateLimitResumeAt(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate limit reached</DialogTitle>
            <DialogDescription>
              Booqable is temporarily limiting requests. This scan will automatically continue in about {rateLimitSecondsLeft} seconds.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={showClearCacheConfirm} onOpenChange={setShowClearCacheConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear saved orders?</DialogTitle>
            <DialogDescription>
              This removes locally saved orders from your browser. You will need to refetch orders to see referral data again.
              This will also clear the referral results currently shown on screen.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowClearCacheConfirm(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                await clearOrdersCache()
                setShowClearCacheConfirm(false)
              }}
            >
              Clear cache
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset scan?</DialogTitle>
            <DialogDescription>
              This clears your stored referral totals and scan cursor so you can rebuild from all orders.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                resetScan()
                setShowResetConfirm(false)
              }}
            >
              Reset
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Header */}
      <div className="border-b border-border bg-card px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-pastel-lavender flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-card-foreground">Referral Insights</h1>
              <p className="text-muted-foreground">Analyze where your customers are discovering your business</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {referralData.length > 0 && (
              <Button variant="outline" onClick={exportToCSV}>
                <DownloadIcon className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
            {totalOrders > 0 && (
              <Button type="button" variant="outline" onClick={() => setShowResetConfirm(true)}>
                Reset Scan
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 space-y-6">
        {/* Settings & Fetch */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg">Fetch Settings</CardTitle>
            <CardDescription>Configure your custom field name and fetch settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="fieldName">Custom Field Name</Label>
                <Input
                  id="fieldName"
                  value={fieldName}
                  onChange={(e) => handleFieldNameChange(e.target.value)}
                  placeholder="ReferralHow"
                  className="w-40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pageSize">Records per Page</Label>
                <Select value={pageSize} onValueChange={(v: string) => handleSettingsChange("pageSize", v)}>
                  <SelectTrigger id="pageSize" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sleepDelay">Request Delay</Label>
                <Select value={sleepDelay} onValueChange={(v: string) => handleSettingsChange("sleepDelay", v)}>
                  <SelectTrigger id="sleepDelay" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="250">250ms</SelectItem>
                    <SelectItem value="500">500ms</SelectItem>
                    <SelectItem value="1000">1000ms</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="useCachedOrders"
                  checked={useCachedOrders}
                  onCheckedChange={(v) => setUseCachedOrders(v === true)}
                />
                <Label htmlFor="useCachedOrders">Use cached orders</Label>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" onClick={fetchReferralData} disabled={isLoading} className="min-w-40">
                  {isLoading ? (
                    <>
                      <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <RefreshIcon className="h-4 w-4 mr-2" />
                      Fetch All Orders
                    </>
                  )}
                </Button>
              </div>
            </div>

            {cachedOrdersFetchedAt && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>Orders saved locally at: {new Date(cachedOrdersFetchedAt).toLocaleString()}</span>
                <span>This is stored in your browser for faster tools and debugging.</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowClearCacheConfirm(true)}>
                  Clear cache
                </Button>
              </div>
            )}

            {!cachedOrdersFetchedAt && (
              <div className="mt-3 text-sm text-muted-foreground">
                After fetching, your orders will be saved locally in your browser for faster tools and debugging.
              </div>
            )}

            {isLoading && (
              <div className="mt-4 space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground">{progressText}</p>
              </div>
            )}

            {error && <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        {totalOrders > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
            <Card className="bg-pastel-lavender/20">
              <CardContent className="pt-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-pastel-lavender flex items-center justify-center">
                    <UsersIcon className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-card-foreground">{totalOrders}</p>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-pastel-mint/20">
              <CardContent className="pt-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-pastel-mint flex items-center justify-center">
                    <TrendingUpIcon className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-card-foreground">{ordersWithReferral}</p>
                    <p className="text-sm text-muted-foreground">With Referral Data</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-pastel-peach/20">
              <CardContent className="pt-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-pastel-peach flex items-center justify-center">
                    <PieChartIcon className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-card-foreground">{referralData.length}</p>
                    <p className="text-sm text-muted-foreground">Unique Sources</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!isLoading && totalOrders > 0 && referralData.length === 0 && !error && (
          <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
            <CardContent className="py-10 text-center">
              <h3 className="text-lg font-semibold text-card-foreground mb-2">No Referral Data Found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Scanned <span className="font-medium">{totalOrders}</span> orders and found
                <span className="font-medium"> 0</span> with the <span className="font-medium">"{fieldName}"</span> field.
              </p>
              <button
                type="button"
                onClick={openOrdersDialog}
                className="mt-4 text-sm text-primary underline underline-offset-4 hover:text-primary/80"
              >
                View all orders
              </button>
            </CardContent>
          </Card>
        )}

        <Dialog open={showOrdersDialog} onOpenChange={setShowOrdersDialog}>
          <DialogContent className="max-w-4xl w-[calc(100vw-2rem)]">
            <DialogHeader>
              <DialogTitle>All Orders</DialogTitle>
              <DialogDescription>
                Showing basic order info (number/id, created date, and properties).
              </DialogDescription>
            </DialogHeader>

            {ordersDialogError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{ordersDialogError}</div>
            )}

            {ordersDialogLoading && <div className="text-sm text-muted-foreground">Loading orders...</div>}

            {!ordersDialogLoading && !ordersDialogError && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span>
                    Showing {Math.min(ordersDialogVisibleCount, lastFetchedOrders.length)} of {lastFetchedOrders.length}
                  </span>
                  {cachedOrdersFetchedAt && <span>Saved locally at {new Date(cachedOrdersFetchedAt).toLocaleString()}</span>}
                </div>

                <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
                  <div className="divide-y divide-border">
                    {lastFetchedOrders.slice(0, ordersDialogVisibleCount).map((order) => {
                      const createdAt = getOrderCreatedAt(order)
                      const numberCandidate = (order as { number?: unknown }).number
                      const numberText =
                        typeof numberCandidate === "string" || typeof numberCandidate === "number"
                          ? String(numberCandidate)
                          : order.id
                      const props = order.properties_attributes ?? {}

                      return (
                        <div key={order.id} className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium text-card-foreground truncate">Order {numberText}</div>
                              <div className="text-xs text-muted-foreground truncate">ID: {order.id}</div>
                            </div>
                            <div className="text-xs text-muted-foreground">{createdAt ? new Date(createdAt).toLocaleString() : ""}</div>
                          </div>

                          <pre className="mt-3 text-xs bg-muted/40 rounded-md p-3 overflow-auto">
{JSON.stringify(props, null, 2)}
                          </pre>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {ordersDialogVisibleCount < lastFetchedOrders.length && (
                  <div className="flex justify-center">
                    <Button type="button" variant="outline" onClick={() => setOrdersDialogVisibleCount((c) => c + 100)}>
                      Load more
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Charts */}
        {referralData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Referral Distribution</CardTitle>
                <CardDescription>Breakdown of all referral sources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={referralData}
                        dataKey="count"
                        nameKey="source"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(props) => {
                          const payload = props.payload as ReferralData | undefined
                          const percent = (props.percent ?? 0) * 100
                          const source = payload?.source ?? (typeof props.name === "string" ? props.name : "")
                          return percent > 5 ? `${source}: ${percent.toFixed(0)}%` : ""
                        }}
                        labelLine={false}
                      >
                        {referralData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `${value} orders (${referralData.find((d) => d.source === name)?.percentage.toFixed(1)}%)`,
                          name,
                        ]}
                      />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top Referral Sources</CardTitle>
                <CardDescription>Ranked by number of orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={referralData.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="source" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => [`${value} orders`, "Count"]} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {referralData.slice(0, 8).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Data Table */}
        {referralData.length > 0 && (
          <Card className="animate-fade-in" style={{ animationDelay: "200ms" }}>
            <CardHeader>
              <CardTitle>Raw Data</CardTitle>
              <CardDescription>Complete breakdown of all referral sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Source</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Count</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {referralData.map((item, index) => (
                      <tr key={item.source} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                            />
                            <span className="font-medium text-card-foreground">{item.source}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-card-foreground">{item.count}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{item.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && referralData.length === 0 && totalOrders === 0 && !error && (
          <Card className="animate-fade-in">
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-pastel-lavender/30 flex items-center justify-center mx-auto mb-4">
                <ChartBarIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">Ready to Analyze</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-2">
                Looking for the <span className="font-medium">"{fieldName}"</span> field in your orders.
              </p>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Click "Fetch All Orders" above to pull your order data and see referral source insights.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom wave */}
      <WaveMarquee
        text="Your data stays in your browser • Never sent to our servers • 100% Client-Side"
        variant="pink"
        speed={30}
      />
    </div>
  )
}
