import { runDeterministicWorkload } from "./workloads";
import type { WorkerWorkRequest } from "./worker";

self.onmessage = (event: MessageEvent<WorkerWorkRequest>) => {
  const request = event.data;
  if (request.type !== "run") return;

  self.postMessage({
    type: "result",
    requestId: request.requestId,
    value: runDeterministicWorkload(request.seed, request.computationSize),
  });
};
