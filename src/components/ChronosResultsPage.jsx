import { useState, useEffect } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { LogDisplay } from './LogDisplay'

// Create unique key for file (name + source)
const fileKey = (file) => `${file.source}:${file.name}`

// File categorization
const isReportFile = (file) => file.source === 'Reports'

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

export function ChronosResultsPage({ jobId, title, initialLog = '', onBack }) {
  const [files, setFiles] = useState([])
  const [log, setLog] = useState(initialLog)
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  // Two-tier tab state
  const [activeCategory, setActiveCategory] = useState('qc')
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

  const wsUrl = `ws://${window.location.hostname}:8000/ws`
  const { lastMessage } = useWebSocket(wsUrl)

  // Fetch files immediately, try reports (may not be ready yet)
  useEffect(() => {
    async function fetchData() {
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

      // Fetch available conditions
      try {
        const condRes = await fetch(`/api/jobs/${jobId}/conditions`)
        if (condRes.ok) {
          const data = await condRes.json()
          setAvailableConditions(data.conditions || [])
        }
      } catch (err) {
        console.error('Failed to fetch conditions:', err)
      }

      // Try to fetch reports (may not be ready yet)
      fetchQcReport()
      fetchHitsReport()
      fetchDdReport()
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
          setQcReportLoading(false)
        }
      } else if (qcRes.status === 404 && retryCount < 10) {
        setTimeout(() => fetchQcReport(retryCount + 1), 5000)
      }
    } catch (err) {
      console.error('Failed to fetch QC report:', err)
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
          setHitsReportLoading(false)
        }
      } else if (hitsRes.status === 404 && retryCount < 10) {
        setTimeout(() => fetchHitsReport(retryCount + 1), 5000)
      }
    } catch (err) {
      console.error('Failed to fetch hits report:', err)
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
    } else if (lastMessage.type === 'status' && lastMessage.job_id === jobId) {
      if (lastMessage.status === 'running' && lastMessage.message?.includes('condition comparison')) {
        setComparisonRunning(true)
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
          a.download = `${title || jobId}_outputs.zip`
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

  // Check if DD can be run
  const canRunDd =
    availableConditions.length >= 2 &&
    !qcReportLoading &&
    !hitsReportLoading &&
    selectedCondition1 &&
    selectedCondition2 &&
    selectedCondition1 !== selectedCondition2 &&
    !comparisonRunning

  // Get active sections and tab based on category
  const currentSections =
    activeCategory === 'qc' ? qcSections :
    activeCategory === 'hits' ? hitsSections :
    ddSections
  const currentActiveTab =
    activeCategory === 'qc' ? activeQcTab :
    activeCategory === 'hits' ? activeHitsTab :
    activeDdTab
  const setCurrentActiveTab =
    activeCategory === 'qc' ? setActiveQcTab :
    activeCategory === 'hits' ? setActiveHitsTab :
    setActiveDdTab
  const currentLoading =
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
        <h1>{title} - Chronos Results</h1>
      </header>

      <div className="chronos-layout">
        {/* Main content area with two-tier tabs */}
        <div className="chronos-main">
          {/* Top-level category tabs */}
          <div className="category-tabs">
            <button
              className={`category-tab ${activeCategory === 'qc' ? 'active' : ''}`}
              onClick={() => setActiveCategory('qc')}
            >
              QC
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
              Diff Dep
              {ddReportLoading && <span className="tab-spinner" />}
            </button>
          </div>

          {/* Content area */}
          {currentLoading ? (
            <div className="qc-report-loading">
              <span className="spinner" />
              <span>Generating {activeCategory === 'qc' ? 'QC' : activeCategory === 'hits' ? 'hits' : 'differential dependency'} report...</span>
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
                    {activeSection.image_urls.map((url, idx) => (
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
              ) : (
                <p>No {activeCategory === 'qc' ? 'QC' : 'hits'} report sections available.</p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar with download list */}
        <div className="chronos-sidebar">
          {log && (
            <div className="sidebar-log-section">
              <h4>Server Output</h4>
              <LogDisplay log={log} />
            </div>
          )}

          {/* Differential Dependency section - show when 2+ conditions and reports ready */}
          {availableConditions.length >= 2 && !qcReportLoading && !hitsReportLoading && (
            <>
              <h3>Differential Dependency</h3>
              <div className="dd-compare-section">
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
                  className="sidebar-button dd-button"
                  disabled={!canRunDd}
                  onClick={handleRunDifferentialDependency}
                >
                  {comparisonRunning ? (
                    <>
                      <span className="spinner" />
                      Running...
                    </>
                  ) : (
                    'Compare Conditions'
                  )}
                </button>
              </div>
            </>
          )}

          <h3>Download Outputs</h3>

          {comparisonRunning && (
            <div className="comparison-status">
              <span className="spinner" />
              <span>Running condition comparison...</span>
            </div>
          )}

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
            {files.filter((f) => !isReportFile(f) && !isPrimaryOutput(f)).length > 0 && (
              <>
                <div className="files-tier-header">Other Outputs</div>
                {files.filter((f) => !isReportFile(f) && !isPrimaryOutput(f)).map((file) => (
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
    </div>
  )
}
