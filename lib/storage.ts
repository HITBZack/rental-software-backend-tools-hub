// Local storage manager for Booqable Helper Platform
// Handles all persistent settings client-side only

export interface PlatformSettings {
  apiKey: string
  pageSize: number
  sleepDelay: number
  hasCompletedOnboarding: boolean
  referralFieldName: string
  hasCompletedReferralOnboarding: boolean
  referralTooltipMessage: string
  referralSetupMode: "existing" | "auto" | null
  customStopwords: string | null
  hasAcceptedLocalStorage: boolean
}

const STORAGE_KEY = "booqable-helper-settings"

const defaultSettings: PlatformSettings = {
  apiKey: "",
  pageSize: 50,
  sleepDelay: 500,
  hasCompletedOnboarding: false,
  referralFieldName: "ReferralHow",
  hasCompletedReferralOnboarding: false,
  referralTooltipMessage: "Please let us know how you found out about us, we would love to know!",
  referralSetupMode: null,
  customStopwords: null,
  hasAcceptedLocalStorage: false,
}

export function getSettings(): PlatformSettings {
  if (typeof window === "undefined") return defaultSettings

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return defaultSettings
    return { ...defaultSettings, ...JSON.parse(stored) }
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings: Partial<PlatformSettings>): PlatformSettings {
  const current = getSettings()
  const updated = { ...current, ...settings }

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  return updated
}

export function clearSettings(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY)
  }
}
