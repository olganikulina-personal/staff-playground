import { useEffect, useMemo, useState } from "react";

import type { DerivedComputationVariant } from "../model/types";
import {
  recordEvidence,
  type MutableMeasurementBuffer,
} from "./buffer";
import { runDeterministicWorkload } from "./workloads";

export interface DerivedComputationProbeProps {
  readonly buffer: MutableMeasurementBuffer;
  readonly variant: DerivedComputationVariant;
  readonly computationSize?: number;
  readonly seed?: number;
  readonly parentUpdateCount?: number;
  readonly runToken?: number;
  readonly onComplete?: () => void;
}

type ComputationProps = {
  readonly buffer: MutableMeasurementBuffer;
  readonly seed: number;
  readonly computationSize: number;
  readonly parentUpdateCount: number;
  readonly runToken?: number;
  readonly onComplete?: () => void;
};

function calculate(
  buffer: MutableMeasurementBuffer,
  seed: number,
  computationSize: number,
): number {
  const value = runDeterministicWorkload(seed, computationSize);
  const previousCount = buffer.evidence.filter(
    (evidence) => evidence.metric === "calculation-count",
  ).length;
  recordEvidence(buffer, {
    kind: "measured-in-browser",
    metric: "calculation-count",
    value: previousCount + 1,
    unit: "count",
  });
  return value;
}

function BaselineComputation({
  buffer,
  seed,
  computationSize,
  parentUpdateCount,
  runToken,
  onComplete,
}: ComputationProps) {
  const [unrelatedUpdateCount, setUnrelatedUpdateCount] = useState(0);
  const value = calculate(buffer, seed, computationSize);
  useAutoUpdates(
    parentUpdateCount,
    runToken,
    setUnrelatedUpdateCount,
    onComplete,
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setUnrelatedUpdateCount((count) => count + 1)}
      >
        Update unrelated state
      </button>
      <span data-testid="unrelated-update-count">{unrelatedUpdateCount}</span>
      <output>{value}</output>
    </div>
  );
}

function OptimizedComputation({
  buffer,
  seed,
  computationSize,
  parentUpdateCount,
  runToken,
  onComplete,
}: ComputationProps) {
  const [unrelatedUpdateCount, setUnrelatedUpdateCount] = useState(0);
  const value = useMemo(
    () => calculate(buffer, seed, computationSize),
    [buffer, computationSize, seed],
  );
  useAutoUpdates(
    parentUpdateCount,
    runToken,
    setUnrelatedUpdateCount,
    onComplete,
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setUnrelatedUpdateCount((count) => count + 1)}
      >
        Update unrelated state
      </button>
      <span data-testid="unrelated-update-count">{unrelatedUpdateCount}</span>
      <output>{value}</output>
    </div>
  );
}

export function DerivedComputationProbe({
  buffer,
  variant,
  computationSize = 128,
  seed = 17,
  parentUpdateCount = 0,
  runToken,
  onComplete,
}: DerivedComputationProbeProps) {
  const props = {
    buffer,
    computationSize,
    seed,
    parentUpdateCount,
    runToken,
    onComplete,
  };
  return variant === "baseline" ? (
    <BaselineComputation {...props} />
  ) : (
    <OptimizedComputation {...props} />
  );
}

function useAutoUpdates(
  updateCount: number,
  runToken: number | undefined,
  setUpdateCount: React.Dispatch<React.SetStateAction<number>>,
  onComplete: (() => void) | undefined,
): void {
  useEffect(() => {
    if (updateCount < 1) {
      onComplete?.();
      return;
    }

    let currentUpdate = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const update = () => {
      if (cancelled) return;
      if (currentUpdate >= updateCount) {
        timeoutId = setTimeout(() => onComplete?.(), 0);
        return;
      }

      currentUpdate += 1;
      setUpdateCount((count) => count + 1);
      timeoutId = setTimeout(update, 0);
    };

    timeoutId = setTimeout(update, 0);
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [onComplete, runToken, setUpdateCount, updateCount]);
}
