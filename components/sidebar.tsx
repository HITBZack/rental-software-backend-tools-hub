"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  LayoutIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  WordPressIcon,
  GearIcon,
  LockIcon,
  ClipboardListIcon,
  TruckIcon,
  SparklesIcon,
} from "@/components/icons"

interface Tool {
  name: string
  href: string
  icon: React.ReactNode
  description: string
  available: boolean
  external?: boolean
}

const tools: Tool[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: <LayoutIcon className="h-5 w-5" />,
    description: "Overview of your tools",
    available: true,
  },
  {
    name: "Referral Insights",
    href: "/dashboard/referral-insights",
    icon: <ChartBarIcon className="h-5 w-5" />,
    description: "Analyze referral sources",
    available: true,
  },
  {
    name: "Order Picking Helper",
    href: "/dashboard/order-picking",
    icon: <ClipboardListIcon className="h-5 w-5" />,
    description: "Track outgoing deliveries",
    available: true,
  },
  {
    name: "Deliveries Manager",
    href: "/dashboard/deliveries-manager",
    icon: <TruckIcon className="h-5 w-5" />,
    description: "Manage orders and assign drivers",
    available: true,
  },
  {
    name: "Product Search Bar",
    href: "/dashboard/product-search-bar",
    icon: <MagnifyingGlassIcon className="h-5 w-5" />,
    description: "Custom fuzzy search for your site",
    available: true,
  },
  {
    name: "Rental Reminders",
    href: "https://rentalreminder.com",
    icon: <SparklesIcon className="h-5 w-5" />,
    description: "Automated email + SMS reminders",
    available: false,
    external: true,
  },
  {
    name: "WordPress Plugin",
    href: "/dashboard/wordpress-plugin",
    icon: <WordPressIcon className="h-5 w-5" />,
    description: "UI customization plugin",
    available: false,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: <GearIcon className="h-5 w-5" />,
    description: "Platform settings",
    available: true,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-sidebar-border bg-sidebar min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl overflow-hidden animate-pulse-glow">
            <Image
              src="/icon.png"
              alt="Booqable Helper"
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground">Booqable</h1>
            <p className="text-xs text-muted-foreground">Helper Platform</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-xs font-medium text-muted-foreground px-3 mb-3 uppercase tracking-wider">Tools</p>
        {tools.map((tool) => {
          const isActive = !tool.external && pathname === tool.href
          const isDisabled = !tool.available

          const content = (
            <>
              <span className={cn("transition-transform duration-200", !isDisabled && "group-hover:scale-110")}>
                {tool.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tool.name}</p>
                <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
              </div>
              {isDisabled && (
                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Soon</span>
              )}
            </>
          )

          const className = cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50",
            isDisabled && "opacity-50 cursor-not-allowed",
          )

          if (tool.external) {
            return (
              <a
                key={tool.href}
                href={isDisabled ? "#" : tool.href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
                onClick={(e) => isDisabled && e.preventDefault()}
              >
                {content}
              </a>
            )
          }

          return (
            <Link key={tool.href} href={isDisabled ? "#" : tool.href} className={className} onClick={(e) => isDisabled && e.preventDefault()}>
              {content}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-pastel-mint/30">
          <LockIcon className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Your API key never leaves your browser</p>
        </div>
      </div>
    </aside>
  )
}
