import { useState, useRef, useEffect } from 'react'

export function HelpTooltip({ text }) {
  const [isVisible, setIsVisible] = useState(false)
  const [style, setStyle] = useState({})
  const buttonRef = useRef(null)
  const tooltipRef = useRef(null)
  const hoverTimeout = useRef(null)

  const showTooltip = () => {
    clearTimeout(hoverTimeout.current)
    setIsVisible(true)
  }

  const hideTooltip = () => {
    // Small delay to allow moving from button to tooltip
    hoverTimeout.current = setTimeout(() => {
      setIsVisible(false)
    }, 100)
  }

  const keepTooltipOpen = () => {
    clearTimeout(hoverTimeout.current)
  }

  useEffect(() => {
    return () => clearTimeout(hoverTimeout.current)
  }, [])

  useEffect(() => {
    if (isVisible && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const tooltipWidth = 500
      const padding = 16
      const gap = 8

      // Calculate horizontal position (clamped to viewport)
      let left = rect.left + rect.width / 2 - tooltipWidth / 2
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding))

      // Calculate available space above and below
      const spaceBelow = window.innerHeight - rect.bottom - gap - padding
      const spaceAbove = rect.top - gap - padding

      // Estimate tooltip height (will be refined after render)
      const estimatedHeight = 300

      let top, maxHeight, placement

      if (spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove) {
        // Show below
        placement = 'below'
        top = rect.bottom + gap
        maxHeight = Math.max(100, spaceBelow)
      } else {
        // Show above
        placement = 'above'
        maxHeight = Math.max(100, spaceAbove)
        top = rect.top - gap - Math.min(estimatedHeight, maxHeight)
      }

      setStyle({
        top,
        left,
        maxHeight,
        placement,
      })

      // Refine position after tooltip renders (for accurate height)
      requestAnimationFrame(() => {
        if (tooltipRef.current && placement === 'above') {
          const tooltipHeight = tooltipRef.current.offsetHeight
          setStyle((prev) => ({
            ...prev,
            top: rect.top - gap - tooltipHeight,
          }))
        }
      })
    }
  }, [isVisible])

  return (
    <span className="help-tooltip-container">
      <button
        ref={buttonRef}
        type="button"
        className="help-button"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onClick={() => setIsVisible(!isVisible)}
      >
        ?
      </button>
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`help-tooltip ${style.placement === 'above' ? 'above' : ''}`}
          style={{ top: style.top, left: style.left, maxHeight: style.maxHeight }}
          onMouseEnter={keepTooltipOpen}
          onMouseLeave={hideTooltip}
        >
          {text}
        </div>
      )}
    </span>
  )
}
