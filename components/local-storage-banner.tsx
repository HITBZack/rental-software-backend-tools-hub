"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { CookieIcon, ShieldIcon, XIcon } from "@/components/icons"
import { getSettings, saveSettings } from "@/lib/storage"

export function LocalStorageBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const settings = getSettings()
    if (!settings.hasAcceptedLocalStorage) {
      setIsVisible(true)
    }
  }, [])

  const handleAccept = () => {
    saveSettings({ hasAcceptedLocalStorage: true })
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-pastel-lavender/30 flex items-center justify-center flex-shrink-0">
              <CookieIcon className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-card-foreground">We Store Data Locally</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This app stores your settings and preferences in your browser's local storage.
                <span className="font-medium text-foreground"> Your data never leaves your device</span> and is never
                sent to external servers.
              </p>

              {isExpanded && (
                <div className="mt-4 p-4 rounded-lg bg-pastel-mint/20 border border-pastel-mint/30 space-y-3">
                  <div className="flex items-start gap-2">
                    <ShieldIcon className="h-4 w-4 text-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">What we store:</p>
                      <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                        <li>• Your Booqable API key (encrypted in your browser)</li>
                        <li>• Tool preferences and settings</li>
                        <li>• Custom stopwords for search tag generation</li>
                        <li>• Onboarding progress</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldIcon className="h-4 w-4 text-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Your privacy:</p>
                      <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                        <li>• All data stays in your browser's localStorage</li>
                        <li>• No tracking cookies or analytics</li>
                        <li>• No data sent to our servers</li>
                        <li>• Clear anytime from Settings or browser</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Button onClick={handleAccept} size="sm">
                  Got it, continue
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-muted-foreground"
                >
                  {isExpanded ? "Show less" : "Learn more"}
                </Button>
              </div>
            </div>
            <button
              onClick={handleAccept}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label="Dismiss"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
