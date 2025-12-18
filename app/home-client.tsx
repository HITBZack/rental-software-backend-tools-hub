"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { LoaderIcon } from "@/components/icons"
import { Onboarding } from "@/components/onboarding"
import { useSettings } from "@/lib/use-settings"

export default function HomeClient() {
  const router = useRouter()
  const { settings, isLoading, updateSettings } = useSettings()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (!isLoading && settings?.hasCompletedOnboarding) {
      setIsRedirecting(true)
      router.push("/dashboard")
    }
  }, [isLoading, settings, router])

  const handleOnboardingComplete = (newSettings: {
    apiKey: string
    businessSlug: string
    pageSize: number
    sleepDelay: number
  }) => {
    setIsRedirecting(true)
    updateSettings({
      ...newSettings,
      hasCompletedOnboarding: true,
    })
    router.push("/dashboard")
  }

  if (isLoading || isRedirecting || settings?.hasCompletedOnboarding) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return <Onboarding onComplete={handleOnboardingComplete} embedded showMarquee={false} showFooter={false} />
}
