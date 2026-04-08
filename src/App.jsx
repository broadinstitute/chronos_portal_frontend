import { useState, useEffect } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { FileUpload } from './components/FileUpload'
import { ControlsUpload } from './components/ControlsUpload'
import { LibrarySelect } from './components/LibrarySelect'
import { StatusBar } from './components/StatusBar'
import { ErrorModal } from './components/ErrorModal'
import { ResultsPage } from './components/ResultsPage'
import { Sidebar } from './components/Sidebar'

// Generate a job ID (same format as server)
function generateJobId(name) {
  const sanitized = name
    ? name.replace(/[^\w-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 50) || 'job'
    : 'job'
  const now = new Date()
  const timestamp = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0')
  return `${sanitized}_${timestamp}`
}

// Help text from Chronos docstrings
const HELP_TEXT = {
  readcounts: "Matrix with sequenced entities (replicates) on rows, guides as column headers, and total readcounts for the guide in the replicate as entries.",
  condition_map: "Table with columns: sequence_ID (matches row index in readcounts), cell_line (name or 'pDNA'), days (cell days from infection), pDNA_batch (links late timepoints to time 0 counts). Optional: replicate, condition.",
  guide_map: "Table with columns: sgrna (guide sequence or unique identifier) and gene (gene mapped to by guide).",
  copy_number: "Cell-line by gene matrix of relative (floating point) copy number. Used to correct for copy number effects after Chronos inference.",
  negative_controls: "A list of negative control genes.",
  positive_controls: "A list of positive control genes.",
}

function App() {
  const [jobName, setJobName] = useState('')
  const [jobId, setJobId] = useState(null)
  const [pendingFiles, setPendingFiles] = useState({})
  const [selectedLibrary, setSelectedLibrary] = useState(null)
  const [usePretrained, setUsePretrained] = useState(true)
  const [status, setStatus] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [viewingJobId, setViewingJobId] = useState(null)

  const wsUrl = `ws://${window.location.host}/ws`
  const { isConnected, lastMessage } = useWebSocket(wsUrl)

  useEffect(() => {
    if (!lastMessage) return

    // Ignore all messages if no job selected (landing page)
    if (!jobId) return

    // Only handle messages for current job
    if (lastMessage.job_id && lastMessage.job_id !== jobId) {
      return
    }

    if (lastMessage.type === 'status') {
      setStatus(lastMessage.status)
      setStatusMessage(lastMessage.message)

      if (lastMessage.status === 'complete' && lastMessage.job_id) {
        setIsRunning(false)
        setShowResults(true)
        setViewingJobId(lastMessage.job_id)
      }
    } else if (lastMessage.type === 'error') {
      setError(lastMessage.error)
      setIsRunning(false)
      setStatus('error')
      setStatusMessage('An error occurred')
      // Only nullify jobId on landing page (not when viewing results)
      if (!showResults) {
        setJobId(null)
      }
    }
  }, [lastMessage, jobId, showResults])

  const handleFileSelect = (fileType) => (fileInfo) => {
    setPendingFiles((prev) => ({ ...prev, [fileType]: fileInfo }))
  }

  const hasGuideMap = pendingFiles.guide_map || selectedLibrary
  const canRunQC =
    pendingFiles.readcounts &&
    pendingFiles.condition_map &&
    hasGuideMap &&
    !isRunning

  const handleRunQC = async () => {
    // Generate job ID upfront before any API calls
    const newJobId = generateJobId(jobName || 'Untitled Analysis')
    setJobId(newJobId)

    setIsRunning(true)
    setStatus('running')
    setError(null)

    // Files to upload (exclude guide_map if using built-in library)
    const fileTypes = ['readcounts', 'condition_map', 'copy_number', 'positive_controls', 'negative_controls']
    if (pendingFiles.guide_map) {
      fileTypes.splice(2, 0, 'guide_map')  // Insert after condition_map
    }

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
        formData.append('job_id', newJobId)

        const response = await fetch(`/api/upload/${fileType}`, {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()
        if (!response.ok) {
          throw new Error(`Failed to upload ${fileType}: ${result.detail}`)
        }
      }

      // If using a built-in library, set it now
      if (selectedLibrary) {
        setStatusMessage('Setting library...')
        const formData = new FormData()
        formData.append('job_name', jobName || 'Untitled Analysis')
        formData.append('job_id', newJobId)

        const libResponse = await fetch(`/api/set-library/${selectedLibrary}`, {
          method: 'POST',
          body: formData,
        })

        const libResult = await libResponse.json()
        if (!libResponse.ok) {
          throw new Error(`Failed to set library: ${libResult.detail}`)
        }
      }

      // Now start QC
      setStatusMessage('Starting QC analysis...')
      const qcResponse = await fetch('/api/run-qc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: newJobId,
          title: jobName || 'Untitled Analysis',
          use_pretrained: usePretrained,
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
      setJobId(null)
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
    setJobId(null)
  }

  const handleSelectJob = (selectedJobId) => {
    setJobId(selectedJobId)
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
          allowHdf5
          helpText={HELP_TEXT.readcounts}
        />

        <FileUpload
          label="Condition map"
          fileType="condition_map"
          onFileSelect={handleFileSelect('condition_map')}
          helpText={HELP_TEXT.condition_map}
        />

        <LibrarySelect
          onFileSelect={handleFileSelect('guide_map')}
          onLibrarySelect={setSelectedLibrary}
          onPretrainedChange={setUsePretrained}
          helpText={HELP_TEXT.guide_map}
        />

        <FileUpload
          label="Copy number"
          fileType="copy_number"
          onFileSelect={handleFileSelect('copy_number')}
          optional
          allowHdf5
          helpText={HELP_TEXT.copy_number}
        />

        <div className="controls-section">
          <ControlsUpload
            label="Negative controls"
            fileType="negative_controls"
            onFileSelect={handleFileSelect('negative_controls')}
            optional
            helpText={HELP_TEXT.negative_controls}
          />
          <ControlsUpload
            label="Positive controls"
            fileType="positive_controls"
            onFileSelect={handleFileSelect('positive_controls')}
            optional
            helpText={HELP_TEXT.positive_controls}
          />
        </div>

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
