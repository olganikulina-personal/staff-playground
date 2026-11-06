import { describe, expect, it } from "vitest";

import {
  measureInputDelay,
  measureInteractionLatency,
  measureMainThreadTask,
  observeLongTasks,
  type LongTaskObserverLike,
} from "./responsiveness";

describe("responsiveness measurements", () => {
  it("measures main-thread task duration without using a fixed benchmark", () => {
    const timestamps = [10, 14];

    const evidence = measureMainThreadTask(
      () => undefined,
      () => timestamps.shift() ?? 14,
    );

    expect(evidence).toEqual({
      kind: "measured-in-browser",
      metric: "main-thread-task",
      value: 4,
      unit: "milliseconds",
    });
  });

  it("distinguishes supported input delay from missing input timestamps", () => {
    expect(measureInputDelay(10, 13)).toEqual({
      kind: "measured-in-browser",
      metric: "input-delay",
      value: 3,
      unit: "milliseconds",
    });
    expect(measureInputDelay(undefined, 13)).toEqual({
      kind: "unsupported",
      metric: "input-delay",
      reason: "The browser did not expose an input timestamp.",
    });
  });

  it("measures interaction latency separately from input delay", () => {
    expect(measureInteractionLatency(10, 18)).toEqual({
      kind: "measured-in-browser",
      metric: "interaction-latency",
      value: 8,
      unit: "milliseconds",
    });
  });

  it("reports long-task evidence and disconnects the observer", () => {
    let observer: LongTaskObserverLike | undefined;
    const evidence: unknown[] = [];

    const observation = observeLongTasks(
      (entry) => evidence.push(entry),
      (onEntries) => {
        observer = {
          observe: () => onEntries([{ duration: 55 } as PerformanceEntry]),
          disconnect: () => undefined,
        };
        return observer;
      },
    );

    expect(observation.supported).toBe(true);
    expect(evidence).toEqual([
      {
        kind: "measured-in-browser",
        metric: "long-task",
        value: 55,
        unit: "milliseconds",
      },
    ]);

    observation.disconnect();
  });

  it("reports unsupported long-task evidence when the API is unavailable", () => {
    const observation = observeLongTasks(() => undefined, null);

    expect(observation).toMatchObject({
      supported: false,
      evidence: {
        kind: "unsupported",
        metric: "long-task",
      },
    });
  });

  it("reports unsupported evidence when long-task observation cannot start", () => {
    let disconnected = false;

    const observation = observeLongTasks(
      () => undefined,
      () => ({
        observe: () => {
          throw new Error("unsupported");
        },
        disconnect: () => {
          disconnected = true;
        },
      }),
    );

    expect(observation).toMatchObject({
      supported: false,
      evidence: {
        kind: "unsupported",
        metric: "long-task",
      },
    });
    expect(disconnected).toBe(true);
  });
});
