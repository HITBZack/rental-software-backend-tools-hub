export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL
  if (!raw) return ensureAbsoluteUrl("http://localhost:3000")
  return ensureAbsoluteUrl(raw)
}

export function ensureAbsoluteUrl(raw: string): string {
  return raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`
}

export function getSiteName(): string {
  return "Backend Rental Tools Hub"
}
