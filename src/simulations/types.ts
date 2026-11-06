export interface TimelineEvent {
  readonly sequence: number;
  readonly kind: string;
  readonly label: string;
  readonly detail: string;
  readonly simulated: boolean;
}

export interface Explanation {
  readonly title: string;
  readonly mechanism: string;
  readonly tradeoff: string;
  readonly failureMode: string;
  readonly eventSequences: readonly number[];
}

export interface DecisionQuestion {
  readonly prompt: string;
  readonly options: readonly string[];
  readonly reasoningFocus: string;
}

export interface RunSnapshot<TParameters extends object, TResult extends object> {
  readonly runId: string;
  readonly scenarioId: string;
  readonly seed: number;
  readonly parameters: Readonly<TParameters>;
  readonly result: Readonly<TResult>;
  readonly events: readonly TimelineEvent[];
  readonly explanations: readonly Explanation[];
  readonly decisionQuestion?: DecisionQuestion;
}

export interface ReplayState<
  TParameters extends object,
  TResult extends object,
> {
  readonly mode: "replay";
  readonly snapshot: RunSnapshot<TParameters, TResult>;
}

export interface ResetState<TParameters extends object> {
  readonly mode: "reset";
  readonly parameters: Readonly<TParameters>;
  readonly activeRun: null;
}

export interface RunComparison<
  TParameters extends object,
  TResult extends object,
  TResultDiff,
> {
  readonly left: RunSnapshot<TParameters, TResult>;
  readonly right: RunSnapshot<TParameters, TResult>;
  readonly sameScenario: boolean;
  readonly parameterChanges: readonly string[];
  readonly resultDiff: TResultDiff;
}
