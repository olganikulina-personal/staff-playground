import { useMemo, useState } from "react";

import { DecisionQuestion } from "../../components/DecisionQuestion";
import { EventTimeline } from "../../components/EventTimeline";
import { ExplanationPanel } from "../../components/ExplanationPanel";
import { ParameterControls } from "../../components/ParameterControls";
import { ScenarioComparison } from "../../components/ScenarioComparison";
import {
  compareRunSnapshots,
  createRunSnapshot,
  replayRunSnapshot,
  resetScenario,
} from "../../simulations/lifecycle";
import type {
  RunComparison,
  RunSnapshot,
} from "../../simulations/types";
import {
  createDistributedParameterFields,
  updateDistributedParameters,
} from "./distributedCorrectnessControls";
import {
  DEFAULT_DISTRIBUTED_PARAMETERS,
  runDistributedCorrectnessScenario,
  type DistributedLabParameters,
  type DistributedLabResult,
} from "./labRunner";

type DistributedRun = RunSnapshot<
  DistributedLabParameters,
  DistributedLabResult
>;
type DistributedComparison = RunComparison<
  DistributedLabParameters,
  DistributedLabResult,
  readonly {
    label: string;
    left: string;
    right: string;
  }[]
>;

export function DistributedCorrectnessLab() {
  const [parameters, setParameters] = useState(DEFAULT_DISTRIBUTED_PARAMETERS);
  const [prediction, setPrediction] = useState("");
  const [runs, setRuns] = useState<readonly DistributedRun[]>([]);
  const [activeRun, setActiveRun] = useState<DistributedRun | null>(null);
  const [comparison, setComparison] = useState<DistributedComparison | null>(
    null,
  );
  const [selectedAnswer, setSelectedAnswer] = useState<string>();
  const [error, setError] = useState<string>();

  const fields = useMemo(
    () => createDistributedParameterFields(parameters),
    [parameters],
  );
  const lastRun = runs.at(-1);
  const canCompare = runs.length >= 2;

  function runScenario() {
    const runResult = runDistributedCorrectnessScenario(parameters);
    if (!runResult.ok) {
      setError(runResult.error);
      return;
    }

    const snapshot = createRunSnapshot({
      runId: `run-${runs.length + 1}`,
      scenarioId: parameters.scenario,
      seed: parameters.seed,
      parameters,
      result: runResult.result,
      events: runResult.result.events,
      explanations: runResult.result.explanations,
      decisionQuestion: runResult.result.decisionQuestion,
    });
    setRuns((currentRuns) => [...currentRuns, snapshot]);
    setActiveRun(snapshot);
    setComparison(null);
    setSelectedAnswer(undefined);
    setError(undefined);
  }

  function handleParameterChange(fieldId: string, value: string) {
    setParameters((currentParameters) =>
      updateDistributedParameters(currentParameters, fieldId, value),
    );
    setComparison(null);
  }

  function replayLastRun() {
    if (!lastRun) return;
    setActiveRun(replayRunSnapshot(lastRun).snapshot);
    setComparison(null);
    setError(undefined);
  }

  function reset() {
    const resetState = resetScenario(DEFAULT_DISTRIBUTED_PARAMETERS);
    setParameters(resetState.parameters);
    setActiveRun(null);
    setComparison(null);
    setSelectedAnswer(undefined);
    setPrediction("");
    setError(undefined);
  }

  function compareRuns() {
    if (runs.length < 2) return;
    const left = runs[runs.length - 2];
    const right = runs[runs.length - 1];
    const labels = new Set([
      ...left.result.observations.map((observation) => observation.label),
      ...right.result.observations.map((observation) => observation.label),
    ]);
    const differences = [...labels].sort().map((label) => ({
      label,
      left:
        left.result.observations.find(
          (observation) => observation.label === label,
        )?.value ?? "—",
      right:
        right.result.observations.find(
          (observation) => observation.label === label,
        )?.value ?? "—",
    }));

    setComparison(
      compareRunSnapshots(left, right, {
        resultDiff: differences,
      }),
    );
  }

  const activeResult = activeRun?.result;

  return (
    <section
      className="lab-shell"
      aria-labelledby="distributed-correctness-heading"
    >
      <header className="lab-header">
        <div>
          <p className="eyebrow">Interactive concept simulator · Local</p>
          <h2 id="distributed-correctness-heading">
            Distributed Correctness Lab
          </h2>
          <p>
            Make ambiguous outcomes, retries, duplicate effects, delivery, and
            reconciliation visible before choosing a recovery mechanism.
          </p>
        </div>
        <span className="evidence-badge">Illustrative simulation</span>
      </header>

      <section className="prediction-panel" aria-labelledby="prediction-heading">
        <div>
          <p className="eyebrow">1 · Predict</p>
          <h2 id="prediction-heading">What do you expect to happen?</h2>
        </div>
        <label htmlFor="distributed-prediction">
          Predict the outcome before you run the scenario.
        </label>
        <textarea
          id="distributed-prediction"
          value={prediction}
          onChange={(event) => setPrediction(event.target.value)}
          placeholder="Example: a retry may repeat a committed effect..."
          rows={3}
        />
      </section>

      <div className="lab-grid">
        <aside className="lab-sidebar">
          <ParameterControls
            fields={fields}
            onChange={handleParameterChange}
          />
          <div className="action-group" aria-label="Scenario actions">
            <button type="button" className="primary-button" onClick={runScenario}>
              Run simulation
            </button>
            <button type="button" onClick={replayLastRun} disabled={!lastRun}>
              Replay last run
            </button>
            <button type="button" onClick={reset}>
              Reset scenario
            </button>
            <button type="button" onClick={compareRuns} disabled={!canCompare}>
              Compare runs
            </button>
          </div>
          {error ? (
            <p className="error-message" role="alert">
              {error}
            </p>
          ) : null}
          <p className="sidebar-note">
            All values and outcomes are simulated. They are not reliability
            benchmarks or production guarantees.
          </p>
        </aside>

        <div className="lab-content">
          <section className="lab-panel" aria-live="polite">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">3 · Observe</p>
                <h2>
                  {activeRun ? formatRunLabel(activeRun) : "No active run"}
                </h2>
              </div>
              <span className="evidence-badge">
                {activeRun ? "Simulated result" : "Waiting for run"}
              </span>
            </div>
            {activeResult ? (
              <div className="observation-grid">
                {activeResult.observations.map((observation) => (
                  <div className="observation-card" key={observation.label}>
                    <span>{observation.label}</span>
                    <strong>{observation.value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">
                Run the selected scenario to inspect client observations,
                server state, and business effects.
              </p>
            )}
          </section>
          <EventTimeline events={activeResult?.events ?? []} />
          <ExplanationPanel explanations={activeResult?.explanations ?? []} />
          {activeResult ? (
            <DecisionQuestion
              question={activeResult.decisionQuestion}
              selectedOption={selectedAnswer}
              onSelect={setSelectedAnswer}
            />
          ) : null}
          {comparison ? (
            <ScenarioComparison
              leftLabel={formatRunLabel(comparison.left)}
              rightLabel={formatRunLabel(comparison.right)}
              differences={comparison.resultDiff}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function formatRunLabel(run: DistributedRun): string {
  return `${run.runId.replace("run-", "Run ")} · ${run.result.scenarioLabel}`;
}
