import { HelpTooltip } from './HelpTooltip'

export function CompareInput({ condition1, condition2, onChange, helpText }) {
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
          className="compare-input"
          placeholder="Condition 1"
          value={condition1}
          onChange={(e) => onChange(e.target.value, condition2)}
        />
        <span className="compare-with">with</span>
        <input
          type="text"
          className="compare-input"
          placeholder="Condition 2"
          value={condition2}
          onChange={(e) => onChange(condition1, e.target.value)}
        />
      </div>
    </div>
  )
}
