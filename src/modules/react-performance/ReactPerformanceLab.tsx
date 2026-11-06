import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";

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
import type { RunComparison, RunSnapshot, TimelineEvent } from "../../simulations/types";
import {
  createReactPerformanceParameterFields,
  updateReactPerformanceParameters,
} from "./reactPerformanceControls";
import {
  DEFAULT_REACT_PERFORMANCE_PARAMETERS,
  runReactPerformanceScenario,
  type ReactPerformanceLabParameters,
  type ReactPerformanceLabResult,
} from "./labRunner";
import {
  createMeasurementBuffer,
  finalizeMeasurementBuffer,
  recordEvidence,
  type MutableMeasurementBuffer,
} from "./measurement/buffer";
import { DerivedComputationProbe } from "./measurement/computation";
import { RenderPropagationProbe } from "./measurement/rendering";
import {
  measureInputDelay,
  measureInteractionLatency,
  measureMainThreadTask,
  observeLongTasks,
} from "./measurement/responsiveness";
import { runWorkerMeasurement } from "./measurement/worker";
import {
  runDeterministicWorkload,
  validatePerformanceWorkload,
} from "./measurement/workloads";

type ReactPerformanceRun = RunSnapshot<
  ReactPerformanceLabParameters,
  ReactPerformanceLabResult
>;
type ReactPerformanceComparison = RunComparison<
  ReactPerformanceLabParameters,
  ReactPerformanceLabResult,
  readonly { label: string; left: string; right: string }[]
>;

interface MeasurementSession {
  readonly id: number;
  readonly buffer: MutableMeasurementBuffer;
  readonly parameters: ReactPerformanceLabParameters;
}

