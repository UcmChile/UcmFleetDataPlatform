import { useMemo, useState } from 'react'

export function useLoginParallax() {
  const motionOk = useMemo(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, [])
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  function onMouseMove(event) {
    if (!motionOk) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2
    setOffset({ x, y })
  }

  function onMouseLeave() {
    if (motionOk) setOffset({ x: 0, y: 0 })
  }

  function layerStyle(multX, multY) {
    if (!motionOk) return undefined
    return {
      willChange: 'transform',
      transform: `translate3d(${offset.x * multX}px, ${offset.y * multY}px, 0)`,
    }
  }

  return { onMouseMove, onMouseLeave, layerStyle, motionOk }
}
