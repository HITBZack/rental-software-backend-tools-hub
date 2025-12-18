"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { WaveMarquee } from "@/components/wave-marquee"
import { Footer } from "@/components/footer"
import { ChartBarIcon, MagnifyingGlassIcon, WordPressIcon, ArrowRightIcon, ClipboardListIcon } from "@/components/icons"
import Image from "next/image"
import Link from "next/link"

const tools = [
  {
    name: "Referral Insights",
    description:
      "Analyze where your customers are coming from by aggregating referral source data from all your orders.",
    icon: ChartBarIcon,
    href: "/dashboard/referral-insights",
    available: true,
    color: "bg-pastel-lavender",
  },
  {
    name: "Product Search Bar",
    description:
      "Generate a custom fuzzy search bar for your website with inventory-wide search that goes beyond Booqable's default.",
    icon: MagnifyingGlassIcon,
    href: "/dashboard/product-search-bar",
    available: true,
    color: "bg-pastel-mint",
  },
  {
    name: "Order Picking Helper",
    description:
      "Track which items are going out for delivery within a date range. Combines orders and shows quantities at a glance.",
    icon: ClipboardListIcon,
    href: "/dashboard/order-picking",
    available: true,
    color: "bg-pastel-blue",
  },
  {
    name: "Rental Reminders",
    description:
      "Automated email and SMS reminders for bookings: confirmations, delivery notices, payment reminders, and more.",
    icon: ArrowRightIcon,
    href: "https://rentalreminder.com",
    available: true,
    color: "bg-pastel-mint",
    external: true,
  },
  {
    name: "WordPress Plugin",
    description:
      "Download our WordPress plugin to customize Booqable UI elements like product displays, lightboxes, and cart popups.",
    icon: WordPressIcon,
    href: "/dashboard/wordpress-plugin",
    available: false,
    color: "bg-pastel-peach",
  },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-card px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl overflow-hidden">
            <Image
              src="/icon.png"
              alt="Booqable Helper"
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Choose a tool to get started.</p>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="flex-1 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {tools.map((tool, index) => (
            <Card
              key={tool.name}
              className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg animate-fade-in flex flex-col ${
                !tool.available ? "opacity-60" : ""
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className={`absolute top-0 right-0 w-32 h-32 ${tool.color} opacity-20 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500`}
              />

              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`h-12 w-12 rounded-xl ${tool.color} flex items-center justify-center mb-2`}>
                    <tool.icon className="h-6 w-6 text-foreground" />
                  </div>
                  {!tool.available && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">Coming Soon</span>
                  )}
                </div>
                <CardTitle className="text-xl">{tool.name}</CardTitle>
                <CardDescription className="text-pretty">{tool.description}</CardDescription>
              </CardHeader>

              <CardContent className="mt-auto">
                {tool.available ? (
                  tool.external ? (
                    <a href={tool.href} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full group/btn">
                        Open Tool
                        <ArrowRightIcon className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </a>
                  ) : (
                    <Link href={tool.href}>
                      <Button className="w-full group/btn">
                        Open Tool
                        <ArrowRightIcon className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  )
                ) : (
                  <Button disabled className="w-full">
                    Coming Soon
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <WaveMarquee
        text="more tools coming soon • automated reminders • custom emails • checkout scripts"
        variant="peach"
        speed={30}
      />

      <Footer />
    </div>
  )
}
