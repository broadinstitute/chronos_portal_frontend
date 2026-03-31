import { useState, useRef } from 'react'

export function LibrarySelect({ jobId, jobName, onUpload }) {
  const [selection, setSelection] = useState('Custom')
  const [file, setFile] = useState(null)
  const [format, setFormat] = useState('csv')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef(null)

  const isCustom = selection === 'Custom'

  const handleFile = async (selectedFile) => {
    if (!selectedFile || !isCustom) return

    setFile(selectedFile)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('file_format', format)
      if (jobId) {
        formData.append('job_id', jobId)
      }
      if (jobName) {
        formData.append('job_name', jobName)
      }

      const response = await fetch('/api/upload/guide_map', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || 'Upload failed')
      }

      onUpload?.(result)
    } catch (error) {
      alert(`Error uploading library: ${error.message}`)
      setFile(null)
    } finally {
      setIsUploading(false)
    }
  }

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

  const displayText = isUploading
    ? 'Uploading...'
    : file && isCustom
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
