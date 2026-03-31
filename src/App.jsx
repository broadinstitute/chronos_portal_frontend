import { useState, useEffect } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { FileUpload } from './components/FileUpload'
import { ControlsUpload } from './components/ControlsUpload'
import { LibrarySelect } from './components/LibrarySelect'
import { CompareInput } from './components/CompareInput'
import { StatusBar } from './components/StatusBar'
import { ErrorModal } from './components/ErrorModal'
import { ResultsPage } from './components/ResultsPage'
import { Sidebar } from './components/Sidebar'

function App() {
  const [jobName, setJobName] = useState('')
  const [jobId, setJobId] = useState(null)
  const [pendingFiles, setPendingFiles] = useState({})
  const [condition1, setCondition1] = useState('')
  const [condition2, setCondition2] = useState('')
  const [status, setStatus] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [viewingJobId, setViewingJobId] = useState(null)

  const wsUrl = `ws://${window.location.hostname}:8000/ws`
  const { isConnected, lastMessage } = useWebSocket(wsUrl)

  useEffect(() => {
    if (!lastMessage) return

    if (lastMessage.type === 'status') {
      setStatus(lastMessage.status)
      setStatusMessage(lastMessage.message)

      if (lastMessage.status === 'complete') {
        setIsRunning(false)
        setShowResults(true)
        setViewingJobId(jobId)
      }
    } else if (lastMessage.type === 'error') {
      setError(lastMessage.error)
      setIsRunning(false)
      setStatus('error')
      setStatusMessage('An error occurred')
    }
  }, [lastMessage, jobId])

  const handleFileSelect = (fileType) => (fileInfo) => {
    setPendingFiles((prev) => ({ ...prev, [fileType]: fileInfo }))
  }

  const handleCompareChange = (c1, c2) => {
    setCondition1(c1)
    setCondition2(c2)
  }

  const canRunQC =
    pendingFiles.readcounts &&
    pendingFiles.condition_map &&
    pendingFiles.guide_map &&
    pendingFiles.positive_controls &&
    pendingFiles.negative_controls &&
    !isRunning

  const handleRunQC = async () => {
    setIsRunning(true)
    setStatus('running')
    setError(null)

    const fileTypes = ['readcounts', 'condition_map', 'guide_map', 'copy_number', 'positive_controls', 'negative_controls']
    let currentJobId = null

    try {
      // Upload files sequentially
      for (const fileType of fileTypes) {
        const fileInfo = pendingFiles[fileType]
        if (!fileInfo) continue

        setStatusMessage(`Uploading ${fileType.replace('_', ' ')}...`)

        const formData = new FormData()
        formData.append('file', fileInfo.file)
        formData.append('file_format', fileInfo.format)
        formData.append('job_name', jobName || 'Untitled Analysis')
        if (currentJobId) {
          formData.append('job_id', currentJobId)
        }

        const response = await fetch(`/api/upload/${fileType}`, {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()
        if (!response.ok) {
          throw new Error(`Failed to upload ${fileType}: ${result.detail}`)
        }

        // Capture job_id from first upload
        if (result.job_id && !currentJobId) {
          currentJobId = result.job_id
          setJobId(currentJobId)
        }
      }

      // Now start QC
      setStatusMessage('Starting QC analysis...')
      const qcResponse = await fetch('/api/run-qc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: currentJobId,
          title: jobName || 'Untitled Analysis',
          condition1: condition1 || null,
          condition2: condition2 || null,
        }),
      })

      const qcResult = await qcResponse.json()
      if (!qcResponse.ok) {
        throw new Error(qcResult.detail || 'Failed to start QC')
      }
    } catch (err) {
      setError(err.message)
      setIsRunning(false)
      setStatus('error')
      setStatusMessage('Failed')
    }
  }

  const handleErrorClose = () => {
    setError(null)
    if (status === 'error') {
      setStatus(null)
      setStatusMessage('')
    }
  }

  const handleBackFromResults = () => {
    setShowResults(false)
    setViewingJobId(null)
  }

  const handleSelectJob = (selectedJobId) => {
    setViewingJobId(selectedJobId)
    setShowResults(true)
  }

  if (showResults && viewingJobId) {
    return <ResultsPage jobId={viewingJobId} onBack={handleBackFromResults} />
  }

  return (
    <div className="app-layout">
      <Sidebar onSelectJob={handleSelectJob} />

      <main className="app">
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
              disabled={isRunning}
            />
          </div>
        </div>

        <FileUpload
          label="CRISPR Reads"
          fileType="readcounts"
          onFileSelect={handleFileSelect('readcounts')}
        />

        <FileUpload
          label="Condition map"
          fileType="condition_map"
          onFileSelect={handleFileSelect('condition_map')}
        />

        <LibrarySelect onFileSelect={handleFileSelect('guide_map')} />

        <FileUpload
          label="Copy number"
          fileType="copy_number"
          onFileSelect={handleFileSelect('copy_number')}
          optional
        />

        <div className="controls-section">
          <ControlsUpload
            label="Custom negative controls"
            fileType="negative_controls"
            onFileSelect={handleFileSelect('negative_controls')}
          />
          <ControlsUpload
            label="Custom positive controls"
            fileType="positive_controls"
            onFileSelect={handleFileSelect('positive_controls')}
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
      </main>
    </div>
  )
}

export default App
