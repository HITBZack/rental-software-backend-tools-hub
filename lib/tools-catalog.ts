export type ToolSlug = "referral-insights" | "product-search-bar" | "order-picking" | "deliveries-manager" | "wordpress-plugin" | "rental-reminders"

export interface ToolDefinition {
  slug: ToolSlug
  name: string
  tagline: string
  description: string
  keywords: string[]
  dashboardPath: string
  externalUrl?: string
}

export const toolsCatalog: ToolDefinition[] = [
  {
    slug: "referral-insights",
    name: "Referral Insights",
    tagline: "Understand where your Booqable customers come from.",
    description:
      "Referral Insights is a Booqable tool that aggregates referral source data across your orders, helping rental businesses measure marketing performance and track customer acquisition channels.",
    keywords: [
      "booqable tools",
      "booqable extensions",
      "booqable referral tracking",
      "booqable analytics",
      "rental business analytics",
      "referral source reporting",
    ],
    dashboardPath: "/dashboard/referral-insights",
  },
  {
    slug: "product-search-bar",
    name: "Product Search Bar Generator",
    tagline: "Generate an inventory-wide fuzzy search bar for your Booqable website.",
    description:
      "Product Search Bar Generator is a Booqable extension-style tool that fetches your product catalog and generates searchable JSON with smart tags, enabling fast fuzzy search beyond Booqable's default search behavior.",
    keywords: [
      "booqable tools",
      "booqable extensions",
      "booqable search bar",
      "booqable product search",
      "inventory wide search",
      "fuzzy search",
    ],
    dashboardPath: "/dashboard/product-search-bar",
  },
  {
    slug: "order-picking",
    name: "Order Picking Helper",
    tagline: "Pick and pack faster with date-range order item summaries.",
    description:
      "Order Picking Helper is a Booqable tool for rental operations that organizes upcoming orders, combines quantities, and helps teams pick outgoing deliveries efficiently.",
    keywords: [
      "booqable tools",
      "booqable extensions",
      "booqable order picking",
      "rental order picking",
      "warehouse picking list",
      "delivery preparation",
    ],
    dashboardPath: "/dashboard/order-picking",
  },
  {
    slug: "deliveries-manager",
    name: "Deliveries Manager",
    tagline: "Manage upcoming orders and assign delivery drivers.",
    description:
      "Deliveries Manager is a Booqable tool for rental operations that lists upcoming orders with customer contact information, delivery notes, and allows you to assign and manage delivery drivers for each order.",
    keywords: [
      "booqable tools",
      "booqable extensions",
      "booqable deliveries",
      "delivery management",
      "driver assignment",
      "order management",
      "delivery tracking",
    ],
    dashboardPath: "/dashboard/deliveries-manager",
  },
  {
    slug: "wordpress-plugin",
    name: "WordPress Plugin",
    tagline: "Customize Booqable UI elements on WordPress.",
    description:
      "WordPress Plugin is a Booqable extension concept for WordPress sites, designed to customize product displays, cart popups, and image lightboxes to better match your brand.",
    keywords: [
      "booqable tools",
      "booqable extensions",
      "booqable wordpress plugin",
      "booqable website customization",
      "booqable cart popup",
      "booqable product display",
    ],
    dashboardPath: "/dashboard/wordpress-plugin",
  },
  {
    slug: "rental-reminders",
    name: "Rental Reminders",
    tagline: "Automated email and SMS reminders for Booqable orders.",
    description:
      "Rental Reminders helps Booqable rental businesses send delivery notifications, confirmations, payment reminders, and scheduled messages like 2-days-prior or week-before updates via email and SMS.",
    keywords: [
      "booqable tools",
      "booqable extensions",
      "booqable rental reminders",
      "booqable automated emails",
      "booqable sms",
      "delivery notifications",
      "payment reminders",
    ],
    dashboardPath: "/dashboard",
    externalUrl: "https://rentalreminder.com",
  },
]

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return toolsCatalog.find((t) => t.slug === slug)
}