export function ReactPerformanceLab() {
  const [parameters, setParameters] = useState(
    DEFAULT_REACT_PERFORMANCE_PARAMETERS,
  );
  const [prediction, setPrediction] = useState("");
  const [runs, setRuns] = useState<readonly ReactPerformanceRun[]>([]);
  const [activeRun, setActiveRun] = useState<ReactPerformanceRun | null>(null);
  const [comparison, setComparison] =
    useState<ReactPerformanceComparison | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>();
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<"idle" | "measuring" | "complete">(
    "idle",
  );
  const [replayNotice, setReplayNotice] = useState(false);
  const [measurementSession, setMeasurementSession] =
    useState<MeasurementSession | null>(null);
  const sessionIdRef = useRef(0);

  const fields = useMemo(
    () => createReactPerformanceParameterFields(parameters),
    [parameters],
  );
  const lastRun = runs.at(-1);
  const canCompare = runs.length >= 2;

  const publishSession = useCallback(
    (
      session: MeasurementSession,
      extraEvidence: readonly Parameters<typeof recordEvidence>[1][] = [],
      events: readonly TimelineEvent[] = [],
    ) => {
      if (session.id !== sessionIdRef.current) return;

      for (const evidence of extraEvidence) {
        recordEvidence(session.buffer, evidence);
      }

      const runResult = runReactPerformanceScenario(
        session.parameters,
        {
          snapshot: finalizeMeasurementBuffer(session.buffer),
          events,
        },
      );
      if (!runResult.ok) {
        setError(runResult.error);
        setStatus("idle");
        setMeasurementSession(null);
        return;
      }

      const snapshot = createRunSnapshot({
        runId: `run-${runs.length + 1}`,
        scenarioId: session.parameters.scenario,
        seed: session.parameters.seed,
        parameters: session.parameters,
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
      setStatus("complete");
      setReplayNotice(false);
      setMeasurementSession(null);
    },
    [runs.length],
  );

  const completeProbeMeasurement = useCallback(
    (session: MeasurementSession) => {
      publishSession(session, [], [
        measuredEvent(
          1,
          "probe-complete",
          "React probe completed",
          "Render and commit observations were captured before publishing the snapshot.",
        ),
      ]);
    },
    [publishSession],
  );

  useEffect(() => {
    const session = measurementSession;
    if (!session) {
      return;
    }
    const activeSession: MeasurementSession = session;
    if (activeSession.parameters.scenario === "responsiveness") {
      return;
    }

    if (activeSession.parameters.scenario !== "worker-offload") {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function measureWorkerScenario() {
      try {
        if (activeSession.parameters.workerVariant === "baseline") {
          const workEvidence = measureMainThreadTask(() =>
            runDeterministicWorkload(
              activeSession.parameters.seed,
              activeSession.parameters.computationSize,
            ),
          );
          if (!cancelled) {
            recordEvidence(activeSession.buffer, workEvidence);
            publishSession(activeSession, [], [
              measuredEvent(
                1,
                "main-thread-work",
                "Main-thread work completed",
                "The bounded calculation occupied the main thread.",
              ),
            ]);
          }
          return;
        }

        const workerMeasurement = await runWorkerMeasurement(
          {
            seed: activeSession.parameters.seed,
            computationSize: activeSession.parameters.computationSize,
          },
          { signal: controller.signal },
        );
        if (!cancelled) {
          recordEvidence(activeSession.buffer, workerMeasurement.evidence);
          publishSession(activeSession, [], [
            measuredEvent(
              1,
              "worker-dispatched",
              "Worker work dispatched",
              "The same bounded workload crossed the local worker boundary.",
            ),
            measuredEvent(
              2,
              "worker-complete",
              "Worker result received",
              "Round-trip timing includes worker startup, serialization, scheduling, and teardown contributors.",
            ),
          ]);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "The browser measurement failed.",
          );
          setStatus("idle");
          setMeasurementSession(null);
        }
      }
    }

    void measureWorkerScenario();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [measurementSession, publishSession]);

  function runScenario(event?: MouseEvent<HTMLButtonElement>) {
    const validation = validatePerformanceWorkload(parameters);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    sessionIdRef.current += 1;
    const session: MeasurementSession = {
      id: sessionIdRef.current,
      buffer: createMeasurementBuffer({
        mode: parameters.runtimeMode,
        strictMode: parameters.strictMode,
      }),
      parameters,
    };
    setStatus("measuring");
    setError(undefined);
    setComparison(null);
    setReplayNotice(false);

    if (parameters.scenario === "responsiveness") {
      void measureResponsiveness(session, event);
      return;
    }

    setMeasurementSession(session);
  }

  async function measureResponsiveness(
    session: MeasurementSession,
    event?: MouseEvent<HTMLButtonElement>,
  ) {
    const inputTimestamp = event?.nativeEvent.timeStamp;
    const longTaskObservation = observeLongTasks((evidence) =>
      recordEvidence(session.buffer, evidence),
    );
    if (longTaskObservation.evidence) {
      recordEvidence(session.buffer, longTaskObservation.evidence);
    }

    const handlerStart = performance.now();
    recordEvidence(
      session.buffer,
      measureInputDelay(inputTimestamp, handlerStart),
    );

    try {
      if (session.parameters.responsivenessVariant === "baseline") {
        recordEvidence(
          session.buffer,
          measureMainThreadTask(() =>
            runDeterministicWorkload(
              session.parameters.seed,
              session.parameters.computationSize,
            ),
          ),
        );
        recordEvidence(
          session.buffer,
          measureInteractionLatency(inputTimestamp, performance.now()),
        );
        longTaskObservation.disconnect();
        publishSession(session, [], [
          measuredEvent(
            1,
            "blocking-interaction",
            "Blocking interaction completed",
            "The bounded calculation ran synchronously in the input handler.",
          ),
        ]);
        return;
      }

      const workerMeasurement = await runWorkerMeasurement({
        seed: session.parameters.seed,
        computationSize: session.parameters.computationSize,
      });
      recordEvidence(session.buffer, workerMeasurement.evidence);
      recordEvidence(
        session.buffer,
        measureInteractionLatency(inputTimestamp, performance.now()),
      );
      longTaskObservation.disconnect();
      publishSession(session, [], [
        measuredEvent(
          1,
          "worker-interaction",
          "Worker-backed interaction completed",
          "The interaction dispatched bounded work without running that calculation on the main thread.",
        ),
      ]);
    } catch (caughtError) {
      longTaskObservation.disconnect();
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The responsiveness measurement failed.",
      );
      setStatus("idle");
      setMeasurementSession(null);
    }
  }

  function handleParameterChange(fieldId: string, value: string) {
    setParameters((currentParameters) =>
      updateReactPerformanceParameters(currentParameters, fieldId, value),
    );
    setComparison(null);
  }

  function replayLastMeasurement() {
    if (!lastRun) return;
    setActiveRun(replayRunSnapshot(lastRun).snapshot);
    setComparison(null);
    setError(undefined);
    setReplayNotice(true);
  }

  function reset() {
    sessionIdRef.current += 1;
    const resetState = resetScenario(DEFAULT_REACT_PERFORMANCE_PARAMETERS);
    setParameters(resetState.parameters);
    setMeasurementSession(null);
    setActiveRun(null);
    setComparison(null);
    setSelectedAnswer(undefined);
    setReplayNotice(false);
    setPrediction("");
    setError(undefined);
    setStatus("idle");
  }

  function compareMeasurements() {
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
    <section className="lab-shell" aria-labelledby="react-performance-heading">
      <header className="lab-header">
        <div>
          <p className="eyebrow">Browser measurement lab · Local</p>
          <h2 id="react-performance-heading">React Performance Lab</h2>
          <p>
            Measure render propagation, derived work, worker boundaries, and
            responsiveness in this browser before deciding whether an
            optimization is justified.
          </p>
        </div>
        <span className="evidence-badge">Measured in this browser</span>
      </header>

      <section className="prediction-panel" aria-labelledby="prediction-heading">
        <div>
          <p className="eyebrow">1 · Predict</p>
          <h2 id="prediction-heading">What do you expect to happen?</h2>
        </div>
        <label htmlFor="react-performance-prediction">
          Record a prediction before running the browser measurement.
        </label>
        <textarea
          id="react-performance-prediction"
          value={prediction}
          onChange={(event) => setPrediction(event.target.value)}
          placeholder="Example: stable prop identity should reduce child render attempts..."
          rows={3}
        />
      </section>

      <div className="lab-grid">
        <aside className="lab-sidebar">
          <ParameterControls
            fields={fields}
            onChange={handleParameterChange}
          />
          <div className="action-group" aria-label="Measurement actions">
            <button
              type="button"
              className="primary-button"
              onClick={runScenario}
              disabled={status === "measuring"}
            >
              {status === "measuring" ? "Measuring…" : "Run measurement"}
            </button>
            <button
              type="button"
              onClick={replayLastMeasurement}
              disabled={!lastRun || status === "measuring"}
            >
              Replay last measurement
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={status === "measuring"}
            >
              Reset scenario
            </button>
            <button
              type="button"
              onClick={compareMeasurements}
              disabled={!canCompare || status === "measuring"}
            >
              Compare measurements
            </button>
          </div>
          {error ? (
            <p className="error-message" role="alert">
              {error}
            </p>
          ) : null}
          <p className="sidebar-note">
            Timing values come from this browser. Workloads are illustrative
            and results are not production benchmarks.
          </p>
        </aside>

        <div className="lab-content">
          {measurementSession &&
          measurementSession.parameters.scenario === "render-propagation" ? (
            <section className="lab-panel measurement-surface">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">2 · Measure</p>
                  <h2>Render propagation probe</h2>
                </div>
                <span className="evidence-badge">Live browser work</span>
              </div>
              <RenderPropagationProbe
                key={measurementSession.id}
                buffer={measurementSession.buffer}
                variant={measurementSession.parameters.renderVariant}
                parentUpdateCount={measurementSession.parameters.parentUpdateCount}
                runToken={measurementSession.id}
                onComplete={() => completeProbeMeasurement(measurementSession)}
              />
            </section>
          ) : null}
          {measurementSession &&
          measurementSession.parameters.scenario === "derived-computation" ? (
            <section className="lab-panel measurement-surface">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">2 · Measure</p>
                  <h2>Derived computation probe</h2>
                </div>
                <span className="evidence-badge">Live browser work</span>
              </div>
              <DerivedComputationProbe
                key={measurementSession.id}
                buffer={measurementSession.buffer}
                variant={measurementSession.parameters.computationVariant}
                computationSize={measurementSession.parameters.computationSize}
                seed={measurementSession.parameters.seed}
                parentUpdateCount={measurementSession.parameters.parentUpdateCount}
                runToken={measurementSession.id}
                onComplete={() => completeProbeMeasurement(measurementSession)}
              />
            </section>
          ) : null}
          {measurementSession?.parameters.scenario === "worker-offload" ? (
            <section className="lab-panel measurement-surface" aria-live="polite">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">2 · Measure</p>
                  <h2>Worker boundary probe</h2>
                </div>
                <span className="evidence-badge">Live browser work</span>
              </div>
              <p className="empty-state">
                The bounded workload is running on the{" "}
                {measurementSession.parameters.workerVariant === "optimized"
                  ? "Web Worker"
                  : "main thread"}
                . The snapshot will publish when it completes.
              </p>
            </section>
          ) : null}
          {measurementSession?.parameters.scenario === "responsiveness" ? (
            <section className="lab-panel measurement-surface" aria-live="polite">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">2 · Measure</p>
                  <h2>Responsiveness probe</h2>
                </div>
                <span className="evidence-badge">Live browser work</span>
              </div>
              <p className="empty-state">
                A real button interaction started the bounded workload. The
                result distinguishes input delay, interaction latency, task
                duration, and long-task support.
              </p>
            </section>
          ) : null}

          <section className="lab-panel" aria-live="polite">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">3 · Observe</p>
                <h2>
                  {activeRun
                    ? `${formatRunLabel(activeRun)}`
                    : "No active measurement"}
                </h2>
              </div>
              <span className="evidence-badge">
                {replayNotice
                  ? "Replayed captured measurement"
                  : activeRun
                  ? "Measured in this browser"
                  : status === "measuring"
                    ? "Measurement in progress"
                    : "Waiting for run"}
              </span>
            </div>
            {activeResult ? (
              <>
                <div className="observation-grid">
                  {activeResult.observations.map((observation) => (
                    <div className="observation-card" key={observation.label}>
                      <span>{observation.label}</span>
                      <strong>{observation.value}</strong>
                    </div>
                  ))}
                </div>
                <p className="lab-caveat">{activeResult.caveat}</p>
              </>
            ) : (
              <p className="empty-state">
                Run the selected scenario to capture immutable browser
                measurements.
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

function measuredEvent(
  sequence: number,
  kind: string,
  label: string,
  detail: string,
): TimelineEvent {
  return { sequence, kind, label, detail, simulated: false };
}

function formatRunLabel(run: ReactPerformanceRun): string {
  return `${run.runId.replace("run-", "Run ")} · ${run.result.scenarioLabel}`;
}
