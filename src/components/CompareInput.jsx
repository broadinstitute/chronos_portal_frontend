export function CompareInput({ condition1, condition2, onChange }) {
  return (
    <div className="section compare-section">
      <div className="section-row">
        <span className="section-label">
          Compare
          <span className="optional-tag">(optional)</span>
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
