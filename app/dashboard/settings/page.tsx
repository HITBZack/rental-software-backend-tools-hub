"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSettings } from "@/lib/use-settings"
import { clearSettings } from "@/lib/storage"
import { normalizeApiKey, testApiConnection } from "@/lib/api"
import { useRouter } from "next/navigation"
import {
  GearIcon,
  KeyIcon,
  GaugeIcon,
  TrashIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  LoaderIcon,
  RefreshIcon,
} from "@/components/icons"

export default function SettingsPage() {
  const router = useRouter()
  const { settings, updateSettings } = useSettings()
  const [newApiKey, setNewApiKey] = useState("")
  const [newBusinessSlug, setNewBusinessSlug] = useState("")
  const [isTestingKey, setIsTestingKey] = useState(false)
  const [keyStatus, setKeyStatus] = useState<"idle" | "success" | "error">("idle")
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const normalizeSlug = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "-")
  const isValidSlug = (value: string) => /^[a-z0-9-]+$/.test(value)

  const handleUpdateApiKey = async () => {
    if (!newApiKey.trim()) return

    const cleanApiKey = normalizeApiKey(newApiKey)

    setIsTestingKey(true)
    setKeyStatus("idle")

    try {
      const isValid = await testApiConnection(cleanApiKey, settings.businessSlug)
      if (isValid) {
        updateSettings({ apiKey: cleanApiKey })
        setKeyStatus("success")
        setNewApiKey("")
        setTimeout(() => setKeyStatus("idle"), 3000)
      } else {
        setKeyStatus("error")
      }
    } catch {
      setKeyStatus("error")
    } finally {
      setIsTestingKey(false)
    }
  }

  const handleResetAll = () => {
    clearSettings()
    router.push("/")
  }

  if (!settings) return null

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-card px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-pastel-blue flex items-center justify-center">
            <GearIcon className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Settings</h1>
            <p className="text-muted-foreground">Manage your platform configuration</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 space-y-6 max-w-2xl">
        {/* API Key */}
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-pastel-lavender flex items-center justify-center">
                <KeyIcon className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <CardTitle>API Key</CardTitle>
                <CardDescription>Your Booqable API key (stored locally)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <CheckCircleIcon className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Business slug: {settings.businessSlug || "Not set"}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessSlug">Update Business Slug</Label>
              <div className="flex gap-2">
                <Input
                  id="businessSlug"
                  placeholder="your-company"
                  value={newBusinessSlug}
                  onChange={(e) => setNewBusinessSlug(e.target.value)}
                  className="font-mono"
                />
                <Button
                  onClick={() => {
                    const normalized = normalizeSlug(newBusinessSlug)
                    if (!normalized) return
                    if (!isValidSlug(normalized)) return
                    updateSettings({ businessSlug: normalized })
                    setNewBusinessSlug("")
                  }}
                  disabled={!newBusinessSlug.trim()}
                >
                  Save
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <CheckCircleIcon className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                API key configured: {settings.apiKey.slice(0, 8)}...{settings.apiKey.slice(-4)}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newApiKey">Update API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="newApiKey"
                  type="password"
                  placeholder="Enter new API key"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  className="font-mono"
                />
                <Button onClick={handleUpdateApiKey} disabled={isTestingKey || !newApiKey.trim()}>
                  {isTestingKey ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <RefreshIcon className="h-4 w-4" />}
                </Button>
              </div>

              {keyStatus === "success" && (
                <p className="text-sm text-primary flex items-center gap-1">
                  <CheckCircleIcon className="h-4 w-4" />
                  API key updated successfully
                </p>
              )}
              {keyStatus === "error" && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircleIcon className="h-4 w-4" />
                  Invalid API key
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rate Limiting */}
        <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-pastel-mint flex items-center justify-center">
                <GaugeIcon className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <CardTitle>Rate Limiting</CardTitle>
                <CardDescription>Control API request speed and pagination</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pageSize">Records per Page</Label>
                <Select
                  value={settings.pageSize.toString()}
                  onValueChange={(v) => updateSettings({ pageSize: Number.parseInt(v) })}
                >
                  <SelectTrigger id="pageSize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 records</SelectItem>
                    <SelectItem value="100">100 records</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sleepDelay">Request Delay</Label>
                <Select
                  value={settings.sleepDelay.toString()}
                  onValueChange={(v) => updateSettings({ sleepDelay: Number.parseInt(v) })}
                >
                  <SelectTrigger id="sleepDelay">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="250">250ms (Fast)</SelectItem>
                    <SelectItem value="500">500ms (Recommended)</SelectItem>
                    <SelectItem value="1000">1000ms (Safe)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Higher page sizes fetch more data per request but may hit rate limits. Longer delays are safer but slower.
            </p>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <TrashIcon className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!showResetConfirm ? (
              <Button variant="destructive" onClick={() => setShowResetConfirm(true)}>
                <TrashIcon className="h-4 w-4 mr-2" />
                Reset All Settings
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-destructive">
                  This will delete your API key and all settings. Are you sure?
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleResetAll}>
                    Yes, Reset Everything
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
