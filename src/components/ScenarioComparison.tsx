interface ScenarioDifference {
  readonly label: string;
  readonly left: string;
  readonly right: string;
}

interface ScenarioComparisonProps {
  readonly leftLabel: string;
  readonly rightLabel: string;
  readonly differences: readonly ScenarioDifference[];
}

export function ScenarioComparison({
  leftLabel,
  rightLabel,
  differences,
}: ScenarioComparisonProps) {
  return (
    <section className="lab-panel" aria-labelledby="comparison-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Compare</p>
          <h2 id="comparison-heading">Run comparison</h2>
        </div>
        <span className="evidence-badge">Immutable snapshots</span>
      </div>
      <div className="comparison-table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Observation</th>
              <th scope="col">{leftLabel}</th>
              <th scope="col">{rightLabel}</th>
            </tr>
          </thead>
          <tbody>
            {differences.map((difference) => (
              <tr key={difference.label}>
                <th scope="row">{difference.label}</th>
                <td>{difference.left}</td>
                <td>{difference.right}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
