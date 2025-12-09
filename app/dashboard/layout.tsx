"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSettings } from "@/lib/use-settings"
import { Sidebar } from "@/components/sidebar"
import { Loader2 } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { settings, isLoading } = useSettings()

  useEffect(() => {
    if (!isLoading && !settings?.hasCompletedOnboarding) {
      router.push("/")
    }
  }, [isLoading, settings, router])

  if (isLoading || !settings?.hasCompletedOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
