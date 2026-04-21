import { useState, useEffect } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { LogDisplay } from './LogDisplay'
import { ActionSection } from './ActionSection'
import { ReadcountOptions } from './ReadcountOptions'
import { ErrorModal } from './ErrorModal'

// Create unique key for file (name + source)
const fileKey = (file) => `${file.source}:${file.name}`

// File categorization
const isReportFile = (file) => file.source === 'Reports'
const isPoolQFile = (file) => file.source === 'PoolQ'

const PRIMARY_OUTPUT_FILES = [
  'gene_effect.csv',
  'gene_effect_corrected.csv',
  'fdr_from_probabilities.csv',
  'fdr_from_pvalues.csv',
  'pvalues.csv',
  'probability_dependent.csv',
]

const isPrimaryOutput = (file) => {
  if (PRIMARY_OUTPUT_FILES.includes(file.name)) return true
  if (file.name.startsWith('condition_comparison_')) return true
  return false
}

export function ChronosResultsPage({ jobId, initialLog = '', onBack }) {
  const [files, setFiles] = useState([])
  const [log, setLog] = useState(initialLog)
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  // Two-tier tab state
  const [activeCategory, setActiveCategory] = useState('initial-qc')
  const [qcSections, setQcSections] = useState([])
  const [hitsSections, setHitsSections] = useState([])
  const [activeQcTab, setActiveQcTab] = useState(null)
  const [activeHitsTab, setActiveHitsTab] = useState(null)

  // Differential Dependency state
  const [ddSections, setDdSections] = useState([])
  const [activeDdTab, setActiveDdTab] = useState(null)
  const [ddReportLoading, setDdReportLoading] = useState(false)

  const [comparisonRunning, setComparisonRunning] = useState(false)
  const [qcReportLoading, setQcReportLoading] = useState(true)
  const [hitsReportLoading, setHitsReportLoading] = useState(true)

  // Condition comparison state
  const [availableConditions, setAvailableConditions] = useState([])
  const [selectedCondition1, setSelectedCondition1] = useState('')
  const [selectedCondition2, setSelectedCondition2] = useState('')

  // Pipeline state for actions
  const [jobStatus, setJobStatus] = useState(null)
  const [expandedAction, setExpandedAction] = useState(null)

  // Initial QC state (from original ResultsPage)
  const [initialQcSections, setInitialQcSections] = useState([])
  const [activeInitialQcTab, setActiveInitialQcTab] = useState(null)
  const [initialQcLoading, setInitialQcLoading] = useState(true)

  // Action running states
  const [preprocessingRunning, setPreprocessingRunning] = useState(false)
  const [qcRunning, setQcRunning] = useState(false)
  const [chronosRunning, setChronosRunning] = useState(false)

  // Error state
  const [error, setError] = useState(null)

  // Readcount options for preprocessing
  const [readcountOptions, setReadcountOptions] = useState({})
  const [readcountFilenames, setReadcountFilenames] = useState([])

  const wsUrl = `ws://${window.location.host}/ws`
  const { lastMessage } = useWebSocket(wsUrl)

  // Fetch job status (returns data for immediate use)
  const fetchJobStatus = async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/status`)
      if (res.ok) {
        const data = await res.json()
        setJobStatus(data)
        setAvailableConditions(data.available_conditions || [])
        if (data.readcount_options) {
          setReadcountOptions(data.readcount_options)
        }
        if (data.readcount_filenames) {
          setReadcountFilenames(data.readcount_filenames)
        }
        // Sync running states with server's completed flags
        // (fallback if WebSocket message was missed)
        if (data.preprocessing_complete) setPreprocessingRunning(false)
        if (data.qc_completed) setQcRunning(false)
        if (data.chronos_completed) setChronosRunning(false)
        return data
      }
    } catch (err) {
      console.error('Failed to fetch job status:', err)
    }
    return null
  }

  // Fetch Initial QC report
  const fetchInitialQcReport = async (retryCount = 0) => {
    try {
      const res = await fetch(`/api/reports/${jobId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.sections?.length > 0) {
          setInitialQcSections(data.sections)
          setActiveInitialQcTab(data.sections[0].id)
        }
        setInitialQcLoading(false)
      } else if (res.status === 404 && retryCount < 10) {
        setTimeout(() => fetchInitialQcReport(retryCount + 1), 5000)
      } else {
        setInitialQcLoading(false)
      }
    } catch (err) {
      console.error('Failed to fetch Initial QC report:', err)
      setInitialQcLoading(false)
    }
  }

  // Fetch files immediately, try reports (may not be ready yet)
  useEffect(() => {
    async function fetchData() {
      // Fetch job status first (returns data for immediate use)
      const status = await fetchJobStatus()

      try {
        const filesRes = await fetch(`/api/outputs/${jobId}`)
        if (filesRes.ok) {
          const data = await filesRes.json()
          setFiles(data.files)
        }
      } catch (err) {
        console.error('Failed to fetch files:', err)
      } finally {
        setLoading(false)
      }

      // Fetch existing log (for resumed jobs)
      try {
        const logRes = await fetch(`/api/jobs/${jobId}/log`)
        if (logRes.ok) {
          const data = await logRes.json()
          if (data.log) {
            setLog(data.log)
          }
        }
      } catch (err) {
        console.error('Failed to fetch log:', err)
      }

      // Fetch Initial QC report (always try - runs after upload)
      if (status?.qc_completed) {
        fetchInitialQcReport()
      } else {
        setInitialQcLoading(false)
      }

      // Only fetch chronos-qc and hits reports if chronos has completed
      if (status?.chronos_completed) {
        fetchQcReport()
        fetchHitsReport()
        fetchDdReport()
      } else {
        setQcReportLoading(false)
        setHitsReportLoading(false)
      }
    }

    fetchData()
  }, [jobId])

  // Function to fetch QC report (retries on 404)
  const fetchQcReport = async (retryCount = 0) => {
    try {
      const qcRes = await fetch(`/api/reports/${jobId}/chronos-qc`)
      if (qcRes.ok) {
        const data = await qcRes.json()
        if (data.sections && data.sections.length > 0) {
          setQcSections(data.sections)
          setActiveQcTab(data.sections[0].id)
        }
        setQcReportLoading(false)
      } else if (qcRes.status === 404 && retryCount < 10) {
        setTimeout(() => fetchQcReport(retryCount + 1), 5000)
      } else {
        // Non-retryable error or retries exhausted
        setQcReportLoading(false)
      }
    } catch (err) {
      console.error('Failed to fetch QC report:', err)
      setQcReportLoading(false)
    }
  }

  // Function to fetch Hits report (retries on 404)
  const fetchHitsReport = async (retryCount = 0) => {
    try {
      const hitsRes = await fetch(`/api/reports/${jobId}/hits`)
      if (hitsRes.ok) {
        const data = await hitsRes.json()
        if (data.sections && data.sections.length > 0) {
          setHitsSections(data.sections)
          setActiveHitsTab(data.sections[0].id)
        }
        setHitsReportLoading(false)
      } else if (hitsRes.status === 404 && retryCount < 10) {
        setTimeout(() => fetchHitsReport(retryCount + 1), 5000)
      } else {
        // Non-retryable error or retries exhausted
        setHitsReportLoading(false)
      }
    } catch (err) {
      console.error('Failed to fetch hits report:', err)
      setHitsReportLoading(false)
    }
  }

  // Function to fetch Differential Dependency report
  // retry=true when called after dd_report_ready status (report is expected)
  const fetchDdReport = async (retry = false, retryCount = 0) => {
    try {
      const ddRes = await fetch(`/api/reports/${jobId}/differential-dependency`)
      if (ddRes.ok) {
        const data = await ddRes.json()
        if (data.sections && data.sections.length > 0) {
          setDdSections(data.sections)
          setActiveDdTab(data.sections[0].id)
          setDdReportLoading(false)
        }
      } else if (ddRes.status === 404 && retry && retryCount < 10) {
        // Only retry if we're expecting the report (after dd_report_ready)
        setTimeout(() => fetchDdReport(true, retryCount + 1), 5000)
      }
    } catch (err) {
      console.error('Failed to fetch DD report:', err)
    }
  }

  // Listen for status and log updates
  useEffect(() => {
    if (!lastMessage) return

    if (lastMessage.type === 'log' && lastMessage.job_id === jobId) {
      console.log('[WS] Log update received')
      setLog(lastMessage.log)
    }

    // Handle errors
    if (lastMessage.type === 'error' && lastMessage.job_id === jobId) {
      setError(lastMessage.error)
      // Reset all running states
      setPreprocessingRunning(false)
      setQcRunning(false)
      setChronosRunning(false)
      setComparisonRunning(false)
      setDdReportLoading(false)
    }

    if (lastMessage.type === 'status' && lastMessage.job_id === jobId) {
      // Show status messages in the server output
      if (lastMessage.message) {
        setLog((prev) => prev ? `${prev}\n${lastMessage.message}` : lastMessage.message)
      }
      if (lastMessage.status === 'running' && lastMessage.message?.includes('condition comparison')) {
        setComparisonRunning(true)
      } else if (lastMessage.status === 'preprocessing_complete') {
        setPreprocessingRunning(false)
        fetchJobStatus()
      } else if (lastMessage.status === 'complete') {
        // Initial QC completed
        setQcRunning(false)
        fetchJobStatus()
        fetchInitialQcReport()
        // Refresh file list
        fetch(`/api/outputs/${jobId}`)
          .then((res) => res.json())
          .then((data) => setFiles(data.files))
          .catch((err) => console.error('Failed to refresh files:', err))
      } else if (lastMessage.status === 'chronos_complete') {
        setChronosRunning(false)
        fetchJobStatus()
        // Refresh file list
        fetch(`/api/outputs/${jobId}`)
          .then((res) => res.json())
          .then((data) => setFiles(data.files))
          .catch((err) => console.error('Failed to refresh files:', err))
      } else if (lastMessage.status === 'comparison_complete') {
        setComparisonRunning(false)
        fetch(`/api/outputs/${jobId}`)
          .then((res) => res.json())
          .then((data) => setFiles(data.files))
          .catch((err) => console.error('Failed to refresh files:', err))
      } else if (lastMessage.status === 'qc_report_ready') {
        fetchQcReport()
        // Refresh file list to include new PDF
        fetch(`/api/outputs/${jobId}`)
          .then((res) => res.json())
          .then((data) => setFiles(data.files))
          .catch((err) => console.error('Failed to refresh files:', err))
      } else if (lastMessage.status === 'hits_report_ready') {
        fetchHitsReport()
        // Refresh file list to include new PDF
        fetch(`/api/outputs/${jobId}`)
          .then((res) => res.json())
          .then((data) => setFiles(data.files))
          .catch((err) => console.error('Failed to refresh files:', err))
      } else if (lastMessage.status === 'dd_report_ready') {
        fetchDdReport(true)
        // Refresh file list to include new PDF
        fetch(`/api/outputs/${jobId}`)
          .then((res) => res.json())
          .then((data) => setFiles(data.files))
          .catch((err) => console.error('Failed to refresh files:', err))
      }
    }
  }, [lastMessage, jobId])

  const toggleSelect = (file) => {
    const key = fileKey(file)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === files.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(files.map(fileKey)))
    }
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getSelectedFiles = () => {
    return files.filter((f) => selected.has(fileKey(f)))
  }

  const handleDownload = async () => {
    if (selected.size === 0) return

    setDownloading(true)
    const selectedFiles = getSelectedFiles()

    try {
      if (selectedFiles.length === 1) {
        const file = selectedFiles[0]
        window.location.href = `/api/outputs/${jobId}/download/${file.name}?source=${file.source}`
      } else {
        const response = await fetch(`/api/outputs/${jobId}/download-zip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: selectedFiles.map((f) => ({ name: f.name, source: f.source })),
          }),
        })

        if (response.ok) {
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${jobStatus?.title || jobId}_outputs.zip`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
      }
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  const handleRunDifferentialDependency = async () => {
    if (!selectedCondition1 || !selectedCondition2 || selectedCondition1 === selectedCondition2) {
      return
    }

    setComparisonRunning(true)
    setExpandedAction(null)
    setDdReportLoading(true)

    try {
      const response = await fetch('/api/run-differential-dependency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          condition1: selectedCondition1,
          condition2: selectedCondition2,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        console.error('Failed to start differential dependency:', result.detail)
        setComparisonRunning(false)
        setDdReportLoading(false)
      }
    } catch (err) {
      console.error('Failed to start differential dependency:', err)
      setComparisonRunning(false)
      setDdReportLoading(false)
    }
  }

  // Action handlers
  const handleRunPreprocessing = async () => {
    setPreprocessingRunning(true)
    setExpandedAction(null)
    setLog('')
    try {
      // First save readcount options
      await fetch('/api/readcount-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, ...readcountOptions }),
      })
      // Then run preprocessing
      const res = await fetch('/api/run-preprocessing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      })
      if (!res.ok) {
        const result = await res.json()
        console.error('Failed to start preprocessing:', result.detail)
        setPreprocessingRunning(false)
      }
    } catch (err) {
      console.error('Failed to start preprocessing:', err)
      setPreprocessingRunning(false)
    }
  }

  const handleRunQc = async () => {
    setQcRunning(true)
    setExpandedAction(null)
    setLog('')
    try {
      const res = await fetch('/api/run-qc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      })
      if (!res.ok) {
        const result = await res.json()
        console.error('Failed to start QC:', result.detail)
        setQcRunning(false)
      }
    } catch (err) {
      console.error('Failed to start QC:', err)
      setQcRunning(false)
    }
  }

  const handleRunChronos = async () => {
    setChronosRunning(true)
    setExpandedAction(null)
    setLog('')
    try {
      const res = await fetch('/api/run-chronos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      })
      if (!res.ok) {
        const result = await res.json()
        console.error('Failed to start Chronos:', result.detail)
        setChronosRunning(false)
      }
    } catch (err) {
      console.error('Failed to start Chronos:', err)
      setChronosRunning(false)
    }
  }

  // Action status helpers - check prerequisites only, not completion status
  // (completion is allowed for re-running)
  const canRunInitialQc = jobStatus &&
    (!jobStatus.is_sequence_format || jobStatus.preprocessing_complete)

  const canRunChronos = jobStatus?.qc_completed

  const getPreprocessingStatus = () => {
    if (preprocessingRunning) return 'running'
    if (jobStatus?.preprocessing_complete) return 'complete'
    return 'ready'
  }

  const getInitialQcStatus = () => {
    if (qcRunning) return 'running'
    if (jobStatus?.qc_completed) return 'complete'
    if (!canRunInitialQc) return 'pending'
    return 'ready'
  }

  const getChronosStatus = () => {
    if (chronosRunning) return 'running'
    if (jobStatus?.chronos_completed) return 'complete'
    if (!jobStatus?.qc_completed) return 'pending'
    return 'ready'
  }

  const getDdStatus = () => {
    if (comparisonRunning) return 'running'
    if (ddSections.length > 0) return 'complete'
    if (!jobStatus?.chronos_completed) return 'pending'
    return 'ready'
  }

  // Check if any action is running (prevents starting multiple actions)
  const anyActionRunning = preprocessingRunning || qcRunning || chronosRunning || comparisonRunning

  // Check if DD can be run
  const canRunDd =
    availableConditions.length >= 2 &&
    !qcReportLoading &&
    !hitsReportLoading &&
    selectedCondition1 &&
    selectedCondition2 &&
    selectedCondition1 !== selectedCondition2 &&
    !anyActionRunning

  // Get active sections and tab based on category
  const currentSections =
    activeCategory === 'initial-qc' ? initialQcSections :
    activeCategory === 'qc' ? qcSections :
    activeCategory === 'hits' ? hitsSections :
    ddSections
  const currentActiveTab =
    activeCategory === 'initial-qc' ? activeInitialQcTab :
    activeCategory === 'qc' ? activeQcTab :
    activeCategory === 'hits' ? activeHitsTab :
    activeDdTab
  const setCurrentActiveTab =
    activeCategory === 'initial-qc' ? setActiveInitialQcTab :
    activeCategory === 'qc' ? setActiveQcTab :
    activeCategory === 'hits' ? setActiveHitsTab :
    setActiveDdTab
  const currentLoading =
    activeCategory === 'initial-qc' ? initialQcLoading :
    activeCategory === 'qc' ? qcReportLoading :
    activeCategory === 'hits' ? hitsReportLoading :
    ddReportLoading

  const activeSection = currentSections.find((s) => s.id === currentActiveTab)

  if (loading) {
    return (
      <div className="chronos-results-page">
        <div className="results-loading">
          <span className="spinner" />
          Loading outputs...
        </div>
      </div>
    )
  }

  return (
    <div className="chronos-results-page">
      <header className="results-header">
        <button className="back-button" onClick={onBack}>
          Back
        </button>
        <h1>{jobStatus?.title || 'Untitled'} - Chronos CRISPR Analysis</h1>
      </header>

      <div className="chronos-layout">
        {/* Main content area with two-tier tabs */}
        <div className="chronos-main">
          {/* Top-level category tabs */}
          <div className="category-tabs">
            <button
              className={`category-tab ${activeCategory === 'initial-qc' ? 'active' : ''}`}
              onClick={() => setActiveCategory('initial-qc')}
            >
              Initial QC
              {initialQcLoading && <span className="tab-spinner" />}
            </button>
            <button
              className={`category-tab ${activeCategory === 'qc' ? 'active' : ''}`}
              onClick={() => setActiveCategory('qc')}
            >
              Chronos QC
              {qcReportLoading && <span className="tab-spinner" />}
            </button>
            <button
              className={`category-tab ${activeCategory === 'hits' ? 'active' : ''}`}
              onClick={() => setActiveCategory('hits')}
            >
              Hits
              {hitsReportLoading && <span className="tab-spinner" />}
            </button>
            <button
              className={`category-tab ${activeCategory === 'dd' ? 'active' : ''}`}
              onClick={() => setActiveCategory('dd')}
            >
              Differential Dependency
              {ddReportLoading && <span className="tab-spinner" />}
            </button>
          </div>

          {/* Content area */}
          {currentLoading ? (
            <div className="qc-report-loading">
              <span className="spinner" />
              <span>Generating {
                activeCategory === 'initial-qc' ? 'initial QC' :
                activeCategory === 'qc' ? 'Chronos QC' :
                activeCategory === 'hits' ? 'hits' :
                'differential dependency'
              } report...</span>
            </div>
          ) : currentSections.length > 0 ? (
            <>
              {/* Second-level section tabs */}
              <div className="chronos-tabs">
                {currentSections.map((section) => (
                  <button
                    key={section.id}
                    className={`chronos-tab ${currentActiveTab === section.id ? 'active' : ''}`}
                    onClick={() => setCurrentActiveTab(section.id)}
                  >
                    {section.title}
                  </button>
                ))}
              </div>

              {activeSection && (
                <div className="chronos-section-content">
                  <h2>{activeSection.title}</h2>
                  {activeSection.text && (
                    <p className="section-text">{activeSection.text}</p>
                  )}
                  <div className="section-images">
                    {/* Handle both image_url (Initial QC) and image_urls (other reports) */}
                    {activeSection.image_url && (
                      <img src={activeSection.image_url} alt={activeSection.title} />
                    )}
                    {activeSection.image_urls?.map((url, idx) => (
                      <img key={idx} src={url} alt={`${activeSection.title} ${idx + 1}`} />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="no-sections">
              {activeCategory === 'dd' ? (
                <p>Select two conditions in the sidebar and click "Compare Conditions" to generate differential dependency analysis.</p>
              ) : activeCategory === 'initial-qc' ? (
                <p>Run Initial Data QC from the Actions panel to generate the report.</p>
              ) : (
                <p>No {activeCategory === 'qc' ? 'Chronos QC' : 'hits'} report sections available. Run Chronos first.</p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar with actions and downloads */}
        <div className="chronos-sidebar">
          {/* Actions Section */}
          <h3>Actions</h3>
          <div className="sidebar-actions-list">
            {/* Generate Readcount Matrix - only for sequence formats */}
            {jobStatus?.is_sequence_format && (
              <ActionSection
                title="Generate Readcount Matrix"
                expanded={expandedAction === 'preprocessing'}
                onToggle={() => setExpandedAction(expandedAction === 'preprocessing' ? null : 'preprocessing')}
                status={getPreprocessingStatus()}
              >
                <ReadcountOptions
                  filenames={readcountFilenames}
                  hasCompressed={false}
                  onChange={setReadcountOptions}
                  compact={true}
                />
                <button
                  className="action-run-button"
                  disabled={anyActionRunning}
                  onClick={handleRunPreprocessing}
                >
                  {preprocessingRunning ? 'Processing...' : 'Run Preprocessing'}
                </button>
              </ActionSection>
            )}

            {/* Initial Data QC */}
            <ActionSection
              title="Initial Data QC"
              expanded={expandedAction === 'initial-qc'}
              onToggle={() => setExpandedAction(expandedAction === 'initial-qc' ? null : 'initial-qc')}
              status={getInitialQcStatus()}
              disabled={!canRunInitialQc && !jobStatus?.qc_completed}
            >
              <p className="action-description">
                Generate quality control report for uploaded data.
              </p>
              <button
                className="action-run-button"
                disabled={anyActionRunning || !canRunInitialQc}
                onClick={handleRunQc}
              >
                {qcRunning ? 'Running QC...' : 'Run Initial QC'}
              </button>
            </ActionSection>

            {/* Run Chronos */}
            <ActionSection
              title="Run Chronos"
              expanded={expandedAction === 'chronos'}
              onToggle={() => setExpandedAction(expandedAction === 'chronos' ? null : 'chronos')}
              status={getChronosStatus()}
              disabled={!canRunChronos}
            >
              <p className="action-description">
                Train Chronos model, generate QC report, and run hit calling.
              </p>
              <button
                className="action-run-button"
                disabled={anyActionRunning || !canRunChronos}
                onClick={handleRunChronos}
              >
                {chronosRunning ? 'Running...' : 'Run Chronos'}
              </button>
            </ActionSection>

            {/* Differential Dependency */}
            {jobStatus?.chronos_completed && availableConditions.length >= 2 && (
              <ActionSection
                title="Differential Dependency"
                expanded={expandedAction === 'dd'}
                onToggle={() => setExpandedAction(expandedAction === 'dd' ? null : 'dd')}
                status={getDdStatus()}
                disabled={false}
              >
                <div className="dd-dropdowns">
                  <select
                    value={selectedCondition1}
                    onChange={(e) => setSelectedCondition1(e.target.value)}
                    disabled={comparisonRunning}
                  >
                    <option value="">Select condition...</option>
                    {availableConditions.map((cond) => (
                      <option key={cond} value={cond}>{cond}</option>
                    ))}
                  </select>
                  <span className="dd-vs">vs</span>
                  <select
                    value={selectedCondition2}
                    onChange={(e) => setSelectedCondition2(e.target.value)}
                    disabled={comparisonRunning}
                  >
                    <option value="">Select condition...</option>
                    {availableConditions.map((cond) => (
                      <option key={cond} value={cond}>{cond}</option>
                    ))}
                  </select>
                </div>
                <button
                  className="action-run-button"
                  disabled={!canRunDd}
                  onClick={handleRunDifferentialDependency}
                >
                  {comparisonRunning ? 'Running...' : 'Compare Conditions'}
                </button>
              </ActionSection>
            )}
          </div>

          {/* Server Output */}
          <div className="sidebar-log-section">
            <h4>Server Output</h4>
            <LogDisplay log={log || ''} />
          </div>

          <h3>Download Outputs</h3>

          <div className="files-header">
            <label className="select-all">
              <input
                type="checkbox"
                checked={selected.size === files.length && files.length > 0}
                onChange={selectAll}
              />
              Select All
            </label>
            <span className="files-count">
              {selected.size} of {files.length}
            </span>
          </div>

          <div className="files-list">
            {/* Reports (PDFs) */}
            {files.filter(isReportFile).length > 0 && (
              <>
                <div className="files-tier-header">Reports</div>
                {files.filter(isReportFile).map((file) => (
                  <label key={fileKey(file)} className="file-item">
                    <input
                      type="checkbox"
                      checked={selected.has(fileKey(file))}
                      onChange={() => toggleSelect(file)}
                    />
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{formatSize(file.size)}</span>
                  </label>
                ))}
              </>
            )}
            {/* Primary Outputs */}
            {files.filter((f) => !isReportFile(f) && isPrimaryOutput(f)).length > 0 && (
              <>
                <div className="files-tier-header">Primary Outputs</div>
                {files.filter((f) => !isReportFile(f) && isPrimaryOutput(f)).map((file) => (
                  <label key={fileKey(file)} className="file-item">
                    <input
                      type="checkbox"
                      checked={selected.has(fileKey(file))}
                      onChange={() => toggleSelect(file)}
                    />
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{formatSize(file.size)}</span>
                  </label>
                ))}
              </>
            )}
            {/* Other Outputs */}
            {files.filter((f) => !isReportFile(f) && !isPrimaryOutput(f) && !isPoolQFile(f)).length > 0 && (
              <>
                <div className="files-tier-header">Other Outputs</div>
                {files.filter((f) => !isReportFile(f) && !isPrimaryOutput(f) && !isPoolQFile(f)).map((file) => (
                  <label key={fileKey(file)} className="file-item">
                    <input
                      type="checkbox"
                      checked={selected.has(fileKey(file))}
                      onChange={() => toggleSelect(file)}
                    />
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{formatSize(file.size)}</span>
                  </label>
                ))}
              </>
            )}
            {/* PoolQ Outputs - only for sequence format jobs */}
            {jobStatus?.is_sequence_format && files.filter(isPoolQFile).length > 0 && (
              <>
                <div className="files-tier-header">PoolQ Outputs</div>
                {files.filter(isPoolQFile).map((file) => (
                  <label key={fileKey(file)} className="file-item">
                    <input
                      type="checkbox"
                      checked={selected.has(fileKey(file))}
                      onChange={() => toggleSelect(file)}
                    />
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{formatSize(file.size)}</span>
                  </label>
                ))}
              </>
            )}
          </div>

          <button
            className="download-button"
            disabled={selected.size === 0 || downloading}
            onClick={handleDownload}
          >
            {downloading ? 'Downloading...' : `Download${selected.size > 1 ? ' (ZIP)' : ''}`}
          </button>
        </div>
      </div>

      <ErrorModal error={error} onClose={() => setError(null)} />
    </div>
  )
}
