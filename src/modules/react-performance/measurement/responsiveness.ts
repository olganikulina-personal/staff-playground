import type { MeasurementEvidence } from "../model/types";

export interface LongTaskObserverLike {
  observe(options: { entryTypes: string[] }): void;
  disconnect(): void;
}

export type LongTaskObserverFactory = (
  onEntries: (entries: readonly PerformanceEntry[]) => void,
) => LongTaskObserverLike;

export interface LongTaskObservation {
  readonly supported: boolean;
  readonly evidence?: MeasurementEvidence;
  readonly disconnect: () => void;
}

export function measureMainThreadTask(
  task: () => void,
  now: () => number = () => performance.now(),
): MeasurementEvidence {
  const startedAt = now();
  task();
  const durationMs = Math.max(0, now() - startedAt);
  return {
    kind: "measured-in-browser",
    metric: "main-thread-task",
    value: durationMs,
    unit: "milliseconds",
  };
}

export function measureInputDelay(
  inputTimestamp: number | undefined,
  handlerStart: number,
): MeasurementEvidence {
  if (inputTimestamp === undefined || !Number.isFinite(inputTimestamp)) {
    return {
      kind: "unsupported",
      metric: "input-delay",
      reason: "The browser did not expose an input timestamp.",
    };
  }

  return {
    kind: "measured-in-browser",
    metric: "input-delay",
    value: Math.max(0, handlerStart - inputTimestamp),
    unit: "milliseconds",
  };
}

export function measureInteractionLatency(
  inputTimestamp: number | undefined,
  presentationTime: number,
): MeasurementEvidence {
  if (inputTimestamp === undefined || !Number.isFinite(inputTimestamp)) {
    return {
      kind: "unsupported",
      metric: "interaction-latency",
      reason: "The browser did not expose an input timestamp.",
    };
  }

  return {
    kind: "measured-in-browser",
    metric: "interaction-latency",
    value: Math.max(0, presentationTime - inputTimestamp),
    unit: "milliseconds",
  };
}

export function observeLongTasks(
  onEvidence: (evidence: MeasurementEvidence) => void,
  observerFactory?: LongTaskObserverFactory | null,
): LongTaskObservation {
  const factory =
    observerFactory === undefined
      ? createDefaultLongTaskObserverFactory()
      : observerFactory;

  if (!factory) {
    return {
      supported: false,
      evidence: {
        kind: "unsupported",
        metric: "long-task",
        reason: "PerformanceObserver long-task entries are unavailable.",
      },
      disconnect: () => undefined,
    };
  }

  let observer: LongTaskObserverLike;
  try {
    observer = factory((entries) => {
      for (const entry of entries) {
        onEvidence({
          kind: "measured-in-browser",
          metric: "long-task",
          value: entry.duration,
          unit: "milliseconds",
        });
      }
    });
  } catch {
    return {
      supported: false,
      evidence: {
        kind: "unsupported",
        metric: "long-task",
        reason: "The browser could not create a long-task observer.",
      },
      disconnect: () => undefined,
    };
  }
  try {
    observer.observe({ entryTypes: ["longtask"] });
  } catch {
    observer.disconnect();
    return {
      supported: false,
      evidence: {
        kind: "unsupported",
        metric: "long-task",
        reason: "The browser could not observe long-task entries.",
      },
      disconnect: () => undefined,
    };
  }

  return {
    supported: true,
    disconnect: () => observer.disconnect(),
  };
}

function createDefaultLongTaskObserverFactory(): LongTaskObserverFactory | null {
  if (typeof PerformanceObserver === "undefined") return null;

  return (onEntries) => {
    const observer = new PerformanceObserver((list) =>
      onEntries(list.getEntries()),
    );
    return {
      observe: (options) => observer.observe(options),
      disconnect: () => observer.disconnect(),
    };
  };
}
