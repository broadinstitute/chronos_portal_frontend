function truncateError(message) {
  if (!message || message.length <= 400) return message
  return message.slice(0, 200) + '...' + message.slice(-200)
}

export function ErrorModal({ error, onClose }) {
  if (!error) return null

  return (
    <div className="error-modal" onClick={onClose}>
      <div className="error-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Error</h3>
        <p>{truncateError(error)}</p>
        <button onClick={onClose}>OK</button>
      </div>
    </div>
  )
}
