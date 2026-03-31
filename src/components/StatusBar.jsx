export function StatusBar({ status, message }) {
  if (!status) return null

  return (
    <div className={`status-bar ${status}`}>
      {status === 'running' && <span className="spinner" />}
      {message}
    </div>
  )
}
