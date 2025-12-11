"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { WaveMarquee } from "@/components/wave-marquee"
import { RefreshIcon, LoaderIcon, CalendarIcon, PackageIcon, FilterIcon } from "@/components/icons"

// Mock data for demonstration - will be replaced with real API data
const mockOrders = [
  {
    id: "1",
    dateRange: "Dec 12, 2025, 04:00 p.m. → Dec 13, 2025, 07:00 p.m.",
    items: [
      {
        id: "1a",
        name: "Metal Folding - Bright White - Fanback",
        quantity: 45,
        image: "/white-folding-chair.jpg",
        picked: false,
      },
      { id: "1b", name: "Table - 5 ft Round - Wood", quantity: 6, image: "/round-wooden-table.jpg", picked: false },
      {
        id: "1c",
        name: "Table - 6' folding - ABS plastic",
        quantity: 3,
        image: "/plastic-folding-table.jpg",
        picked: false,
      },
      {
        id: "1d",
        name: 'Tablecloths - 120" Round (5ft. Round Tables)',
        quantity: 6,
        image: "/white-tablecloth.jpg",
        picked: false,
      },
    ],
  },
  {
    id: "2",
    dateRange: "Dec 12, 2025, 10:00 p.m. → Dec 14, 2025, 05:00 p.m.",
    items: [
      { id: "2a", name: "White Serving Bar", quantity: 3, image: "/white-bar-counter.jpg", picked: false },
      {
        id: "2b",
        name: "Cherry Blossom Tree - White",
        quantity: 2,
        image: "/white-cherry-blossom-tree-decor.jpg",
        picked: false,
      },
      { id: "2c", name: "Plinth White 5 Pc Set", quantity: 1, image: "/white-display-plinth-set.jpg", picked: false },
      {
        id: "2d",
        name: "Round Cylinder Plinth 3PC Set",
        quantity: 1,
        image: "/cylinder-plinth-set.jpg",
        picked: false,
      },
    ],
  },
  {
    id: "3",
    dateRange: "Dec 13, 2025, 03:00 p.m. → Dec 14, 2025, 11:00 p.m.",
    items: [
      {
        id: "3a",
        name: "Emerald Green Velvet Loveseat",
        quantity: 1,
        image: "/green-velvet-loveseat.jpg",
        picked: false,
      },
      { id: "3b", name: "Nutcracker", quantity: 2, image: "/christmas-nutcracker-decoration.jpg", picked: false },
      {
        id: "3c",
        name: "Christmas Presents red wire frame",
        quantity: 2,
        image: "/red-wire-frame-gift-decoration.jpg",
        picked: false,
      },
      { id: "3d", name: "Set of 3 Reindeer", quantity: 1, image: "/reindeer-decoration-set.jpg", picked: false },
      {
        id: "3e",
        name: "Santa Stop Here Lighted Sign",
        quantity: 1,
        image: "/santa-stop-here-sign.jpg",
        picked: false,
      },
      { id: "3f", name: "Candy swirl food stool", quantity: 1, image: "/candy-swirl-stool.jpg", picked: false },
    ],
  },
]

interface OrderItem {
  id: string
  name: string
  quantity: number
  image: string
  picked: boolean
}

interface Order {
  id: string
  dateRange: string
  items: OrderItem[]
}

