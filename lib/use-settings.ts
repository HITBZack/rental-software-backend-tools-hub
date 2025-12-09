"use client"

import { useState, useEffect, useCallback } from "react"
import { getSettings, saveSettings, type PlatformSettings } from "./storage"

export function useSettings() {
  const [settings, setSettingsState] = useState<PlatformSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setSettingsState(getSettings())
    setIsLoading(false)
  }, [])

  const updateSettings = useCallback((updates: Partial<PlatformSettings>) => {
    const updated = saveSettings(updates)
    setSettingsState(updated)
    return updated
  }, [])

  return {
    settings,
    isLoading,
    updateSettings,
  }
}
