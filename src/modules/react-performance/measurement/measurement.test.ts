import { describe, expect, it } from "vitest";

import {
  createMeasurementBuffer,
  finalizeMeasurementBuffer,
  recordCommit,
  recordEvidence,
  recordRenderInvocation,
} from "./buffer";
import {
  DEFAULT_PERFORMANCE_WORKLOAD,
  runDeterministicWorkload,
  validatePerformanceWorkload,
} from "./workloads";
import { DEFAULT_PERFORMANCE_RUNTIME_CONFIGURATION } from "../model/types";

describe("React Performance measurement contracts", () => {
  it("accepts bounded workload parameters and rejects unsafe values", () => {
    expect(
      validatePerformanceWorkload({
        ...DEFAULT_PERFORMANCE_WORKLOAD,
        computationSize: 64,
      }),
    ).toEqual({
      ok: true,
      value: {
        ...DEFAULT_PERFORMANCE_WORKLOAD,
        computationSize: 64,
      },
    });

    expect(
      validatePerformanceWorkload({
        ...DEFAULT_PERFORMANCE_WORKLOAD,
        computationSize: 0,
      }),
    ).toEqual({
      ok: false,
      error: "computationSize must be between 1 and 2000.",
    });
  });

  it("produces the same bounded workload result for the same inputs", () => {
    const first = runDeterministicWorkload(17, 64);
    const second = runDeterministicWorkload(17, 64);

    expect(first).toBe(second);
    expect(Number.isFinite(first)).toBe(true);
  });

  it("collects render and commit observations without publishing React state", () => {
    const buffer = createMeasurementBuffer();

    recordRenderInvocation(buffer, "child");
    recordRenderInvocation(buffer, "child");
    recordCommit(buffer, 1.25);
    recordEvidence(buffer, {
      kind: "measured-in-browser",
      metric: "commit-count",
      value: 1,
      unit: "count",
    });

    const snapshot = finalizeMeasurementBuffer(buffer);

    expect(snapshot.runtimeConfiguration).toEqual(
      DEFAULT_PERFORMANCE_RUNTIME_CONFIGURATION,
    );
    expect(snapshot.renderInvocations).toEqual({ child: 2 });
    expect(snapshot.commitDurationsMs).toEqual([1.25]);
    expect(snapshot.evidence).toHaveLength(1);
    expect(Object.isFrozen(snapshot.renderInvocations)).toBe(true);
    expect(Object.isFrozen(snapshot.commitDurationsMs)).toBe(true);
    expect(Object.isFrozen(snapshot.evidence)).toBe(true);
  });

  it("preserves explicit unsupported browser evidence", () => {
    const buffer = createMeasurementBuffer();

    recordEvidence(buffer, {
      kind: "unsupported",
      metric: "input-delay",
      reason: "The browser did not expose an input timestamp.",
    });

    expect(finalizeMeasurementBuffer(buffer).evidence).toEqual([
      {
        kind: "unsupported",
        metric: "input-delay",
        reason: "The browser did not expose an input timestamp.",
      },
    ]);
  });
});