export default function OrderPickingPage() {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const future = new Date()
    future.setDate(future.getDate() + 10)
    return future.toISOString().split("T")[0]
  })
  const [sortByQuantity, setSortByQuantity] = useState(true)
  const [orders, setOrders] = useState<Order[]>(mockOrders)
  const [isLoading, setIsLoading] = useState(false)
  const [lastFetched, setLastFetched] = useState<string | null>(null)
  const [combineAll, setCombineAll] = useState(false)

  const handleRefresh = async () => {
    setIsLoading(true)
    // Simulate API call - will be replaced with real implementation
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setLastFetched(new Date().toLocaleTimeString())
    setIsLoading(false)
  }

  const handleApplyFilter = () => {
    handleRefresh()
  }

  const toggleItemPicked = (orderId: string, itemId: string) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              items: order.items.map((item) => (item.id === itemId ? { ...item, picked: !item.picked } : item)),
            }
          : order,
      ),
    )
  }

  const unpickAll = () => {
    setOrders((prevOrders) =>
      prevOrders.map((order) => ({
        ...order,
        items: order.items.map((item) => ({ ...item, picked: false })),
      })),
    )
  }

  const getCombinedItems = () => {
    const combined: Record<string, OrderItem> = {}
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (combined[item.name]) {
          combined[item.name].quantity += item.quantity
        } else {
          combined[item.name] = { ...item }
        }
      })
    })
    let items = Object.values(combined)
    if (sortByQuantity) {
      items = items.sort((a, b) => b.quantity - a.quantity)
    }
    return items
  }

  const sortedOrders = sortByQuantity
    ? orders.map((order) => ({
        ...order,
        items: [...order.items].sort((a, b) => b.quantity - a.quantity),
      }))
    : orders

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-card px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-pastel-blue flex items-center justify-center">
            <PackageIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Order Picking Helper</h1>
            <p className="text-muted-foreground">Manage and track upcoming orders efficiently</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-6">
        {/* Filter Panel */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FilterIcon className="h-5 w-5" />
              Filter Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-6">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <div className="relative">
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-48"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <div className="relative">
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-48"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pb-2">
                <Switch id="sort-quantity" checked={sortByQuantity} onCheckedChange={setSortByQuantity} />
                <Label htmlFor="sort-quantity" className="cursor-pointer">
                  Sorting by Quantity
                </Label>
              </div>
              <Button onClick={handleApplyFilter} className="bg-pastel-blue hover:bg-pastel-blue/80 text-foreground">
                Apply Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            className="bg-pastel-mint hover:bg-pastel-mint/80 text-foreground"
          >
            {isLoading ? (
              <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshIcon className="h-4 w-4 mr-2" />
            )}
            Refresh Orders
          </Button>
          <Button
            onClick={() => setCombineAll(!combineAll)}
            variant={combineAll ? "default" : "secondary"}
            className={combineAll ? "bg-foreground text-background" : ""}
          >
            {combineAll ? "Show by Date" : "Combine All Days"}
          </Button>
          <Button onClick={unpickAll} variant="secondary">
            Unpick All
          </Button>
          {lastFetched && <span className="text-sm text-muted-foreground">Last fetched: {lastFetched}</span>}
        </div>

        {/* Orders Display */}
        {combineAll ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-pastel-lavender">All Items Combined</CardTitle>
              <CardDescription>{getCombinedItems().length} unique items across all orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getCombinedItems().map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      item.picked
                        ? "bg-pastel-mint/20 border-pastel-mint"
                        : "bg-card border-border hover:border-pastel-lavender/50"
                    }`}
                  >
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover bg-muted"
                    />
                    <Checkbox
                      checked={item.picked}
                      onCheckedChange={() => {
                        // Find and toggle all matching items
                        setOrders((prevOrders) =>
                          prevOrders.map((order) => ({
                            ...order,
                            items: order.items.map((i) => (i.name === item.name ? { ...i, picked: !item.picked } : i)),
                          })),
                        )
                      }}
                    />
                    <span className={`flex-1 ${item.picked ? "line-through text-muted-foreground" : ""}`}>
                      {item.name}
                    </span>
                    <span className="text-lg font-semibold text-muted-foreground">{item.quantity}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium text-pastel-lavender flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {order.dateRange}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${
                        item.picked
                          ? "bg-pastel-mint/20 border-pastel-mint"
                          : "bg-card border-border hover:border-pastel-lavender/50"
                      }`}
                      onClick={() => toggleItemPicked(order.id, item.id)}
                    >
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover bg-muted"
                      />
                      <Checkbox
                        checked={item.picked}
                        onCheckedChange={() => toggleItemPicked(order.id, item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className={`flex-1 text-sm ${item.picked ? "line-through text-muted-foreground" : ""}`}>
                        {item.name}
                      </span>
                      <span className="text-sm font-semibold text-muted-foreground">{item.quantity}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Placeholder for when real API is connected */}
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="py-8 text-center">
            <PackageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              This is currently showing demo data. Once connected to your Booqable API, real orders will appear here
              based on your selected date range.
            </p>
          </CardContent>
        </Card>
      </div>

      <WaveMarquee text="track deliveries • manage inventory • stay organized" variant="blue" speed={30} />
    </div>
  )
}
