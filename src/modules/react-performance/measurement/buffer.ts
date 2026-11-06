import {
  DEFAULT_PERFORMANCE_RUNTIME_CONFIGURATION,
} from "../model/types";
import type {
  MeasurementEvidence,
  PerformanceRuntimeConfiguration,
  PerformanceMeasurementSnapshot,
} from "../model/types";

export interface MutableMeasurementBuffer {
  readonly runtimeConfiguration: PerformanceRuntimeConfiguration;
  readonly renderInvocations: Record<string, number>;
  readonly commitDurationsMs: number[];
  readonly evidence: MeasurementEvidence[];
}

export function createMeasurementBuffer(
  runtimeConfiguration: PerformanceRuntimeConfiguration =
    DEFAULT_PERFORMANCE_RUNTIME_CONFIGURATION,
): MutableMeasurementBuffer {
  return {
    runtimeConfiguration,
    renderInvocations: {},
    commitDurationsMs: [],
    evidence: [],
  };
}

export function recordRenderInvocation(
  buffer: MutableMeasurementBuffer,
  componentId: string,
): void {
  buffer.renderInvocations[componentId] =
    (buffer.renderInvocations[componentId] ?? 0) + 1;
}

export function recordCommit(
  buffer: MutableMeasurementBuffer,
  durationMs: number,
): void {
  buffer.commitDurationsMs.push(durationMs);
}

export function recordEvidence(
  buffer: MutableMeasurementBuffer,
  evidence: MeasurementEvidence,
): void {
  buffer.evidence.push(evidence);
}

export function finalizeMeasurementBuffer(
  buffer: MutableMeasurementBuffer,
): PerformanceMeasurementSnapshot {
  const renderInvocations = Object.freeze({ ...buffer.renderInvocations });
  const commitDurationsMs = Object.freeze([...buffer.commitDurationsMs]);
  const evidence = Object.freeze([...buffer.evidence]);

  return Object.freeze({
    runtimeConfiguration: Object.freeze({ ...buffer.runtimeConfiguration }),
    renderInvocations,
    commitDurationsMs,
    evidence,
  });
}
