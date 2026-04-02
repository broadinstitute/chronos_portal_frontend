import { useState, useRef, useEffect } from 'react'
import { HelpTooltip } from './HelpTooltip'

const DEFAULT_FORMATS = ['csv', 'tsv']
const MATRIX_FORMATS = ['csv', 'tsv', 'hdf5']

export function FileUpload({
  label,
  fileType,
  onFileSelect,
  optional = false,
  showFormatSelect = true,
  allowHdf5 = false,
  helpText,
}) {
  const formats = allowHdf5 ? MATRIX_FORMATS : DEFAULT_FORMATS
  const [file, setFile] = useState(null)
  const [format, setFormat] = useState('csv')
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleFile = (selectedFile) => {
    if (!selectedFile) return
    setFile(selectedFile)
    onFileSelect?.({ file: selectedFile, format, filename: selectedFile.name })
  }

  // Update parent when format changes for already-selected file
  useEffect(() => {
    if (file) {
      onFileSelect?.({ file, format, filename: file.name })
    }
  }, [format])

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    handleFile(droppedFile)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = (e) => {
    handleFile(e.target.files[0])
  }

  const displayText = file ? file.name : 'Click or drag to upload'

  const className = `file-display${file ? ' has-file' : ''}${isDragOver ? ' dragover' : ''}`

  return (
    <div className="section">
      <div className="section-row">
        <span className="section-label">
          {label}
          {optional && <span className="optional-tag">(optional)</span>}
          {helpText && <HelpTooltip text={helpText} />}
        </span>
        <div className="file-input-wrapper">
          <div
            className={className}
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {displayText}
          </div>
          {showFormatSelect && (
            <select
              className="format-select"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              {formats.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
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
    </div>
  )
}
