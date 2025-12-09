"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSettings } from "@/lib/use-settings"
import { Onboarding } from "@/components/onboarding"
import { LoaderIcon } from "@/components/icons"

export default function HomePage() {
  const router = useRouter()
  const { settings, isLoading, updateSettings } = useSettings()

  useEffect(() => {
    if (!isLoading && settings?.hasCompletedOnboarding) {
      router.push("/dashboard")
    }
  }, [isLoading, settings, router])

  const handleOnboardingComplete = (newSettings: {
    apiKey: string
    pageSize: number
    sleepDelay: number
  }) => {
    updateSettings({
      ...newSettings,
      hasCompletedOnboarding: true,
    })
    router.push("/dashboard")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (settings?.hasCompletedOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return <Onboarding onComplete={handleOnboardingComplete} />
}
