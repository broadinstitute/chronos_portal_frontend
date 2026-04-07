import { HelpTooltip } from './HelpTooltip'

export function CompareInput({ condition1, condition2, onChange, helpText }) {
  // Show error if one condition is filled but not the other
  const hasPartialInput = (condition1 && !condition2) || (!condition1 && condition2)

  return (
    <div className="section compare-section">
      <div className="section-row">
        <span className="section-label">
          Compare
          <span className="optional-tag">(optional)</span>
          {helpText && <HelpTooltip text={helpText} />}
        </span>
        <input
          type="text"
          className={`compare-input${hasPartialInput ? ' input-error' : ''}`}
          placeholder="Condition 1"
          value={condition1}
          onChange={(e) => onChange(e.target.value, condition2)}
        />
        <span className="compare-with">with</span>
        <input
          type="text"
          className={`compare-input${hasPartialInput ? ' input-error' : ''}`}
          placeholder="Condition 2"
          value={condition2}
          onChange={(e) => onChange(condition1, e.target.value)}
        />
      </div>
      {hasPartialInput && (
        <div className="section-row" style={{ marginTop: '4px' }}>
          <span className="section-label"></span>
          <span className="input-error-message">Both conditions must be specified for comparison</span>
        </div>
      )}
    </div>
  )
}

// Export validation helper
export function isCompareValid(condition1, condition2) {
  // Valid if both empty OR both filled
  return (!condition1 && !condition2) || (condition1 && condition2)
}
