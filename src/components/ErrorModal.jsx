export function ErrorModal({ error, onClose }) {
  if (!error) return null

  return (
    <div className="error-modal" onClick={onClose}>
      <div className="error-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={onClose}>OK</button>
      </div>
    </div>
  )
}
