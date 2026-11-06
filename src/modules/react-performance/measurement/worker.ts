import type { MeasurementEvidence } from "../model/types";

export interface WorkerLike {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: WorkerWorkRequest): void;
  terminate(): void;
}

export interface WorkerWorkRequest {
  readonly type: "run";
  readonly requestId: string;
  readonly seed: number;
  readonly computationSize: number;
}

interface WorkerWorkResponse {
  readonly type: "result";
  readonly requestId: string;
  readonly value: number;
}

export interface WorkerMeasurement {
  readonly value: number;
  readonly evidence: MeasurementEvidence;
}

export interface WorkerMeasurementOptions {
  readonly createWorker?: () => WorkerLike;
  readonly now?: () => number;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

export function runWorkerMeasurement(
  input: { readonly seed: number; readonly computationSize: number },
  options: WorkerMeasurementOptions = {},
): Promise<WorkerMeasurement> {
  const createWorker = options.createWorker ?? createModuleWorker;
  const now = options.now ?? (() => performance.now());
  const timeoutMs = options.timeoutMs ?? 2_000;

  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new Error("Worker measurement was aborted."));
      return;
    }

    const startedAt = now();
    let worker: WorkerLike;
    try {
      worker = createWorker();
    } catch (error) {
      reject(error);
      return;
    }

    const requestId = `work-${input.seed}-${input.computationSize}`;
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    function cleanup() {
      if (settled) return;
      settled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      options.signal?.removeEventListener("abort", handleAbort);
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    }

    function handleAbort() {
      cleanup();
      reject(new Error("Worker measurement was aborted."));
    }

    options.signal?.addEventListener("abort", handleAbort, { once: true });
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Worker measurement timed out."));
    }, timeoutMs);

    worker.onmessage = (event) => {
      const response = event.data as WorkerWorkResponse;
      if (response.type !== "result" || response.requestId !== requestId) {
        return;
      }

      const durationMs = Math.max(0, now() - startedAt);
      cleanup();
      resolve({
        value: response.value,
        evidence: {
          kind: "measured-in-browser",
          metric: "worker-round-trip",
          value: durationMs,
          unit: "milliseconds",
        },
      });
    };

    worker.onerror = (event) => {
      cleanup();
      reject(new Error(event.message || "Worker measurement failed."));
    };

    try {
      worker.postMessage({
        type: "run",
        requestId,
        seed: input.seed,
        computationSize: input.computationSize,
      });
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

function createModuleWorker(): WorkerLike {
  return new Worker(new URL("./workload.worker.ts", import.meta.url), {
    type: "module",
  });
}
