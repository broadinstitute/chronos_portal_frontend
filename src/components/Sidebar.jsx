import { useState, useEffect } from 'react'

// Parse timestamp from job_id (format: {name}_{YYYYMMDD_HHMMSS})
function formatJobDate(jobId) {
  const match = jobId.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})$/)
  if (!match) return null
  const [, year, month, day, hour, minute] = match
  const date = new Date(year, month - 1, day, hour, minute)

  // Format: "Apr 17, 2:30 PM"
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }) + ', ' + date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function Sidebar({ onSelectJob }) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedJobs, setSelectedJobs] = useState(new Set())
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function fetchJobs() {
    try {
      const response = await fetch('/api/jobs')
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs)
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  const handleCheckboxChange = (jobId) => {
    setSelectedJobs((prev) => {
      const next = new Set(prev)
      if (next.has(jobId)) {
        next.delete(jobId)
      } else {
        next.add(jobId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedJobs.size === jobs.length) {
      setSelectedJobs(new Set())
    } else {
      setSelectedJobs(new Set(jobs.map((j) => j.job_id)))
    }
  }

  const handleDeleteClick = () => {
    if (selectedJobs.size > 0) {
      setShowConfirm(true)
    }
  }

  const handleConfirmDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch('/api/jobs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_ids: Array.from(selectedJobs) }),
      })

      if (response.ok) {
        setSelectedJobs(new Set())
        await fetchJobs()
      } else {
        const data = await response.json()
        console.error('Failed to delete jobs:', data.detail)
      }
    } catch (err) {
      console.error('Failed to delete jobs:', err)
    } finally {
      setDeleting(false)
      setShowConfirm(false)
    }
  }

  const handleCancelDelete = () => {
    setShowConfirm(false)
  }

  if (loading) {
    return (
      <aside className="sidebar">
        <h2>Previous Jobs</h2>
        <p className="sidebar-loading">Loading...</p>
      </aside>
    )
  }

  if (jobs.length === 0) {
    return (
      <aside className="sidebar">
        <h2>Previous Jobs</h2>
        <p className="sidebar-empty">No jobs yet</p>
      </aside>
    )
  }

  const allSelected = selectedJobs.size === jobs.length
  const someSelected = selectedJobs.size > 0

  return (
    <aside className="sidebar">
      <h2>Previous Jobs</h2>

      <div className="job-list-controls">
        <label className="select-all-label">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected && !allSelected
            }}
            onChange={handleSelectAll}
          />
          <span>{allSelected ? 'Deselect all' : 'Select all'}</span>
        </label>
        <button
          className="delete-jobs-button"
          onClick={handleDeleteClick}
          disabled={!someSelected}
        >
          Delete
        </button>
      </div>

      <ul className="job-list">
        {jobs.map((job) => {
          const dateStr = formatJobDate(job.job_id)
          return (
            <li key={job.job_id} className="job-list-row">
              <input
                type="checkbox"
                checked={selectedJobs.has(job.job_id)}
                onChange={() => handleCheckboxChange(job.job_id)}
                className="job-checkbox"
              />
              <button
                className="job-list-item"
                onClick={() => onSelectJob(job.job_id)}
              >
                <span className="job-title">{job.title}</span>
                {dateStr && <span className="job-date">{dateStr}</span>}
              </button>
            </li>
          )
        })}
      </ul>

      {showConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-dialog">
            <p>
              Delete {selectedJobs.size} job{selectedJobs.size > 1 ? 's' : ''}?
            </p>
            <p className="confirm-warning">This cannot be undone.</p>
            <div className="confirm-buttons">
              <button
                className="confirm-cancel"
                onClick={handleCancelDelete}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="confirm-delete"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
