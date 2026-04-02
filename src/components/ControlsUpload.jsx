import { useState, useRef } from 'react'
import { HelpTooltip } from './HelpTooltip'

export function ControlsUpload({ label, fileType, onFileSelect, optional = false, helpText }) {
  const [file, setFile] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleFile = (selectedFile) => {
    if (!selectedFile) return
    setFile(selectedFile)
    onFileSelect?.({ file: selectedFile, format: 'txt', filename: selectedFile.name })
  }

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
      <span className="section-label">
        {label}
        {optional && <span className="optional-tag">(optional)</span>}
        {helpText && <HelpTooltip text={helpText} />}
      </span>
      <div
        className={className}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{ marginTop: '0.5rem' }}
      >
        {displayText}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden-input"
        onChange={handleChange}
      />
    </div>
  )
}
