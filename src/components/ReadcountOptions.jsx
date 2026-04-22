import { useState, useEffect } from 'react'
import { HelpTooltip } from './HelpTooltip'
import tooltips from '../tooltips.json'

// Validate DNA sequence (uppercase only: C, A, G, T)
const isValidPrefix = (str) => /^[CAGT]*$/.test(str)

// Validate template sequence (C, A, G, T, c, a, g, t, N, n)
const isValidTemplate = (str) => /^[CAGTcagtnN]*$/.test(str)

// Parse integer or return null
const parseIntOrNull = (str) => {
  if (str === '' || str === null || str === undefined) return null
  const num = parseInt(str, 10)
  return isNaN(num) ? null : num
}

// Sub-component for "How to find..." options
function FindMethodOptions({ label, prefix, value, onChange, helpKey }) {
  const method = value.method || 'fixed'
  const helpText = helpKey && tooltips.readcountOptions[helpKey]

  const handleMethodChange = (newMethod) => {
    // Reset options when method changes
    const defaults = {
      method: newMethod,
      start: newMethod === 'fixed' ? 0 : null,
      end: null,
      prefix: null,
      template: null,
      searchAfter: null,
      startsBefore: null,
    }
    onChange(defaults)
  }

  const handleFieldChange = (field, val) => {
    onChange({ ...value, [field]: val })
  }

  return (
    <div className="find-method-section">
      <div className="find-method-row">
        <span className="find-method-label">
          {label}
          {helpText && <HelpTooltip text={helpText} />}
        </span>
        <select
          className="format-select"
          value={method}
          onChange={(e) => handleMethodChange(e.target.value)}
        >
          <option value="fixed">Fixed Location</option>
          <option value="prefix">Search Prefix</option>
          <option value="template">Template</option>
        </select>
      </div>

      {method === 'fixed' && (
        <div className="find-method-inputs">
          <label className="inline-input-group">
            <span>Start</span>
            <input
              type="number"
              min="0"
              value={value.start ?? 0}
              onChange={(e) => handleFieldChange('start', parseIntOrNull(e.target.value) ?? 0)}
              className="number-input"
              required
            />
          </label>
          <label className="inline-input-group">
            <span>End <span className="optional-tag">(optional)</span></span>
            <input
              type="number"
              min="0"
              value={value.end ?? ''}
              onChange={(e) => handleFieldChange('end', parseIntOrNull(e.target.value))}
              className="number-input"
              placeholder="null"
            />
          </label>
        </div>
      )}

      {method === 'prefix' && (
        <div className="find-method-inputs">
          <label className="inline-input-group">
            <span>Prefix</span>
            <input
              type="text"
              value={value.prefix ?? ''}
              onChange={(e) => {
                const upper = e.target.value.toUpperCase()
                if (isValidPrefix(upper)) {
                  handleFieldChange('prefix', upper)
                }
              }}
              className={`text-input ${value.prefix && !isValidPrefix(value.prefix) ? 'invalid' : ''}`}
              placeholder="CAGT only"
              required
            />
          </label>
          <label className="inline-input-group">
            <span>Search After <span className="optional-tag">(optional)</span></span>
            <input
              type="number"
              min="0"
              value={value.searchAfter ?? ''}
              onChange={(e) => handleFieldChange('searchAfter', parseIntOrNull(e.target.value))}
              className="number-input"
            />
          </label>
          <label className="inline-input-group">
            <span>Starts Before <span className="optional-tag">(optional)</span></span>
            <input
              type="number"
              min="0"
              value={value.startsBefore ?? ''}
              onChange={(e) => handleFieldChange('startsBefore', parseIntOrNull(e.target.value))}
              className="number-input"
            />
          </label>
        </div>
      )}

      {method === 'template' && (
        <div className="find-method-inputs">
          <label className="inline-input-group">
            <span>Template Sequence</span>
            <input
              type="text"
              value={value.template ?? ''}
              onChange={(e) => {
                if (isValidTemplate(e.target.value)) {
                  handleFieldChange('template', e.target.value)
                }
              }}
              className={`text-input ${value.template && !isValidTemplate(value.template) ? 'invalid' : ''}`}
              placeholder="CAGTcagtnN"
              required
            />
          </label>
          <label className="inline-input-group">
            <span>Search After <span className="optional-tag">(optional)</span></span>
            <input
              type="number"
              min="0"
              value={value.searchAfter ?? ''}
              onChange={(e) => handleFieldChange('searchAfter', parseIntOrNull(e.target.value))}
              className="number-input"
            />
          </label>
          <label className="inline-input-group">
            <span>Starts Before <span className="optional-tag">(optional)</span></span>
            <input
              type="number"
              min="0"
              value={value.startsBefore ?? ''}
              onChange={(e) => handleFieldChange('startsBefore', parseIntOrNull(e.target.value))}
              className="number-input"
            />
          </label>
        </div>
      )}
    </div>
  )
}

