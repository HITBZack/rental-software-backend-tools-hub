export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL
  if (!raw) return "http://localhost:3000"
  return raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`
}

export function getSiteName(): string {
  return "Booqable Helper Platform"
}
