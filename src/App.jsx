import { useState, useEffect } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { FileUpload } from './components/FileUpload'
import { ControlsUpload } from './components/ControlsUpload'
import { LibrarySelect } from './components/LibrarySelect'
import { CompareInput } from './components/CompareInput'
import { StatusBar } from './components/StatusBar'
import { ErrorModal } from './components/ErrorModal'

function App() {
  const [jobName, setJobName] = useState('')
  const [jobId, setJobId] = useState(null)
  const [uploadedFiles, setUploadedFiles] = useState({})
  const [condition1, setCondition1] = useState('')
  const [condition2, setCondition2] = useState('')
  const [status, setStatus] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState(null)
  const [isRunning, setIsRunning] = useState(false)

  const wsUrl = `ws://${window.location.hostname}:8000/ws`
  const { isConnected, lastMessage } = useWebSocket(wsUrl)

  useEffect(() => {
    if (!lastMessage) return

    if (lastMessage.type === 'status') {
      setStatus(lastMessage.status)
      setStatusMessage(lastMessage.message)

      if (lastMessage.status === 'complete') {
        setIsRunning(false)
      }
    } else if (lastMessage.type === 'error') {
      setError(lastMessage.error)
      setIsRunning(false)
      setStatus('error')
      setStatusMessage('An error occurred')
    }
  }, [lastMessage])

  const handleUpload = (fileType) => (result) => {
    // Store job_id from first upload
    if (result.job_id && !jobId) {
      setJobId(result.job_id)
    }
    setUploadedFiles((prev) => ({ ...prev, [fileType]: result }))
  }

  const handleCompareChange = (c1, c2) => {
    setCondition1(c1)
    setCondition2(c2)
  }

  const canRunQC =
    uploadedFiles.readcounts &&
    uploadedFiles.condition_map &&
    uploadedFiles.guide_map &&
    uploadedFiles.positive_controls &&
    uploadedFiles.negative_controls &&
    !isRunning

  const handleRunQC = async () => {
    setIsRunning(true)
    setStatus('running')
    setStatusMessage('Initializing...')
    setError(null)

    try {
      const response = await fetch('/api/run-qc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ job_id: jobId, title: jobName || 'Untitled Analysis' }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to start QC')
      }

      // Update job_id if returned
      if (result.job_id) {
        setJobId(result.job_id)
      }
    } catch (err) {
      setError(err.message)
      setIsRunning(false)
      setStatus('error')
      setStatusMessage('Failed to start')
    }
  }

  const handleErrorClose = () => {
    setError(null)
    if (status === 'error') {
      setStatus(null)
      setStatusMessage('')
    }
  }

  return (
    <div className="app">
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>

      <header className="header">
        <h1>CRISPR Analysis Portal</h1>
        <p>Upload your screen data and run Chronos QC analysis</p>
      </header>

      <div className="section">
        <div className="section-row">
          <span className="section-label">Job name</span>
          <input
            type="text"
            className="job-name-input"
            placeholder="Enter a name for this analysis"
            value={jobName}
            onChange={(e) => setJobName(e.target.value)}
            disabled={!!jobId}
          />
        </div>
      </div>

      <FileUpload
        label="CRISPR Reads"
        fileType="readcounts"
        jobId={jobId}
        jobName={jobName}
        onUpload={handleUpload('readcounts')}
      />

      <FileUpload
        label="Condition map"
        fileType="condition_map"
        jobId={jobId}
        jobName={jobName}
        onUpload={handleUpload('condition_map')}
      />

      <LibrarySelect jobId={jobId} jobName={jobName} onUpload={handleUpload('guide_map')} />

      <FileUpload
        label="Copy number"
        fileType="copy_number"
        jobId={jobId}
        jobName={jobName}
        onUpload={handleUpload('copy_number')}
        optional
      />

      <div className="controls-section">
        <ControlsUpload
          label="Custom negative controls"
          fileType="negative_controls"
          jobId={jobId}
          jobName={jobName}
          onUpload={handleUpload('negative_controls')}
        />
        <ControlsUpload
          label="Custom positive controls"
          fileType="positive_controls"
          jobId={jobId}
          jobName={jobName}
          onUpload={handleUpload('positive_controls')}
        />
      </div>

      <CompareInput
        condition1={condition1}
        condition2={condition2}
        onChange={handleCompareChange}
      />

      <button className="run-button" disabled={!canRunQC} onClick={handleRunQC}>
        Run Initial QC
      </button>

      <StatusBar status={status} message={statusMessage} />
      <ErrorModal error={error} onClose={handleErrorClose} />
    </div>
  )
}

export default App
