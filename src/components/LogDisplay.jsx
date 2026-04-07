import { useEffect, useRef } from 'react'

export function LogDisplay({ log }) {
  const containerRef = useRef(null)
  const lines = log ? log.split('\n') : []

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [log])

  return (
    <div className="log-display" ref={containerRef}>
      {lines.map((line, index) => (
        <div key={index} className="log-line">
          {line}
        </div>
      ))}
    </div>
  )
}
