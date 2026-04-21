/**
 * ActionSection - Expandable action section for the sidebar
 *
 * Props:
 * - title: string - Display title for the action
 * - expanded: boolean - Whether the section is currently expanded
 * - onToggle: () => void - Callback when header is clicked
 * - status: 'pending' | 'ready' | 'running' | 'complete' - Action status
 * - disabled: boolean - Whether the action is disabled
 * - children: ReactNode - Content to show when expanded
 */

// Status icons as inline SVGs
const StatusIcon = ({ status }) => {
  if (status === 'running') {
    return <span className="action-status-icon running" />
  }

  if (status === 'complete') {
    return (
      <svg className="action-status-icon complete" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    )
  }

  if (status === 'pending') {
    return (
      <svg className="action-status-icon pending" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
      </svg>
    )
  }

  // ready
  return (
    <svg className="action-status-icon ready" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
    </svg>
  )
}

const ChevronIcon = ({ expanded }) => (
  <svg
    className={`action-chevron ${expanded ? 'expanded' : ''}`}
    viewBox="0 0 20 20"
    fill="currentColor"
    width="16"
    height="16"
  >
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
)

export function ActionSection({
  title,
  expanded = false,
  onToggle,
  status = 'ready',
  disabled = false,
  children
}) {
  const handleClick = () => {
    if (!disabled) {
      onToggle?.()
    }
  }

  return (
    <div className={`action-section ${expanded ? 'expanded' : ''} ${disabled ? 'disabled' : ''}`}>
      <div
        className={`action-section-header ${disabled ? 'disabled' : ''}`}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        <div className="action-section-title">
          <StatusIcon status={status} />
          <span>{title}</span>
        </div>
        <ChevronIcon expanded={expanded} />
      </div>

      {expanded && (
        <div className="action-section-content">
          {children}
        </div>
      )}
    </div>
  )
}
