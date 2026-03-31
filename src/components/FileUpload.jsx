import { useState, useRef } from 'react'

export function FileUpload({
  label,
  fileType,
  jobId,
  jobName,
  onUpload,
  optional = false,
  showFormatSelect = true,
}) {
  const [file, setFile] = useState(null)
  const [format, setFormat] = useState('csv')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef(null)

  const handleFile = async (selectedFile) => {
    if (!selectedFile) return

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

      const response = await fetch(`/api/upload/${fileType}`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || 'Upload failed')
      }

      onUpload?.(result)
    } catch (error) {
      alert(`Error uploading ${label}: ${error.message}`)
      setFile(null)
    } finally {
      setIsUploading(false)
    }
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

  const displayText = isUploading
    ? 'Uploading...'
    : file
    ? file.name
    : 'Click or drag to upload'

  const className = `file-display${file ? ' has-file' : ''}${isDragOver ? ' dragover' : ''}`

  return (
    <div className="section">
      <div className="section-row">
        <span className="section-label">
          {label}
          {optional && <span className="optional-tag">(optional)</span>}
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
    </div>
  )
}
