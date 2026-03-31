import { useState, useEffect } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { LogDisplay } from './LogDisplay'
import { ChronosResultsPage } from './ChronosResultsPage'

export function ResultsPage({ jobId, onBack }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isRunningChronos, setIsRunningChronos] = useState(false)
  const [logs, setLogs] = useState([])
  const [showChronosResults, setShowChronosResults] = useState(false)
  const [chronosCompleted, setChronosCompleted] = useState(false)

  const wsUrl = `ws://${window.location.hostname}:8000/ws`
  const { lastMessage } = useWebSocket(wsUrl)

  useEffect(() => {
    async function fetchReport() {
      try {
        const response = await fetch(`/api/reports/${jobId}`)
        if (!response.ok) {
          throw new Error('Failed to load report')
        }
        const data = await response.json()
        setReport(data)
        setChronosCompleted(data.chronos_completed || false)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [jobId])

  useEffect(() => {
    if (!lastMessage) return

    if (lastMessage.type === 'log' && lastMessage.job_id === jobId) {
      setLogs((prev) => [...prev, lastMessage.message])
    } else if (lastMessage.type === 'status' && lastMessage.job_id === jobId) {
      if (lastMessage.status === 'chronos_complete') {
        setIsRunningChronos(false)
        setChronosCompleted(true)
      }
    } else if (lastMessage.type === 'error' && lastMessage.job_id === jobId) {
      setLogs((prev) => [...prev, `ERROR: ${lastMessage.error}`])
      setIsRunningChronos(false)
    }
  }, [lastMessage, jobId])

  const handleRunChronos = async () => {
    setIsRunningChronos(true)
    setLogs([])

    try {
      const response = await fetch('/api/run-chronos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.detail || 'Failed to start Chronos')
      }
    } catch (err) {
      setLogs((prev) => [...prev, `ERROR: ${err.message}`])
      setIsRunningChronos(false)
    }
  }

  if (showChronosResults) {
    return (
      <ChronosResultsPage
        jobId={jobId}
        title={report?.title}
        onBack={() => setShowChronosResults(false)}
      />
    )
  }

  if (loading) {
    return (
      <div className="results-page">
        <div className="results-loading">
          <span className="spinner" />
          Loading report...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="results-page">
        <div className="results-error">
          <p>Error: {error}</p>
          <button onClick={onBack}>Back</button>
        </div>
      </div>
    )
  }

  const handleNext = () => {
    setShowChronosResults(true)
  }

  return (
    <div className="results-page">
      <header className="results-header">
        <button className="back-button" onClick={onBack}>Back</button>
        <h1>{report.title} - QC Results</h1>
        <button
          className="next-button"
          disabled={!chronosCompleted}
          onClick={handleNext}
        >
          Next
        </button>
      </header>

      <div className="results-content">
        {report.sections.map((section) => (
          <div key={section.id} className="results-section">
            <h2>{section.title}</h2>
            <p>{section.text}</p>
            <img src={section.image_url} alt={section.title} />
          </div>
        ))}
      </div>

      {(isRunningChronos || logs.length > 0) && (
        <div className="chronos-log-section">
          <h2>Chronos Output</h2>
          <LogDisplay logs={logs} />
        </div>
      )}

      <div className="results-actions">
        <a
          href={`/api/reports/${jobId}/pdf`}
          download
          className="download-button"
        >
          Download QC Report
        </a>
        <button
          className="run-button"
          disabled={isRunningChronos}
          onClick={handleRunChronos}
        >
          {isRunningChronos ? (
            <>
              <span className="spinner" />
              Running Chronos...
            </>
          ) : (
            'Run Chronos'
          )}
        </button>
      </div>
    </div>
  )
}
