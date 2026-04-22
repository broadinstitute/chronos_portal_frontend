import { useState, useRef, useEffect } from 'react'
import { HelpTooltip } from './HelpTooltip'
import tooltips from '../tooltips.json'

const DEFAULT_FORMATS = ['csv', 'tsv']
const MATRIX_FORMATS = ['csv', 'tsv', 'hdf5']
const SEQUENCE_FORMATS = ['csv', 'tsv', 'hdf5', 'fastq', 'bam', 'sam']

// Maximum size for matrix format readcounts (10 MB)
const MAX_MATRIX_SIZE = 10 * 1024 * 1024

// Check if format is a matrix format (not raw sequencing)
const isMatrixFormat = (format) => ['csv', 'tsv', 'hdf5'].includes(format)

// Check if a file is compressed (zip/gz)
const isCompressed = (filename) => {
  const lower = filename.toLowerCase()
  return lower.endsWith('.zip') || lower.endsWith('.gz')
}

export function FileUpload({
  label,
  fileType,
  onFileSelect,
  optional = false,
  showFormatSelect = true,
  allowHdf5 = false,
  allowSequenceFormats = false,
  allowMultiple = false,
  helpText,
  initialValue = null,
}) {
  const formats = allowSequenceFormats
    ? SEQUENCE_FORMATS
    : allowHdf5
      ? MATRIX_FORMATS
      : DEFAULT_FORMATS

  // For multi-file mode, use array; for single-file, use single value
  const [files, setFiles] = useState(() => {
    if (!initialValue) return allowMultiple ? [] : null
    if (allowMultiple && initialValue.files) return initialValue.files
    if (!allowMultiple && initialValue.file) return initialValue.file
    return allowMultiple ? [] : null
  })
  const [format, setFormat] = useState(initialValue?.format || 'csv')
  const [isDragOver, setIsDragOver] = useState(false)
  const [sizeError, setSizeError] = useState(null)
  const inputRef = useRef(null)

  // Single file mode handler (backward compatible)
  const handleFile = (selectedFile) => {
    if (!selectedFile) return

    // Check size limit for matrix format readcounts
    if (allowSequenceFormats && isMatrixFormat(format) && selectedFile.size > MAX_MATRIX_SIZE) {
      setSizeError(`File exceeds 10 MB limit (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)`)
      return
    }
    setSizeError(null)

    if (allowMultiple) {
      handleFiles([selectedFile])
    } else {
      setFiles(selectedFile)
      onFileSelect?.({ file: selectedFile, format, filename: selectedFile.name })
    }
  }

  // Multi-file mode handler - appends to existing files
  const handleFiles = (newFiles) => {
    if (!newFiles || newFiles.length === 0) return
    const newFileArray = Array.from(newFiles)
    // Append new files to existing files (avoid duplicates by name)
    const existingNames = new Set((files || []).map((f) => f.name))
    const uniqueNewFiles = newFileArray.filter((f) => !existingNames.has(f.name))
    const combinedFiles = [...(files || []), ...uniqueNewFiles]
    setFiles(combinedFiles)
    const filenames = combinedFiles.map((f) => f.name)
    const hasCompressed = combinedFiles.some((f) => isCompressed(f.name))
    onFileSelect?.({
      files: combinedFiles,
      format,
      filenames,
      hasCompressed,
    })
  }

  // Remove a single file from multi-file list
  const handleRemoveFile = (index, e) => {
    e.stopPropagation()
    if (!allowMultiple) return
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    if (newFiles.length === 0) {
      onFileSelect?.(null)
    } else {
      const filenames = newFiles.map((f) => f.name)
      const hasCompressed = newFiles.some((f) => isCompressed(f.name))
      onFileSelect?.({
        files: newFiles,
        format,
        filenames,
        hasCompressed,
      })
    }
  }

  // Clear all files
  const handleClearAll = (e) => {
    e.stopPropagation()
    setFiles([])
    onFileSelect?.(null)
  }

  // Update parent when format changes for already-selected file(s)
  useEffect(() => {
    // Clear size error if switching to sequence format
    if (!isMatrixFormat(format)) {
      setSizeError(null)
    }

    if (allowMultiple && files && files.length > 0) {
      const filenames = files.map((f) => f.name)
      const hasCompressed = files.some((f) => isCompressed(f.name))
      onFileSelect?.({
        files,
        format,
        filenames,
        hasCompressed,
      })
    } else if (!allowMultiple && files) {
      onFileSelect?.({ file: files, format, filename: files.name })
    }
  }, [format])

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    if (allowMultiple) {
      handleFiles(e.dataTransfer.files)
    } else {
      handleFile(e.dataTransfer.files[0])
    }
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
    if (allowMultiple) {
      handleFiles(e.target.files)
    } else {
      handleFile(e.target.files[0])
    }
  }

  // Determine if we have files selected
  const hasFiles = allowMultiple
    ? files && files.length > 0
    : files !== null

  const className = `file-display${hasFiles ? ' has-file' : ''}${isDragOver ? ' dragover' : ''}`

  // Render file list for multi-file mode, or single filename for single-file mode
  const renderFileDisplay = () => {
    if (allowMultiple && files && files.length > 0) {
      return (
        <div className="file-list">
          <div className="file-list-header">
            <span className="file-count">{files.length} file{files.length > 1 ? 's' : ''}</span>
            {files.length > 1 && (
              <button
                type="button"
                className="file-clear-all-btn"
                onClick={handleClearAll}
                title="Clear all"
              >
                Clear all
              </button>
            )}
          </div>
          {files.map((f, index) => (
            <div key={index} className="file-list-item">
              <span className="file-list-name">{f.name}</span>
              <button
                type="button"
                className="file-remove-btn"
                onClick={(e) => handleRemoveFile(index, e)}
                title="Remove file"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )
    }
    if (!allowMultiple && files) {
      return files.name
    }
    return allowMultiple ? 'Click or drag to upload files' : 'Click or drag to upload'
  }

  // Render format select - categorized for sequence formats, simple for others
  const renderFormatSelect = () => {
    if (!showFormatSelect) return null

    if (allowSequenceFormats) {
      return (
        <select
          className="format-select format-select-full"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        >
          <optgroup label="Readcount matrix">
            <option value="csv">csv</option>
            <option value="tsv">tsv</option>
            <option value="hdf5">hdf5</option>
          </optgroup>
          <optgroup label="Raw sequencing reads">
            <option value="fastq">fastq</option>
            <option value="bam">bam</option>
            <option value="sam">sam</option>
          </optgroup>
        </select>
      )
    }

    return (
      <select
        className="format-select"
        value={format}
        onChange={(e) => setFormat(e.target.value)}
      >
        {formats.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
    )
  }

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
            {renderFileDisplay()}
          </div>
          {!allowSequenceFormats && renderFormatSelect()}
          <input
            ref={inputRef}
            type="file"
            className="hidden-input"
            onChange={handleChange}
            multiple={allowMultiple}
          />
        </div>
      </div>
      {allowSequenceFormats && (
        <div className="section-row format-row">
          <span className="section-label">
            File type
            {tooltips.readcountsFileType && <HelpTooltip text={tooltips.readcountsFileType} />}
          </span>
          {renderFormatSelect()}
        </div>
      )}
      {sizeError && (
        <div className="file-size-error">{sizeError}</div>
      )}
    </div>
  )
}
