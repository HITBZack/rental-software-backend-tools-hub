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
  const repeatedText = `${text}${separator}`.repeat(8)

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
    <div className="w-full relative" style={{ height: "160px", marginTop: "-30px" }}>
      <svg className="w-full h-full" viewBox="0 0 1600 160" preserveAspectRatio="none" style={{ overflow: "visible" }}>
        <defs>
          <path
            id={textPathId}
            d="
              M-800 105
              C-600 75, -400 135, -200 105
              C0 75, 200 135, 400 105
              C600 75, 800 135, 1000 105
              C1200 75, 1400 135, 1600 105
              C1800 75, 2000 135, 2200 105
              C2400 75, 2600 135, 2800 105
            "
            fill="none"
          />
        </defs>

        <path
          d="
            M0 50
            C100 20, 200 80, 400 45
            C600 10, 800 70, 1000 40
            C1200 10, 1400 65, 1600 35
            L1600 160
            L0 160
            Z
          "
          fill={colors.fill}
        />

        <text
          fill={colors.text}
          fontSize="28"
          fontWeight="500"
          letterSpacing="0.12em"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontStyle="italic"
        >
          <textPath href={`#${textPathId}`} startOffset={`${offset}%`}>
            {repeatedText}
          </textPath>
        </text>

        <path
          d="
            M0 50
            C100 20, 200 80, 400 45
            C600 10, 800 70, 1000 40
            C1200 10, 1400 65, 1600 35
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
