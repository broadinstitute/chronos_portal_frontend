import { useState, useEffect } from 'react'

// Create unique key for file (name + source)
const fileKey = (file) => `${file.source}:${file.name}`

export function ChronosResultsPage({ jobId, title, onBack }) {
  const [files, setFiles] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    async function fetchFiles() {
      try {
        const response = await fetch(`/api/outputs/${jobId}`)
        if (response.ok) {
          const data = await response.json()
          setFiles(data.files)
        }
      } catch (err) {
        console.error('Failed to fetch files:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFiles()
  }, [jobId])

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
        // Single file download
        const file = selectedFiles[0]
        window.location.href = `/api/outputs/${jobId}/download/${file.name}?source=${file.source}`
      } else {
        // Multiple files - download as zip
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
        <h1>{title} - Chronos Outputs</h1>
      </header>

      <div className="files-container">
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
            {selected.size} of {files.length} selected
          </span>
        </div>

        <div className="files-list">
          {files.map((file) => (
            <label key={fileKey(file)} className="file-item">
              <input
                type="checkbox"
                checked={selected.has(fileKey(file))}
                onChange={() => toggleSelect(file)}
              />
              <span className="file-name">{file.name}</span>
              <span className="file-source">{file.source}</span>
              <span className="file-size">{formatSize(file.size)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="results-actions">
        <button
          className="run-button"
          disabled={selected.size === 0 || downloading}
          onClick={handleDownload}
        >
          {downloading ? 'Downloading...' : `Download${selected.size > 1 ? ' (ZIP)' : ''}`}
        </button>
      </div>
    </div>
  )
}
