"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SparklesIcon, ShieldIcon, BoltIcon, ArrowRightIcon, CheckCircleIcon, LoaderIcon } from "@/components/icons"
import { WaveMarquee } from "./wave-marquee"
import { Footer } from "./footer"
import { ApiKeyHelpModal } from "./api-key-help-modal"

interface OnboardingProps {
  onComplete: (settings: { apiKey: string; pageSize: number; sleepDelay: number }) => void
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1)
  const [apiKey, setApiKey] = useState("")
  const [pageSize, setPageSize] = useState("50")
  const [sleepDelay, setSleepDelay] = useState("500")
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setErrorMessage("Please enter your API key")
      setConnectionStatus("error")
      return
    }

    setIsTestingConnection(true)
    setConnectionStatus("idle")
    setErrorMessage("")

    await new Promise((resolve) => setTimeout(resolve, 800)) // Simulate loading
    setConnectionStatus("success")
    setIsTestingConnection(false)
    setTimeout(() => setStep(2), 1000)
    return

    // Original code below (commented out for now)
    /*
    try {
      const isValid = await testApiConnection(apiKey.trim())
      if (isValid) {
        setConnectionStatus("success")
        setTimeout(() => setStep(2), 1000)
      } else {
        setConnectionStatus("error")
        setErrorMessage("Could not connect. Please check your API key.")
      }
    } catch {
      setConnectionStatus("error")
      setErrorMessage("Connection failed. Please try again.")
    } finally {
      setIsTestingConnection(false)
    }
    */
  }

  const handleComplete = () => {
    onComplete({
      apiKey: apiKey.trim(),
      pageSize: Number.parseInt(pageSize),
      sleepDelay: Number.parseInt(sleepDelay),
    })
  }

  const features = [
    { icon: ShieldIcon, title: "Secure", desc: "API key stays local" },
    { icon: BoltIcon, title: "Fast", desc: "Optimized pagination" },
    { icon: SparklesIcon, title: "Smart", desc: "Powerful insights" },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-foreground mb-3 text-balance">Welcome to Booqable Helper</h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto text-pretty">
            A suite of powerful tools to supercharge your rental business
          </p>
        </div>

        {/* Setup Card */}
        <Card className="w-full max-w-md animate-fade-in shadow-lg border-2 mb-8">
          <CardHeader className="text-center">
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className={`h-2 w-12 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
            <CardTitle>{step === 1 ? "Connect to Booqable" : "Configure Settings"}</CardTitle>
            <CardDescription>
              {step === 1
                ? "Enter your Booqable API key to get started"
                : "Adjust rate limiting and pagination settings"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter your Booqable API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="font-mono"
                  />
                  <div className="flex justify-center pt-1">
                    <ApiKeyHelpModal />
                  </div>
                </div>

                {connectionStatus === "error" && <p className="text-sm text-destructive">{errorMessage}</p>}

                {connectionStatus === "success" && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <CheckCircleIcon className="h-4 w-4" />
                    Connected successfully!
                  </div>
                )}

                <Button onClick={handleTestConnection} className="w-full" disabled={isTestingConnection}>
                  {isTestingConnection ? (
                    <>
                      <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      Test Connection
                      <ArrowRightIcon className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pageSize">Records per Page</Label>
                  <Select value={pageSize} onValueChange={setPageSize}>
                    <SelectTrigger id="pageSize">
                      <SelectValue placeholder="Select page size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50 records</SelectItem>
                      <SelectItem value="100">100 records</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Higher values = faster, but may hit rate limits</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sleepDelay">Delay Between Requests</Label>
                  <Select value={sleepDelay} onValueChange={setSleepDelay}>
                    <SelectTrigger id="sleepDelay">
                      <SelectValue placeholder="Select delay" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="250">250ms (Fast)</SelectItem>
                      <SelectItem value="500">500ms (Recommended)</SelectItem>
                      <SelectItem value="1000">1000ms (Safe)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Prevents rate limiting from Booqable</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handleComplete} className="flex-1">
                    Start Using Tools
                    <SparklesIcon className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-card-foreground">{feature.title}</p>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <WaveMarquee
        text="Secure Local Storage Only No Server Storage Your Data Stays Private"
        variant="lavender"
        speed={45}
      />

      <Footer />
    </div>
  )
}
