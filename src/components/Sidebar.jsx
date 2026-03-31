import { useState, useEffect } from 'react'

export function Sidebar({ onSelectJob }) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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

    fetchJobs()
  }, [])

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
        <p className="sidebar-empty">No completed jobs</p>
      </aside>
    )
  }

  return (
    <aside className="sidebar">
      <h2>Previous Jobs</h2>
      <ul className="job-list">
        {jobs.map((job) => (
          <li key={job.job_id}>
            <button
              className="job-list-item"
              onClick={() => onSelectJob(job.job_id)}
            >
              {job.title}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
