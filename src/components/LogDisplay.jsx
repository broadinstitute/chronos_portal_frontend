import { useEffect, useRef } from 'react'

export function LogDisplay({ logs }) {
  const containerRef = useRef(null)

  console.log('[LogDisplay] rendering with', logs.length, 'logs')

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="log-display" ref={containerRef}>
      {logs.map((log, index) => (
        <div key={index} className="log-line">
          {log}
        </div>
      ))}
    </div>
  )
}
