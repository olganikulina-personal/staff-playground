import type { Explanation } from "../simulations/types";

interface ExplanationPanelProps {
  readonly explanations: readonly Explanation[];
}

export function ExplanationPanel({ explanations }: ExplanationPanelProps) {
  return (
    <section className="lab-panel" aria-labelledby="explanation-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Explain</p>
          <h2 id="explanation-heading">What the result means</h2>
        </div>
        <span className="evidence-badge">Teaching model</span>
      </div>
      {explanations.length === 0 ? (
        <p className="empty-state">
          Run a scenario to connect observations to mechanisms.
        </p>
      ) : (
        <div className="explanation-list">
          {explanations.map((explanation) => (
            <article key={explanation.title}>
              <h3>{explanation.title}</h3>
              <dl>
                <div>
                  <dt>Mechanism</dt>
                  <dd>{explanation.mechanism}</dd>
                </div>
                <div>
                  <dt>Trade-off</dt>
                  <dd>{explanation.tradeoff}</dd>
                </div>
                <div>
                  <dt>Failure mode</dt>
                  <dd>{explanation.failureMode}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
