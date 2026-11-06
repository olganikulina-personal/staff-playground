import type {
  DecisionQuestion,
  Explanation,
  ReplayState,
  ResetState,
  RunComparison,
  RunSnapshot,
  TimelineEvent,
} from "./types";

interface CreateRunSnapshotInput<
  TParameters extends object,
  TResult extends object,
> {
  readonly runId: string;
  readonly scenarioId: string;
  readonly seed: number;
  readonly parameters: TParameters;
  readonly result: TResult;
  readonly events: readonly TimelineEvent[];
  readonly explanations: readonly Explanation[];
  readonly decisionQuestion?: DecisionQuestion;
}

export function createRunSnapshot<
  TParameters extends object,
  TResult extends object,
>(
  input: CreateRunSnapshotInput<TParameters, TResult>,
): RunSnapshot<TParameters, TResult> {
  return deepFreeze({
    runId: input.runId,
    scenarioId: input.scenarioId,
    seed: input.seed,
    parameters: cloneValue(input.parameters),
    result: cloneValue(input.result),
    events: input.events.map((event) => ({ ...event })),
    explanations: input.explanations.map((explanation) => ({
      ...explanation,
      eventSequences: [...explanation.eventSequences],
    })),
    decisionQuestion: input.decisionQuestion
      ? {
          ...input.decisionQuestion,
          options: [...input.decisionQuestion.options],
        }
      : undefined,
  });
}

export function replayRunSnapshot<
  TParameters extends object,
  TResult extends object,
>(
  snapshot: RunSnapshot<TParameters, TResult>,
): ReplayState<TParameters, TResult> {
  return {
    mode: "replay",
    snapshot,
  };
}

export function compareRunSnapshots<
  TParameters extends object,
  TResult extends object,
  TResultDiff,
>(
  left: RunSnapshot<TParameters, TResult>,
  right: RunSnapshot<TParameters, TResult>,
  comparison: { readonly resultDiff: TResultDiff },
): RunComparison<TParameters, TResult, TResultDiff> {
  const keys = new Set([
    ...Object.keys(left.parameters),
    ...Object.keys(right.parameters),
  ]);
  const parameterChanges = [...keys]
    .filter(
      (key) =>
        JSON.stringify(left.parameters[key as keyof TParameters]) !==
        JSON.stringify(right.parameters[key as keyof TParameters]),
    )
    .sort();

  return {
    left,
    right,
    sameScenario: left.scenarioId === right.scenarioId,
    parameterChanges,
    resultDiff: comparison.resultDiff,
  };
}

export function resetScenario<TParameters extends object>(
  defaults: TParameters,
): ResetState<TParameters> {
  return {
    mode: "reset",
    parameters: deepFreeze(cloneValue(defaults)),
    activeRun: null,
  };
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(cloneValue) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        cloneValue(nestedValue),
      ]),
    ) as T;
  }

  return value;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nestedValue of Object.values(value)) {
      deepFreeze(nestedValue);
    }
  }

  return value;
}
