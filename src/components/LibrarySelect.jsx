import { useState, useRef, useEffect } from 'react'

export function LibrarySelect({ onFileSelect }) {
  const [selection, setSelection] = useState('Custom')
  const [file, setFile] = useState(null)
  const [format, setFormat] = useState('csv')
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef(null)

  const isCustom = selection === 'Custom'

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
    : 'Using preset library'

  const className = `file-display${file && isCustom ? ' has-file' : ''}${isDragOver ? ' dragover' : ''}${!isCustom ? ' disabled' : ''}`

  return (
    <div className="section">
      <div className="section-row">
        <span className="section-label">sgRNA library</span>
        <div className="file-input-wrapper">
          <select
            className="format-select"
            value={selection}
            onChange={(e) => setSelection(e.target.value)}
            style={{ minWidth: '100px' }}
          >
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
          <select
            className="format-select"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            disabled={!isCustom}
          >
            <option value="csv">csv</option>
            <option value="tsv">tsv</option>
          </select>
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
