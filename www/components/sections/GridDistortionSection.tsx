"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"

const GridDistortion = dynamic(() => import("@/components/GridDistortion"), {
  ssr: false,
})

const TEXT = "LinClaw"
const BG_COLOR = "#0a0a0f"
const TEXT_COLOR = "#ffffff"
const FALLBACK_WIDTH = 1200
const FALLBACK_HEIGHT = 320
const HEIGHT_FONT_RATIO = 0.72
const HORIZONTAL_PADDING_RATIO = 0.06
const VERTICAL_PADDING_RATIO = 0.12

function createTextTexture(width: number, height: number) {
  const dpr = Math.max(1, window.devicePixelRatio || 1)
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(width * dpr))
  canvas.height = Math.max(1, Math.round(height * dpr))

  const ctx = canvas.getContext("2d")
  if (!ctx) return ""

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, width, height)

  const cssFontFamily = getComputedStyle(document.body)
    .getPropertyValue("--font-poppins")
    .trim()
  const fontFamily = cssFontFamily
    ? `${cssFontFamily}, sans-serif`
    : "sans-serif"

  const horizontalPadding = width * HORIZONTAL_PADDING_RATIO
  const verticalPadding = height * VERTICAL_PADDING_RATIO
  const maxTextWidth = Math.max(1, width - horizontalPadding * 2)
  const maxTextHeight = Math.max(1, height - verticalPadding * 2)

  const baseSize = Math.min(height * HEIGHT_FONT_RATIO, maxTextHeight)
  ctx.font = `700 ${baseSize}px ${fontFamily}`

  const measured = ctx.measureText(TEXT)
  const widthScale =
    measured.width > maxTextWidth ? maxTextWidth / measured.width : 1
  const fontSize = Math.max(12, baseSize * widthScale)

  ctx.font = `700 ${fontSize}px ${fontFamily}`
  const finalMetrics = ctx.measureText(TEXT)
  const ascent = finalMetrics.actualBoundingBoxAscent || fontSize * 0.75
  const descent = finalMetrics.actualBoundingBoxDescent || fontSize * 0.25
  const textY = (height + ascent - descent) / 2

  ctx.fillStyle = TEXT_COLOR
  ctx.textAlign = "center"
  ctx.textBaseline = "alphabetic"
  ctx.fillText(TEXT, width / 2, textY)

  return canvas.toDataURL("image/png")
}

export default function GridDistortionSection() {
  const [imageSrc, setImageSrc] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let destroyed = false
    let frameId: number | null = null

    const renderTexture = () => {
      const { width, height } = container.getBoundingClientRect()
      const W = Math.round(width) || FALLBACK_WIDTH
      const H = Math.round(height) || FALLBACK_HEIGHT
      const nextImageSrc = createTextTexture(W, H)
      if (!destroyed && nextImageSrc) {
        setImageSrc(nextImageSrc)
      }
    }

    const scheduleRender = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }
      frameId = requestAnimationFrame(renderTexture)
    }

    if (document.fonts?.ready) {
      document.fonts.ready.then(scheduleRender).catch(scheduleRender)
    } else {
      scheduleRender()
    }

    const resizeObserver = new ResizeObserver(scheduleRender)
    resizeObserver.observe(container)

    return () => {
      destroyed = true
      resizeObserver.disconnect()
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }
    }
  }, [])

  return (
    <div ref={containerRef} className="w-full h-[380px] bg-[#0a0a0f]">
      {imageSrc && (
        <GridDistortion
          imageSrc={imageSrc}
          grid={10}
          mouse={0.15}
          strength={0.2}
          relaxation={0.9}
          className="w-full h-full"
        />
      )}
    </div>
  )
}
