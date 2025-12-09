"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { WaveMarquee } from "@/components/wave-marquee"
import { useSettings } from "@/lib/use-settings"
import { getAllPaginated } from "@/lib/api"
import {
  ChartBarIcon,
  DownloadIcon,
  RefreshIcon,
  LoaderIcon,
  TrendingUpIcon,
  UsersIcon,
  PieChartIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  SparklesIcon,
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
  properties?: Record<string, unknown>
  custom_fields?: Record<string, string>
  [key: string]: unknown
}

interface ReferralData {
  source: string
  count: number
  percentage: number
}

const CHART_COLORS = [
  "oklch(0.75 0.12 280)", // lavender
  "oklch(0.8 0.12 180)", // mint
  "oklch(0.8 0.12 340)", // pink
  "oklch(0.8 0.12 80)", // yellow
  "oklch(0.75 0.12 220)", // blue
  "oklch(0.7 0.1 30)", // orange
  "oklch(0.7 0.1 150)", // teal
  "oklch(0.75 0.1 300)", // purple
]

function findReferralField(order: Order, fieldName: string): string | null {
  // Check custom_fields with exact name and common variations
  const variations = [
    fieldName,
    fieldName.toLowerCase(),
    fieldName
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, ""),
    fieldName.replace(/_/g, " "),
  ]

  if (order.custom_fields) {
    for (const variation of variations) {
      if (order.custom_fields[variation]) {
        return order.custom_fields[variation]
      }
    }
  }

  // Check properties
  if (order.properties) {
    for (const variation of variations) {
      const value = order.properties[variation]
      if (value && typeof value === "string") {
        return value
      }
    }
  }

  // Check top-level
  for (const variation of variations) {
    const value = order[variation]
    if (value && typeof value === "string") {
      return value
    }
  }

  return null
}

function ReferralOnboarding({
  onComplete,
}: {
  onComplete: (mode: "existing" | "auto", fieldName?: string, tooltipMessage?: string) => void
}) {
  const [step, setStep] = useState<"choice" | "existing" | "auto">("choice")
  const [customFieldName, setCustomFieldName] = useState("")
  const [tooltipMessage, setTooltipMessage] = useState(
    "Please let us know how you found out about us, we would love to know!",
  )

  return (
    <div className="flex-1 p-4 sm:p-8 flex items-center justify-center">
      <Card className="max-w-2xl w-full animate-fade-in">
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
                  onClick={() => setStep("auto")}
                  className="p-5 rounded-xl border-2 border-primary/40 bg-pastel-lavender/20 hover:border-primary hover:bg-pastel-lavender/30 transition-all text-left group relative overflow-hidden"
                >
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    Recommended
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-pastel-lavender flex items-center justify-center shrink-0">
                      <SparklesIcon className="h-6 w-6 text-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg text-card-foreground group-hover:text-primary transition-colors">
                        Set it up for me!
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        We'll add a "How did you hear about us?" field to your checkout form automatically
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-2 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        Tracking begins from when the field is added - future orders only
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

          {step === "auto" && (
            <>
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

                <div className="space-y-2">
                  <Label htmlFor="tooltipMessage">Tooltip Message</Label>
                  <Textarea
                    id="tooltipMessage"
                    placeholder="Please let us know how you found out about us..."
                    value={tooltipMessage}
                    onChange={(e) => setTooltipMessage(e.target.value)}
                    className="text-sm resize-none"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    This message appears when customers hover the (?) icon next to the dropdown
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> Referral tracking will only capture data from orders placed after the field
                    is added. Historical orders won't have this data.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("choice")} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => onComplete("auto", "ReferralHow", tooltipMessage)} className="flex-1">
                  Set Up Field
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

  const [pageSize, setPageSize] = useState(settings?.pageSize?.toString() || "50")
  const [sleepDelay, setSleepDelay] = useState(settings?.sleepDelay?.toString() || "500")
  const [fieldName, setFieldName] = useState(settings?.referralFieldName || "ReferralHow")

  // Check if onboarding is needed
  useEffect(() => {
    if (settings && !settings.hasCompletedReferralOnboarding) {
      setShowOnboarding(true)
    }
  }, [settings])

  const handleOnboardingComplete = (mode: "existing" | "auto", customFieldName?: string, tooltipMessage?: string) => {
    const name = customFieldName || "ReferralHow"
    setFieldName(name)
    updateSettings({
      referralFieldName: name,
      hasCompletedReferralOnboarding: true,
      referralSetupMode: mode,
      ...(tooltipMessage && { referralTooltipMessage: tooltipMessage }),
    })
    setShowOnboarding(false)
  }

  const fetchReferralData = useCallback(async () => {
    setIsLoading(true)
    setProgress(0)
    setError(null)
    setReferralData([])

    try {
      const orders = await getAllPaginated<Order>("orders", {
        pageSize: Number.parseInt(pageSize),
        sleepDelay: Number.parseInt(sleepDelay),
        onProgress: (fetched, total) => {
          if (total) {
            setProgress((fetched / total) * 100)
            setProgressText(`Fetched ${fetched} of ${total} orders...`)
          } else {
            setProgressText(`Fetched ${fetched} orders...`)
          }
        },
      })

      setTotalOrders(orders.length)

      // Aggregate referral sources
      const sourceCounts: Record<string, number> = {}
      let withReferral = 0

      for (const order of orders) {
        const referralSource = findReferralField(order, fieldName)
        if (referralSource) {
          withReferral++
          const normalizedSource = referralSource.trim()
          sourceCounts[normalizedSource] = (sourceCounts[normalizedSource] || 0) + 1
        }
      }

      setOrdersWithReferral(withReferral)

      // Convert to array and calculate percentages
      const data: ReferralData[] = Object.entries(sourceCounts)
        .map(([source, count]) => ({
          source,
          count,
          percentage: withReferral > 0 ? (count / withReferral) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)

      setReferralData(data)
      setProgressText("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data")
    } finally {
      setIsLoading(false)
    }
  }, [pageSize, sleepDelay, fieldName])

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
    updateSettings({ referralFieldName: value })
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
                <Select value={pageSize} onValueChange={(v) => handleSettingsChange("pageSize", v)}>
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
                <Select value={sleepDelay} onValueChange={(v) => handleSettingsChange("sleepDelay", v)}>
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

              <Button onClick={fetchReferralData} disabled={isLoading} className="min-w-40">
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
        {referralData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
            <Card className="bg-pastel-lavender/20">
              <CardContent className="pt-6">
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
              <CardContent className="pt-6">
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
              <CardContent className="pt-6">
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
                        label={({ source, percentage }) =>
                          percentage > 5 ? `${source}: ${percentage.toFixed(0)}%` : ""
                        }
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
        {!isLoading && referralData.length === 0 && !error && (
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
              <Button onClick={fetchReferralData}>
                <RefreshIcon className="h-4 w-4 mr-2" />
                Start Analysis
              </Button>
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
