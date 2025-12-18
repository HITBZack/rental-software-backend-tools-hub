import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { LocalStorageBanner } from "@/components/local-storage-banner"
import { getSiteName, getSiteUrl } from "@/lib/site"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

const siteUrl = getSiteUrl()
const siteName = getSiteName()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: "Booqable tools and extensions to help rental businesses improve marketing insights, site search, and operations.",
  applicationName: siteName,
  alternates: {
    canonical: "/",
  },
  keywords: [
    "booqable tools",
    "booqable extensions",
    "booqable helper",
    "booqable referral insights",
    "booqable product search",
    "booqable wordpress plugin",
  ],
  openGraph: {
    title: siteName,
    description: "Booqable tools and extensions to help rental businesses improve marketing insights, site search, and operations.",
    url: siteUrl,
    siteName,
    type: "website",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: siteName,
    description: "Booqable tools and extensions to help rental businesses improve marketing insights, site search, and operations.",
    images: ["/icon.png"],
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#d4bde8",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: siteName,
        url: siteUrl,
        logo: `${siteUrl}/icon.png`,
      },
      {
        "@type": "WebSite",
        name: siteName,
        url: siteUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/tools?query={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  }

  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        {children}
        <LocalStorageBanner />
      </body>
    </html>
  )
}
