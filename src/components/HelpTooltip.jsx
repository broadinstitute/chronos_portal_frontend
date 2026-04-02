import { useState } from 'react'

export function HelpTooltip({ text }) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <span className="help-tooltip-container">
      <button
        type="button"
        className="help-button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
      >
        ?
      </button>
      {isVisible && (
        <div className="help-tooltip">
          {text}
        </div>
      )}
    </span>
  )
}
