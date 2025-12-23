export type OrderPickingCustomItemRule = {
  id: string
  enabled: boolean
  matchText: string
  addItemName: string
  addQuantity: number
}

const STORAGE_KEY = "orderPickingCustomItemRules:v1"

const defaultRules: OrderPickingCustomItemRule[] = [
  {
    id: "preset:sandbags-for-arch",
    enabled: false,
    matchText: "arch",
    addItemName: "Sandbags",
    addQuantity: 2,
  },
]

function safeParseRules(raw: string | null): OrderPickingCustomItemRule[] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null

    const rules: OrderPickingCustomItemRule[] = []
    for (const r of parsed) {
      if (!r || typeof r !== "object") continue
      const obj = r as Record<string, unknown>
      const id = typeof obj.id === "string" ? obj.id : null
      const enabled = typeof obj.enabled === "boolean" ? obj.enabled : null
      const matchText = typeof obj.matchText === "string" ? obj.matchText : null
      const addItemName = typeof obj.addItemName === "string" ? obj.addItemName : null
      const addQuantity = typeof obj.addQuantity === "number" && Number.isFinite(obj.addQuantity) ? obj.addQuantity : null

      if (!id || enabled === null || !matchText || !addItemName || addQuantity === null) continue
      if (addQuantity <= 0) continue

      rules.push({ id, enabled, matchText, addItemName, addQuantity })
    }

    return rules
  } catch {
    return null
  }
}

export function getOrderPickingCustomItemRules(): OrderPickingCustomItemRule[] {
  if (typeof window === "undefined") return defaultRules

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === null) return defaultRules

    const parsed = safeParseRules(stored)
    if (!parsed) return defaultRules

    return parsed
  } catch {
    return defaultRules
  }
}

export function saveOrderPickingCustomItemRules(rules: OrderPickingCustomItemRule[]): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
  } catch {
    // ignore
  }
}

export function normalizeRuleInput(rule: OrderPickingCustomItemRule): OrderPickingCustomItemRule {
  const matchText = rule.matchText.trim()
  const addItemName = rule.addItemName.trim()
  const addQuantity = Number.isFinite(rule.addQuantity) && rule.addQuantity > 0 ? Math.floor(rule.addQuantity) : 1

  return {
    ...rule,
    matchText,
    addItemName,
    addQuantity,
  }
}

export function orderMatchesRule(itemNames: string[], rule: OrderPickingCustomItemRule): boolean {
  if (!rule.enabled) return false

  const needle = rule.matchText.trim().toLowerCase()
  if (!needle) return false

  for (const name of itemNames) {
    if (name.toLowerCase().includes(needle)) return true
  }
  return false
}