// Default state for find method options
const defaultFindMethod = () => ({
  method: 'fixed',
  start: 0,
  end: null,
  prefix: null,
  template: null,
  searchAfter: null,
  startsBefore: null,
})

export function ReadcountOptions({ filenames = [], hasCompressed = false, onChange, compact = false }) {
  // Show file assignments when there are multiple files
  const showFileAssignments = filenames.length > 1

  // File assignments: { filename: 'both' | 'sgrna' | 'sample' }
  const [fileAssignments, setFileAssignments] = useState(() => {
    const assignments = {}
    filenames.forEach((name) => {
      assignments[name] = 'both'
    })
    return assignments
  })

  // Legacy state for backward compatibility (kept but not actively used)
  const [sampleBarcodeFile, setSampleBarcodeFile] = useState(null)
  const [sgrnaBarcodeFile, setSgrnaBarcodeFile] = useState(null)
  const [readType, setReadType] = useState('single')
  const [alreadyDeconvoluted, setAlreadyDeconvoluted] = useState(false)
  const [sgrnaOptions, setSgrnaOptions] = useState(defaultFindMethod())
  const [sampleOptions, setSampleOptions] = useState(defaultFindMethod())
  const [sgrnaReversedOptions, setSgrnaReversedOptions] = useState(defaultFindMethod())
  const [countAmbiguous, setCountAmbiguous] = useState(false)
  const [errorIfTooShort, setErrorIfTooShort] = useState(true)

  // Check if all visible find methods are "fixed" (allows unchecking errorIfTooShort)
  const allMethodsFixed = () => {
    const sgrnaFixed = sgrnaOptions.method === 'fixed'
    const sampleFixed = alreadyDeconvoluted || sampleOptions.method === 'fixed'
    const reverseFixed = readType === 'single' || sgrnaReversedOptions.method === 'fixed'
    return sgrnaFixed && sampleFixed && reverseFixed
  }

  const canUncheckErrorIfTooShort = allMethodsFixed()

  // Update file assignments when filenames change
  useEffect(() => {
    const defaultValue = readType === 'paired' ? 'all' : 'both'
    setFileAssignments((prev) => {
      const updated = {}
      filenames.forEach((name) => {
        updated[name] = prev[name] || defaultValue
      })
      return updated
    })
  }, [filenames.join(',')])

  // Reset file assignments when readType changes
  useEffect(() => {
    const defaultValue = readType === 'paired' ? 'all' : 'both'
    setFileAssignments((prev) => {
      const reset = {}
      Object.keys(prev).forEach((name) => {
        reset[name] = defaultValue
      })
      return reset
    })
  }, [readType])

  // Get assignment options based on read type and deconvolution state
  const getAssignmentOptions = () => {
    if (readType === 'paired') {
      const options = [
        { value: 'all', label: 'All' },
        { value: 'sgrna', label: 'sgRNA reads' },
        { value: 'sgrna_reversed', label: 'sgRNA reads Reversed' },
      ]
      if (!alreadyDeconvoluted) {
        options.push({ value: 'sample', label: 'Sample' })
      }
      return options
    }
    const options = [
      { value: 'both', label: 'Both' },
      { value: 'sgrna', label: 'sgRNA reads' },
    ]
    if (!alreadyDeconvoluted) {
      options.push({ value: 'sample', label: 'Sample reads' })
    }
    return options
  }

  const handleFileAssignmentChange = (filename, assignment) => {
    setFileAssignments((prev) => ({
      ...prev,
      [filename]: assignment,
    }))
  }

  // Reset sample-related options when alreadyDeconvoluted is checked
  useEffect(() => {
    if (alreadyDeconvoluted) {
      setSampleOptions(defaultFindMethod())
      // Reset any "sample" file assignments to the default
      const defaultValue = readType === 'paired' ? 'all' : 'both'
      setFileAssignments((prev) => {
        const updated = { ...prev }
        let changed = false
        Object.keys(updated).forEach((name) => {
          if (updated[name] === 'sample') {
            updated[name] = defaultValue
            changed = true
          }
        })
        return changed ? updated : prev
      })
    }
  }, [alreadyDeconvoluted, readType])

  // Notify parent of changes
  useEffect(() => {
    const options = {
      fileAssignments: showFileAssignments ? fileAssignments : null,
      readType,
      alreadyDeconvoluted,
      sgrnaFindMethod: sgrnaOptions.method,
      sgrnaStart: sgrnaOptions.start,
      sgrnaEnd: sgrnaOptions.end,
      sgrnaPrefix: sgrnaOptions.prefix,
      sgrnaTemplate: sgrnaOptions.template,
      sgrnaSearchAfter: sgrnaOptions.searchAfter,
      sgrnaStartsBefore: sgrnaOptions.startsBefore,
      countAmbiguous,
      errorIfTooShort,
    }

    // Add sample barcode options only when not already deconvoluted
    if (!alreadyDeconvoluted) {
      options.sampleFindMethod = sampleOptions.method
      options.sampleStart = sampleOptions.start
      options.sampleEnd = sampleOptions.end
      options.samplePrefix = sampleOptions.prefix
      options.sampleTemplate = sampleOptions.template
      options.sampleSearchAfter = sampleOptions.searchAfter
      options.sampleStartsBefore = sampleOptions.startsBefore
    }

    // Add sgRNA reversed read options only when paired
    if (readType === 'paired') {
      options.sgrnaReversedFindMethod = sgrnaReversedOptions.method
      options.sgrnaReversedStart = sgrnaReversedOptions.start
      options.sgrnaReversedEnd = sgrnaReversedOptions.end
      options.sgrnaReversedPrefix = sgrnaReversedOptions.prefix
      options.sgrnaReversedTemplate = sgrnaReversedOptions.template
      options.sgrnaReversedSearchAfter = sgrnaReversedOptions.searchAfter
      options.sgrnaReversedStartsBefore = sgrnaReversedOptions.startsBefore
    }

    onChange?.(options)
  }, [
    fileAssignments,
    readType,
    alreadyDeconvoluted,
    sgrnaOptions,
    sampleOptions,
    sgrnaReversedOptions,
    countAmbiguous,
    errorIfTooShort,
    showFileAssignments,
  ])

  // If user sets a non-fixed method, force errorIfTooShort to true
  useEffect(() => {
    if (!canUncheckErrorIfTooShort && !errorIfTooShort) {
      setErrorIfTooShort(true)
    }
  }, [canUncheckErrorIfTooShort])

  return (
    <div className={`readcount-options ${compact ? 'readcount-options-compact' : ''}`}>
      <div className="read-type-row">
        <div className="inline-input-group">
          <span>
            Read type
            {tooltips.readcountOptions.readType && <HelpTooltip text={tooltips.readcountOptions.readType} />}
          </span>
          <select
            className="format-select"
            value={readType}
            onChange={(e) => setReadType(e.target.value)}
          >
            <option value="single">Single</option>
            <option value="paired">Paired</option>
          </select>
        </div>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={alreadyDeconvoluted}
            onChange={(e) => setAlreadyDeconvoluted(e.target.checked)}
          />
          Already deconvoluted
          {tooltips.readcountOptions.alreadyDeconvoluted && <HelpTooltip text={tooltips.readcountOptions.alreadyDeconvoluted} />}
        </label>
      </div>

      {showFileAssignments && (
        <div className="file-assignments">
          <div className="file-assignments-header">
            File assignments
            {tooltips.readcountOptions.fileAssignments && <HelpTooltip text={tooltips.readcountOptions.fileAssignments} />}
          </div>
          {filenames.map((name) => (
            <div key={name} className="file-assignment-row">
              <span className="file-assignment-name" title={name}>{name}</span>
              <select
                className="format-select"
                value={fileAssignments[name] || (readType === 'paired' ? 'all' : 'both')}
                onChange={(e) => handleFileAssignmentChange(name, e.target.value)}
              >
                {getAssignmentOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      <FindMethodOptions
        label="How to find sgRNA barcodes in reads"
        prefix="sgrna"
        value={sgrnaOptions}
        onChange={setSgrnaOptions}
        helpKey="sgrnaFindMethod"
      />

      {!alreadyDeconvoluted && (
        <FindMethodOptions
          label="How to find sample barcodes in reads"
          prefix="sample"
          value={sampleOptions}
          onChange={setSampleOptions}
          helpKey="sampleFindMethod"
        />
      )}

      {readType === 'paired' && (
        <FindMethodOptions
          label="How to find sgRNA barcodes in reverse reads"
          prefix="sgrnaReversed"
          value={sgrnaReversedOptions}
          onChange={setSgrnaReversedOptions}
          helpKey="sgrnaReversedFindMethod"
        />
      )}

      <div className="checkbox-options">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={countAmbiguous}
            onChange={(e) => setCountAmbiguous(e.target.checked)}
          />
          Count Ambiguous
          {tooltips.readcountOptions.countAmbiguous && <HelpTooltip text={tooltips.readcountOptions.countAmbiguous} />}
        </label>

        <label className={`checkbox-label ${!canUncheckErrorIfTooShort ? 'disabled' : ''}`}>
          <input
            type="checkbox"
            checked={errorIfTooShort}
            onChange={(e) => setErrorIfTooShort(e.target.checked)}
            disabled={!canUncheckErrorIfTooShort}
          />
          Error if reads are too short
          {tooltips.readcountOptions.errorIfTooShort && <HelpTooltip text={tooltips.readcountOptions.errorIfTooShort} />}
          {!canUncheckErrorIfTooShort && (
            <span className="checkbox-hint">(requires all methods to be Fixed Location)</span>
          )}
        </label>
      </div>
    </div>
  )
}
