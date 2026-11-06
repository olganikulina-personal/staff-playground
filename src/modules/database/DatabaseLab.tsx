import { useMemo, useState } from "react";

import { DecisionQuestion } from "../../components/DecisionQuestion";
import { EventTimeline } from "../../components/EventTimeline";
import { ExplanationPanel } from "../../components/ExplanationPanel";
import { ParameterControls } from "../../components/ParameterControls";
import { ScenarioComparison } from "../../components/ScenarioComparison";
import { ArchitectureDiagram } from "../../components/ArchitectureDiagram";
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
  createDatabaseParameterFields,
  DATABASE_SCENARIO_LABELS,
  updateDatabaseParameters,
} from "./databaseLabControls";
import {
  DEFAULT_DATABASE_PARAMETERS,
  runDatabaseLabScenario,
  type DatabaseLabParameters,
  type DatabaseLabResult,
} from "./labRunner";

type DatabaseRun = RunSnapshot<DatabaseLabParameters, DatabaseLabResult>;
type DatabaseComparison = RunComparison<
  DatabaseLabParameters,
  DatabaseLabResult,
  readonly {
    label: string;
    left: string;
    right: string;
  }[]
>;

export function DatabaseLab() {
  const [parameters, setParameters] = useState(DEFAULT_DATABASE_PARAMETERS);
  const [prediction, setPrediction] = useState("");
  const [runs, setRuns] = useState<readonly DatabaseRun[]>([]);
  const [activeRun, setActiveRun] = useState<DatabaseRun | null>(null);
  const [comparison, setComparison] = useState<DatabaseComparison | null>(
    null,
  );
  const [selectedAnswer, setSelectedAnswer] = useState<string>();
  const [error, setError] = useState<string>();

  const fields = useMemo(
    () => createDatabaseParameterFields(parameters),
    [parameters],
  );
  const lastRun = runs.at(-1);
  const canCompare = runs.length >= 2;

  function runScenario() {
    try {
      const runResult = runDatabaseLabScenario(parameters);
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
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The scenario could not be executed.",
      );
    }
  }

  function handleParameterChange(fieldId: string, value: string) {
    setParameters((currentParameters) =>
      updateDatabaseParameters(currentParameters, fieldId, value),
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
    const resetState = resetScenario(DEFAULT_DATABASE_PARAMETERS);
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
    const differences = [
      {
        label: "Scenario",
        left: DATABASE_SCENARIO_LABELS[left.result.scenario],
        right: DATABASE_SCENARIO_LABELS[right.result.scenario],
      },
      {
        label: "Primary records by shard",
        left: JSON.stringify(left.result.summary.primaryRecordCountByShard),
        right: JSON.stringify(right.result.summary.primaryRecordCountByShard),
      },
      {
        label: "Event count",
        left: String(left.result.events.length),
        right: String(right.result.events.length),
      },
    ] as const;
    setComparison(
      compareRunSnapshots(left, right, {
        resultDiff: differences,
      }),
    );
  }

  const activeResult = activeRun?.result;

  return (
    <section className="lab-shell" aria-labelledby="database-lab-heading">
      <header className="lab-header">
        <div>
          <p className="eyebrow">Interactive concept simulator · Local</p>
          <h2 id="database-lab-heading">Database Architecture Lab</h2>
          <p>
            Predict first, change one mechanism, then observe how ownership,
            availability, consistency, and query shape affect the system.
          </p>
        </div>
        <span className="evidence-badge">Illustrative simulation</span>
      </header>

      <section className="prediction-panel" aria-labelledby="prediction-heading">
        <div>
          <p className="eyebrow">1 · Predict</p>
          <h2 id="prediction-heading">What do you expect to happen?</h2>
        </div>
        <label htmlFor="prediction">
          Predict the outcome before you run the scenario.
        </label>
        <textarea
          id="prediction"
          value={prediction}
          onChange={(event) => setPrediction(event.target.value)}
          placeholder="Example: a hot shard will receive more primary records..."
          rows={3}
        />
      </section>

      <div className="lab-grid">
        <aside className="lab-sidebar">
          <ParameterControls fields={fields} onChange={handleParameterChange} />
          <div className="action-group" aria-label="Scenario actions">
            <button type="button" className="primary-button" onClick={runScenario}>
              Run simulation
            </button>
            <button
              type="button"
              onClick={replayLastRun}
              disabled={!lastRun}
            >
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
            All values and outcomes are simulated. They are not database
            benchmarks or production guarantees.
          </p>
        </aside>

        <div className="lab-content">
          <ArchitectureDiagram
            topology={activeResult?.topology}
            highlightedNodeId={
              activeResult?.scenario === "node-failure"
                ? parameters.failedComputeNodeId
                : undefined
            }
          />
          <section className="lab-panel" aria-live="polite">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">3 · Observe</p>
                <h2>
                  {activeRun
                    ? `${DATABASE_SCENARIO_LABELS[activeRun.result.scenario]} · ${formatRunLabel(activeRun)}`
                    : "No active run"}
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
                Run the selected scenario to inspect its topology and
                consequences.
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

function formatRunLabel(run: DatabaseRun): string {
  const ordinal = run.runId.replace("run-", "Run ");
  const distribution =
    run.parameters.distribution === "hot"
      ? "Hot distribution"
      : "Even distribution";
  return `${ordinal} · ${distribution}`;
}
