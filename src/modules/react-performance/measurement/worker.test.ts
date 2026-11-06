import { describe, expect, it } from "vitest";

import { runWorkerMeasurement, type WorkerLike } from "./worker";
import { runDeterministicWorkload } from "./workloads";

class SuccessfulWorker implements WorkerLike {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminateCount = 0;

  postMessage(message: { requestId: string; seed: number; computationSize: number }) {
    queueMicrotask(() => {
      this.onmessage?.({
        data: {
          type: "result",
          requestId: message.requestId,
          value: runDeterministicWorkload(message.seed, message.computationSize),
        },
      } as MessageEvent);
    });
  }

  terminate() {
    this.terminateCount += 1;
  }
}

class FailingWorker implements WorkerLike {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminateCount = 0;

  postMessage() {
    queueMicrotask(() => {
      this.onerror?.({ message: "worker failed" } as ErrorEvent);
    });
  }

  terminate() {
    this.terminateCount += 1;
  }
}

class StalledWorker implements WorkerLike {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminateCount = 0;

  postMessage() {
    // Intentionally never responds.
  }

  terminate() {
    this.terminateCount += 1;
  }
}

class ThrowingWorker implements WorkerLike {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminateCount = 0;

  postMessage() {
    throw new Error("post failed");
  }

  terminate() {
    this.terminateCount += 1;
  }
}

describe("runWorkerMeasurement", () => {
  it("measures a successful worker round trip and terminates the worker", async () => {
    const worker = new SuccessfulWorker();

    const result = await runWorkerMeasurement(
      { seed: 17, computationSize: 64 },
      {
        createWorker: () => worker,
        now: (() => {
          const values = [10, 13];
          return () => values.shift() ?? 13;
        })(),
      },
    );

    expect(result.value).toBe(runDeterministicWorkload(17, 64));
    expect(result.evidence).toEqual({
      kind: "measured-in-browser",
      metric: "worker-round-trip",
      value: 3,
      unit: "milliseconds",
    });
    expect(worker.terminateCount).toBe(1);
  });

  it("cleans up when posting the worker request fails", async () => {
    const worker = new ThrowingWorker();

    await expect(
      runWorkerMeasurement(
        { seed: 17, computationSize: 64 },
        { createWorker: () => worker },
      ),
    ).rejects.toThrow("post failed");

    expect(worker.terminateCount).toBe(1);
  });

  it("terminates the worker when the owning lifecycle aborts", async () => {
    const worker = new StalledWorker();
    const controller = new AbortController();
    const measurement = runWorkerMeasurement(
      { seed: 17, computationSize: 64 },
      {
        createWorker: () => worker,
        signal: controller.signal,
      },
    );

    controller.abort();

    await expect(measurement).rejects.toThrow("aborted");
    expect(worker.terminateCount).toBe(1);
  });

  it("rejects worker errors and still terminates the worker", async () => {
    const worker = new FailingWorker();

    await expect(
      runWorkerMeasurement(
        { seed: 17, computationSize: 64 },
        { createWorker: () => worker },
      ),
    ).rejects.toThrow("worker failed");

    expect(worker.terminateCount).toBe(1);
  });

  it("rejects a stalled worker after the bounded timeout and cleans it up", async () => {
    const worker = new StalledWorker();

    await expect(
      runWorkerMeasurement(
        { seed: 17, computationSize: 64 },
        {
          createWorker: () => worker,
          timeoutMs: 1,
        },
      ),
    ).rejects.toThrow("timed out");

    expect(worker.terminateCount).toBe(1);
  });
});
