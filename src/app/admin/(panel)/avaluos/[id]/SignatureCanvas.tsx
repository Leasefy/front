'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * SignatureCanvas — the reviewer's mouse/touch-drawn signature (FASE FIRMA).
 *
 * The exported PNG data-URI is DATA (the visible mark), never identity — the
 * signer is derived server-side at sign-off. It is validated micro-side by
 * `validateSignatureImage`: a real PNG, 32 B .. 256 KiB. We therefore only emit
 * a data-URI once the reviewer has actually drawn something (`hasDrawn`); a blank
 * or cleared canvas emits `null` so the sign-off falls back to the honest
 * text-only electronic signature.
 *
 * Pointer Events cover mouse + touch + pen with one code path; `touch-none`
 * stops the browser from scrolling/zooming while drawing on a touch device.
 */
export function SignatureCanvas({
  onChange,
  disabled = false,
  width = 480,
  height = 160,
}: {
  onChange: (dataUri: string | null) => void
  disabled?: boolean
  width?: number
  height?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  // Reset to a clean white surface once, on mount. White (not transparent) so the
  // PNG embeds legibly over the certificate's white page.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111111'
  }, [])

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    // Map CSS pixels → the canvas's intrinsic coordinate space (they can differ
    // when the element is responsively scaled).
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawing.current = true
    canvasRef.current?.setPointerCapture(e.pointerId)
    const { x, y } = pointFromEvent(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = pointFromEvent(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    if (!hasDrawn) setHasDrawn(true)
  }

  function end() {
    if (!drawing.current) return
    drawing.current = false
    if (hasDrawn) emit()
  }

  function emit() {
    const canvas = canvasRef.current
    if (!canvas) return
    onChange(canvas.toDataURL('image/png'))
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    onChange(null)
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className={
          'w-full max-w-[480px] rounded border border-bg-border bg-white touch-none ' +
          (disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-crosshair')
        }
        aria-label="Panel de firma — dibujá tu firma con el mouse o el dedo"
      />
      <div className="flex items-center justify-between mt-2 max-w-[480px]">
        <span className="text-xs text-fg-muted">
          {hasDrawn ? 'Firma capturada.' : 'Opcional — sin firma se usa la constancia electrónica.'}
        </span>
        <button type="button" onClick={clear} disabled={disabled || !hasDrawn} className="btn">
          Limpiar
        </button>
      </div>
    </div>
  )
}
