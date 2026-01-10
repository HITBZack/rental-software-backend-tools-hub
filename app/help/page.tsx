"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpenIcon, WrenchIcon, MagnifyingGlassIcon, FileTextIcon } from "@/components/icons"
import Link from "next/link"

export default function HelpPage() {
  const helpArticles = [
    {
      id: "product-search-bar-manual-setup",
      title: "Product Search Bar - Manual Setup",
      description: "Learn how to manually install the custom product search bar without using the WordPress plugin. Includes JavaScript setup, CSS styling, and HTML implementation.",
      icon: WrenchIcon,
      category: "Setup Guide",
      path: "/help/product-search-bar/manual-setup",
      featured: true,
    },
    {
      id: "product-search-bar-overview",
      title: "Product Search Bar - Overview",
      description: "Understanding the custom product search bar feature and its benefits for your rental website.",
      icon: MagnifyingGlassIcon,
      category: "Features",
      path: "/help/product-search-bar",
      featured: false,
    },
    {
      id: "order-picking-helper",
      title: "Order Picking Helper Guide",
      description: "Complete guide to using the order picking helper for efficient order processing and fulfillment.",
      icon: BookOpenIcon,
      category: "Tools",
      path: "/help/order-picking-helper",
      featured: false,
    },
    {
      id: "api-integration",
      title: "API Integration Guide",
      description: "How to connect your Booqable account and integrate with our tools using the API.",
      icon: FileTextIcon,
      category: "Technical",
      path: "/help/api-integration",
      featured: false,
    },
  ]

  const featuredArticle = helpArticles.find(article => article.featured)
  const regularArticles = helpArticles.filter(article => !article.featured)

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-card px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-pastel-mint flex items-center justify-center">
            <BookOpenIcon className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Help Center</h1>
            <p className="text-muted-foreground">
              Find guides, tutorials, and documentation for all our tools and features
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Featured Article */}
          {featuredArticle && (
            <Card className="border-pastel-mint/50 bg-pastel-mint/10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <featuredArticle.icon className="h-5 w-5 text-foreground" />
                  <span className="text-sm font-medium text-pastel-mint-foreground">Featured Guide</span>
                </div>
                <CardTitle className="text-xl">{featuredArticle.title}</CardTitle>
                <CardDescription className="text-base">
                  {featuredArticle.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={featuredArticle.path}>
                  <Button className="w-full sm:w-auto">
                    Read Full Guide
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Other Articles */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">All Articles</h2>
            <div className="grid gap-4">
              {regularArticles.map((article) => (
                <Card key={article.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <article.icon className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">{article.title}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {article.description}
                        </CardDescription>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-muted rounded-full">
                            {article.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Link href={article.path}>
                      <Button variant="outline" size="sm">
                        Read More
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Getting Started Section */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-lg">Need Help Getting Started?</CardTitle>
              <CardDescription>
                If you're new to our tools, we recommend starting with the featured guide above or contacting our support team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-lg bg-background border">
                  <h3 className="font-medium text-sm mb-2">📚 Documentation</h3>
                  <p className="text-xs text-muted-foreground">
                    Browse our comprehensive guides and tutorials for step-by-step instructions.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-background border">
                  <h3 className="font-medium text-sm mb-2">💬 Community Support</h3>
                  <p className="text-xs text-muted-foreground">
                    Join our community to ask questions and share tips with other users.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
