import { useState, useRef, useEffect } from 'react'
import { HelpTooltip } from './HelpTooltip'

const PRETRAINED_HELP = "Chronos will use parameters from a model trained on all DepMap data, and only learn the specific parameters for your data. Highly recommended if you want to compare your data to DepMap."

export function LibrarySelect({ onFileSelect, onLibrarySelect, onPretrainedChange, helpText }) {
  const [libraries, setLibraries] = useState([])
  const [selection, setSelection] = useState(null) // null until libraries load
  const [usePretrained, setUsePretrained] = useState(true)
  const [file, setFile] = useState(null)
  const [format, setFormat] = useState('csv')
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
          // Default to TKOv3 if available, otherwise first library
          if (data.libraries.includes('TKOv3')) {
            setSelection('TKOv3')
          } else if (data.libraries.length > 0) {
            setSelection(data.libraries[0])
          } else {
            setSelection('Custom')
          }
        }
      } catch (err) {
        console.error('Failed to fetch libraries:', err)
        setSelection('Custom')
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
      if (file) {
        onFileSelect?.({ file, format, filename: file.name })
      } else {
        onFileSelect?.(null)
      }
    } else {
      // Using a built-in library - auto-check pretrained
      onFileSelect?.(null)
      onLibrarySelect?.(selection)
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
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={usePretrained}
            onChange={(e) => setUsePretrained(e.target.checked)}
          />
          Use pretrained parameters
          <HelpTooltip text={PRETRAINED_HELP} />
        </label>
      </div>
    </div>
  )
}
