import { useState, useRef, useEffect } from 'react'
import { HelpTooltip } from './HelpTooltip'
import tooltips from '../tooltips.json'

export function LibrarySelect({
  onFileSelect,
  onLibrarySelect,
  onPretrainedChange,
  helpText,
  initialSelection = null,
  initialFile = null,
  initialUsePretrained = true,
}) {
  const [libraries, setLibraries] = useState([])
  const [selection, setSelection] = useState(initialSelection) // null until libraries load, or use initial
  const [usePretrained, setUsePretrained] = useState(initialUsePretrained)
  const [file, setFile] = useState(initialFile?.file || null)
  const [format, setFormat] = useState(initialFile?.format || 'csv')
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef(null)

  const isCustom = selection === 'Custom'

  // Fetch available libraries on mount
  useEffect(() => {
    async function fetchLibraries() {
      try {
        const response = await fetch('/api/libraries')
        if (response.ok) {
          const data = await response.json()
          setLibraries(data.libraries)
          // Only set default if no initial selection was provided
          if (selection === null) {
            // Default to TKOv3 if available, otherwise first library
            if (data.libraries.includes('TKOv3')) {
              setSelection('TKOv3')
            } else if (data.libraries.length > 0) {
              setSelection(data.libraries[0])
            } else {
              setSelection('Custom')
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch libraries:', err)
        if (selection === null) {
          setSelection('Custom')
        }
      }
    }
    fetchLibraries()
  }, [])

  // Notify parent when selection changes
  useEffect(() => {
    if (selection === null) return // Wait for initial load

    if (isCustom) {
      // Clear library selection, use custom file if available
      onLibrarySelect?.(null)
      setUsePretrained(false)
      if (file) {
        onFileSelect?.({ file, format, filename: file.name })
      } else {
        onFileSelect?.(null)
      }
    } else {
      // Using a built-in library
      onFileSelect?.(null)
      onLibrarySelect?.(selection)
      // Auto-check pretrained when selecting a built-in library
      setUsePretrained(true)
    }
  }, [selection])

  // Notify parent when pretrained changes
  useEffect(() => {
    onPretrainedChange?.(usePretrained)
  }, [usePretrained])

  const handleFile = (selectedFile) => {
    if (!selectedFile || !isCustom) return
    setFile(selectedFile)
    onFileSelect?.({ file: selectedFile, format, filename: selectedFile.name })
  }

  // Update parent when format changes for already-selected file
  useEffect(() => {
    if (file && isCustom) {
      onFileSelect?.({ file, format, filename: file.name })
    }
  }, [format])

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    if (!isCustom) return
    const droppedFile = e.dataTransfer.files[0]
    handleFile(droppedFile)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    if (isCustom) setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleClick = () => {
    if (isCustom) inputRef.current?.click()
  }

  const handleChange = (e) => {
    handleFile(e.target.files[0])
  }

  const displayText = file && isCustom
    ? file.name
    : isCustom
    ? 'Click or drag to upload'
    : selection
    ? `Using ${selection} library`
    : 'Loading libraries...'

  const className = `file-display${file && isCustom ? ' has-file' : ''}${isDragOver ? ' dragover' : ''}${!isCustom ? ' disabled' : ''}`

  return (
    <div className="section">
      <div className="section-row">
        <span className="section-label">
          sgRNA library
          {helpText && <HelpTooltip text={helpText} />}
        </span>
        <div className="file-input-wrapper">
          <select
            className="format-select"
            value={selection || ''}
            onChange={(e) => setSelection(e.target.value)}
            style={{ minWidth: '120px' }}
          >
            {libraries.map((lib) => (
              <option key={lib} value={lib}>{lib}</option>
            ))}
            <option value="Custom">Custom</option>
          </select>
          <div
            className={className}
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={{ flex: 1 }}
          >
            {displayText}
          </div>
          {isCustom && (
            <select
              className="format-select"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="csv">csv</option>
              <option value="tsv">tsv</option>
            </select>
          )}
          <input
            ref={inputRef}
            type="file"
            className="hidden-input"
            onChange={handleChange}
          />
        </div>
      </div>
      <div className="section-row" style={{ marginTop: '8px' }}>
        <span className="section-label"></span>
        <label className={`checkbox-label${isCustom ? ' disabled' : ''}`}>
          <input
            type="checkbox"
            checked={usePretrained}
            onChange={(e) => setUsePretrained(e.target.checked)}
            disabled={isCustom}
          />
          Use pretrained parameters
          {tooltips.usePretrained && <HelpTooltip text={tooltips.usePretrained} />}
        </label>
      </div>
    </div>
  )
}
