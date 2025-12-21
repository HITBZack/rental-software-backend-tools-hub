"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WaveMarquee } from "@/components/wave-marquee"
import {
  WordPressIcon,
  DownloadIcon,
  CheckCircleIcon,
  ImageIcon,
  CartIcon,
  PaintIcon,
  CopyIcon,
  ArrowRightIcon,
} from "@/components/icons"

const features = [
  {
    icon: ImageIcon,
    title: "Product Display",
    description: "Customize how products appear on your WordPress site with flexible layout options and styling.",
  },
  {
    icon: CartIcon,
    title: "Add to Cart Popup",
    description: "Style the cart popup modal with your brand colors, fonts, and animations.",
  },
  {
    icon: PaintIcon,
    title: "Image Lightbox",
    description: "Enhance product image galleries with customizable lightbox effects and transitions.",
  },
]

const installSteps = [
  {
    step: 1,
    title: "Download the Plugin",
    description: "Click the download button above to get the latest version of the plugin ZIP file.",
  },
  {
    step: 2,
    title: "Upload to WordPress",
    description: "Go to Plugins → Add New → Upload Plugin in your WordPress admin, then select the ZIP file.",
  },
  {
    step: 3,
    title: "Activate the Plugin",
    description: "After uploading, click 'Activate Plugin' to enable the Backend Rental Tools Hub helper on your site.",
  },
  {
    step: 4,
    title: "Configure Settings",
    description: "Navigate to Settings → Backend Rental Tools Hub to customize your UI elements and styling options.",
  },
]

export default function WordPressPluginPage() {
  const [copied, setCopied] = useState(false)
  const shortcode = "[booqable_products]"

  const handleCopyShortcode = () => {
    navigator.clipboard.writeText(shortcode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    // Placeholder - would trigger actual download
    alert("Plugin download will be available soon!")
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-card px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-pastel-peach flex items-center justify-center">
            <WordPressIcon className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">WordPress Plugin</h1>
            <p className="text-muted-foreground">Customize Booqable UI elements on your WordPress site</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8">
        <div className="max-w-4xl space-y-8">
          {/* Download Section */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-pastel-peach opacity-10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardHeader>
              <CardTitle className="text-xl">Download Backend Rental Tools Hub for WordPress</CardTitle>
              <CardDescription>
                Our WordPress plugin allows you to customize and enhance how Booqable elements appear on your website.
                Take control of product displays, cart popups, lightboxes, and more.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={handleDownload} className="flex-1 sm:flex-none">
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download Plugin (v1.0.0)
                </Button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircleIcon className="h-4 w-4 text-pastel-mint" />
                  Compatible with WordPress 5.0+
                </div>
              </div>

              {/* Shortcode */}
              <div className="pt-4 border-t border-border">
                <Label className="text-sm text-muted-foreground mb-2 block">Quick Shortcode</Label>
                <div className="flex items-center gap-2">
                  <Input value={shortcode} readOnly className="font-mono text-sm bg-muted/50" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyShortcode}
                    className="shrink-0 bg-transparent"
                  >
                    {copied ? (
                      <CheckCircleIcon className="h-4 w-4 text-pastel-mint" />
                    ) : (
                      <CopyIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <div>
            <h2 className="text-lg font-semibold mb-4">What You Can Customize</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {features.map((feature, index) => (
                <Card key={feature.title} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <CardHeader className="pb-2">
                    <div className="h-10 w-10 rounded-lg bg-pastel-lavender/50 flex items-center justify-center mb-2">
                      <feature.icon className="h-5 w-5 text-foreground" />
                    </div>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Installation Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Installation Guide</CardTitle>
              <CardDescription>
                Follow these steps to install and configure the plugin on your WordPress site.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {installSteps.map((item, index) => (
                  <div
                    key={item.step}
                    className="flex gap-4 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="shrink-0 h-8 w-8 rounded-full bg-pastel-mint flex items-center justify-center text-sm font-semibold">
                      {item.step}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <h3 className="font-medium mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Support Section */}
          <Card className="bg-pastel-lavender/20 border-pastel-lavender/30">
            <CardContent className="py-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold mb-1">Need Help?</h3>
                  <p className="text-sm text-muted-foreground">Check out our documentation or reach out for support.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    View Documentation
                    <ArrowRightIcon className="h-3 w-3 ml-1" />
                  </Button>
                  <Button variant="outline" size="sm">
                    Contact Support
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <WaveMarquee
        text="Customize your Booqable elements ▣ Product displays ▣ Cart popups ▣ Image lightboxes ▣ And more"
        variant="lavender"
        speed={45}
      />
    </div>
  )
}
