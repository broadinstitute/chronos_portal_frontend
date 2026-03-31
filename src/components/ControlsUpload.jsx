import { useState, useRef } from 'react'

export function ControlsUpload({ label, fileType, jobId, jobName, onUpload }) {
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleFile = async (selectedFile) => {
    if (!selectedFile) return

    setFile(selectedFile)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('file_format', 'txt')
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
      <span className="section-label">{label}</span>
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
