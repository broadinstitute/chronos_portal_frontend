import { useState, useEffect } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { LogDisplay } from './LogDisplay'
import { ChronosResultsPage } from './ChronosResultsPage'
import { ErrorModal } from './ErrorModal'

export function ResultsPage({ jobId, onBack }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chronosError, setChronosError] = useState(null)
  const [isRunningChronos, setIsRunningChronos] = useState(false)
  const [logs, setLogs] = useState([])
  const [showChronosResults, setShowChronosResults] = useState(false)
  const [chronosCompleted, setChronosCompleted] = useState(false)
  const [activeTab, setActiveTab] = useState(null)

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
        if (data.sections?.length > 0) {
          setActiveTab(data.sections[0].id)
        }
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

    console.log('[WS] Received message:', lastMessage)

    if (lastMessage.type === 'log' && lastMessage.job_id === jobId) {
      console.log('[WS] Log message:', lastMessage.message)
      setLogs((prev) => {
        console.log('[WS] logs length before:', prev.length, 'adding:', lastMessage.message)
        return [...prev, lastMessage.message]
      })
    } else if (lastMessage.type === 'status' && lastMessage.job_id === jobId) {
      console.log('[WS] Status message:', lastMessage.status)
      if (lastMessage.status === 'chronos_complete') {
        console.log('[WS] Chronos complete! Setting state...')
        setIsRunningChronos(false)
        setChronosCompleted(true)
      }
    } else if (lastMessage.type === 'error' && lastMessage.job_id === jobId) {
      console.log('[WS] Error received:', lastMessage.error)
      setLogs((prev) => [...prev, `ERROR: ${lastMessage.error}`])
      setChronosError(lastMessage.error)
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

  const handleErrorClose = () => {
    setChronosError(null)
  }

  const activeSection = report.sections.find((s) => s.id === activeTab)

  return (
    <div className="results-page">
      <header className="results-header">
        <button className="back-button" onClick={onBack}>Back</button>
        <h1>{report.title} - QC Results</h1>
      </header>

      <div className="results-layout">
        {/* Main content area with tabs */}
        <div className="results-main">
          {report.sections.length > 0 && (
            <>
              <div className="results-tabs">
                {report.sections.map((section) => (
                  <button
                    key={section.id}
                    className={`results-tab ${activeTab === section.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(section.id)}
                  >
                    {section.title}
                  </button>
                ))}
              </div>

              {activeSection && (
                <div className="results-section-content">
                  <h2>{activeSection.title}</h2>
                  <p className="section-text">{activeSection.text}</p>
                  <div className="section-images">
                    <img src={activeSection.image_url} alt={activeSection.title} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar with actions and Chronos output */}
        <div className="results-sidebar">
          <h3>Actions</h3>

          <div className="sidebar-actions">
            <a
              href={`/api/reports/${jobId}/pdf`}
              download
              className="sidebar-button"
            >
              Download QC Report
            </a>

            <button
              className="sidebar-button run-chronos-button"
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

            {chronosCompleted && (
              <button
                className="sidebar-button view-results-button"
                disabled={isRunningChronos}
                onClick={handleNext}
              >
                View Chronos Results
              </button>
            )}
          </div>

          {(isRunningChronos || logs.length > 0) && (
            <div className="sidebar-log-section">
              <h4>Chronos Output</h4>
              <LogDisplay logs={logs} />
            </div>
          )}
        </div>
      </div>

      <ErrorModal error={chronosError} onClose={handleErrorClose} />
    </div>
  )
}
