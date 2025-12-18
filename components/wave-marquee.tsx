"use client"

import { useEffect, useId, useRef, useState } from "react"

interface WaveMarqueeProps {
  text: string
  variant?: "lavender" | "mint" | "peach" | "pink" | "blue"
  speed?: number
}

const colorMap = {
  lavender: {
    fill: "oklch(0.88 0.08 280)",
    fillDark: "oklch(0.82 0.1 280)",
    text: "oklch(0.25 0.05 280)",
  },
  mint: {
    fill: "oklch(0.88 0.08 160)",
    fillDark: "oklch(0.82 0.1 160)",
    text: "oklch(0.25 0.05 160)",
  },
  peach: {
    fill: "oklch(0.88 0.09 60)",
    fillDark: "oklch(0.82 0.11 60)",
    text: "oklch(0.25 0.05 40)",
  },
  pink: {
    fill: "oklch(0.88 0.08 350)",
    fillDark: "oklch(0.82 0.1 350)",
    text: "oklch(0.25 0.05 350)",
  },
  blue: {
    fill: "oklch(0.88 0.08 230)",
    fillDark: "oklch(0.82 0.1 230)",
    text: "oklch(0.25 0.05 230)",
  },
}

export function WaveMarquee({ text, variant = "lavender", speed = 45 }: WaveMarqueeProps) {
  const colors = colorMap[variant]
  const [offset, setOffset] = useState(0)
  const animationRef = useRef<number | null>(null)

  const separator = "   •   "
  const repeatedText = `${text}${separator}`.repeat(16)

  const reactId = useId()
  const safeId = reactId.replace(/[^a-zA-Z0-9_-]/g, "")
  const textPathId = `textPath-wave-${safeId || "default"}`

  const textYOffset = 40

  const topWavePath = `
    M0 35
    C112.5 15, 225 55, 450 35
    C562.5 15, 675 55, 900 35
    C1012.5 15, 1125 55, 1350 35
    C1462.5 15, 1575 55, 1800 35
  `

  const fillWavePath = `
    ${topWavePath}
    L1800 95
    C1687.5 115, 1575 75, 1350 95
    C1237.5 115, 1125 75, 900 95
    C787.5 115, 675 75, 450 95
    C337.5 115, 225 75, 0 95
    Z
  `

  useEffect(() => {
    let startTime: number | null = null
    const duration = speed * 1000

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime

      const progress = (elapsed % duration) / duration
      const newOffset = -50 + progress * 50

      setOffset(newOffset)
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [speed])

  return (
    <div className="w-full relative" style={{ height: "132px", marginTop: "-22px" }}>
      <svg className="w-full h-full" viewBox="0 0 1800 120" preserveAspectRatio="none" style={{ overflow: "visible" }}>
        <defs>
          <path
            id={textPathId}
            d={topWavePath}
            transform={`translate(0 ${textYOffset})`}
            fill="none"
          />
        </defs>

        <path
          d={fillWavePath}
          fill={colors.fill}
        />

        <text
          fill={colors.text}
          fontSize="33"
          fontWeight="500"
          letterSpacing="0.08em"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontStyle="italic"
        >
          <textPath href={`#${textPathId}`} startOffset={`${offset}%`} dy="20">
            {repeatedText}
          </textPath>
        </text>

        <path
          d={topWavePath}
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          opacity="0.5"
        />
      </svg>
    </div>
  )
}
