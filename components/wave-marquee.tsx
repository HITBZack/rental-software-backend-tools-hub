"use client"

import { useEffect, useRef, useState } from "react"

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
  const animationRef = useRef<number>()

  const separator = "   •   "
  const repeatedText = `${text}${separator}`.repeat(16)

  const instanceId = useRef(`wave-${Math.random().toString(36).substr(2, 9)}`).current
  const textPathId = `textPath-${instanceId}`

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
    <div className="w-full relative" style={{ height: "120px", marginTop: "-20px" }}>
      <svg className="w-full h-full" viewBox="0 0 1600 120" preserveAspectRatio="none" style={{ overflow: "visible" }}>
        <defs>
          <path
            id={textPathId}
            d="
              M-1600 68
              C-1400 38, -1200 98, -1000 68
              C-800 38, -600 98, -400 68
              C-200 38, 0 98, 200 68
              C400 38, 600 98, 800 68
              C1000 38, 1200 98, 1400 68
              C1600 38, 1800 98, 2000 68
              C2200 38, 2400 98, 2600 68
              C2800 38, 3000 98, 3200 68
            "
            fill="none"
          />
        </defs>

        <path
          d="
            M0 30
            C100 5, 200 55, 400 25
            C600 -5, 800 45, 1000 20
            C1200 -5, 1400 40, 1600 15
            L1600 90
            C1400 115, 1200 65, 1000 95
            C800 125, 600 75, 400 100
            C200 130, 100 80, 0 105
            Z
          "
          fill={colors.fill}
        />

        <text
          fill={colors.text}
          fontSize="48"
          fontWeight="500"
          letterSpacing="0.08em"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontStyle="italic"
        >
          <textPath href={`#${textPathId}`} startOffset={`${offset}%`}>
            {repeatedText}
          </textPath>
        </text>

        <path
          d="
            M0 30
            C100 5, 200 55, 400 25
            C600 -5, 800 45, 1000 20
            C1200 -5, 1400 40, 1600 15
          "
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          opacity="0.5"
        />
      </svg>
    </div>
  )
}
