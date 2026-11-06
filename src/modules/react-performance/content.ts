import type {
  DecisionQuestion,
  Explanation,
} from "../../simulations/types";
import type { PerformanceScenarioId } from "./model/types";

export const REACT_PERFORMANCE_SCENARIO_LABELS: Record<
  PerformanceScenarioId,
  string
> = {
  "render-propagation": "Render propagation and memoization",
  "derived-computation": "Derived computation and useMemo",
  "worker-offload": "Main thread versus Web Worker",
  responsiveness: "Responsiveness and input delay",
};

export const REACT_PERFORMANCE_CAVEATS: Record<
  PerformanceScenarioId,
  string
> = {
  "render-propagation":
    "Render invocations are not committed paints. Results are measured in this browser and are not production benchmarks.",
  "derived-computation":
    "This browser measurement uses a bounded illustrative workload; memoization is only useful when avoided work exceeds its memory and comparison cost.",
  "worker-offload":
    "This browser measurement reports worker round-trip timing, including startup, serialization, scheduling, and teardown contributors unless separately measured.",
  responsiveness:
    "Input delay, interaction latency, and long-task evidence are distinct and browser-support dependent.",
};

export const REACT_PERFORMANCE_EXPLANATIONS: Record<
  PerformanceScenarioId,
  readonly Explanation[]
> = {
  "render-propagation": [
    {
      title: "Render propagation",
      mechanism:
        "A parent update can invoke child render functions even when the child's meaningful data is unchanged.",
      tradeoff:
        "Stable references plus memoization can avoid work, but comparison and reference-management costs remain.",
      failureMode:
        "Treating render invocations as committed paints or assuming React.memo helps with every prop shape.",
      eventSequences: [],
    },
  ],
  "derived-computation": [
    {
      title: "Derived computation",
      mechanism:
        "Memoization reuses a derived value while its dependencies remain unchanged.",
      tradeoff:
        "Retained values and dependency comparisons cost memory and time when the calculation is cheap or inputs change often.",
      failureMode:
        "Adding useMemo without measuring whether recomputation is expensive enough to matter.",
      eventSequences: [],
    },
  ],
  "worker-offload": [
    {
      title: "Worker offload",
      mechanism:
        "A Web Worker moves bounded CPU work away from the main thread.",
      tradeoff:
        "The worker boundary adds startup, serialization, scheduling, and lifecycle overhead.",
      failureMode:
        "Calling a worker automatically faster without checking end-to-end round-trip cost or cancellation.",
      eventSequences: [],
    },
  ],
  responsiveness: [
    {
      title: "Responsiveness evidence",
      mechanism:
        "Main-thread occupancy can delay input handling and presentation even when the final calculation completes.",
      tradeoff:
        "Input delay, interaction latency, task duration, and long-task evidence answer different questions.",
      failureMode:
        "Collapsing unsupported or distinct responsiveness metrics into one misleading latency number.",
      eventSequences: [],
    },
  ],
};

export const REACT_PERFORMANCE_DECISION_QUESTIONS: Record<
  PerformanceScenarioId,
  DecisionQuestion
> = {
  "render-propagation": {
    prompt: "Which change best targets avoidable child work in this measurement?",
    options: [
      "Stabilize meaningful prop references and measure memoization",
      "Wrap every component in React.memo",
      "Treat every render invocation as a visible browser update",
    ],
    reasoningFocus:
      "Separate render attempts, commits, prop identity, and the cost of comparison.",
  },
  "derived-computation": {
    prompt: "When is memoizing derived work justified?",
    options: [
      "When measured avoided work exceeds retention and comparison costs",
      "Whenever a component renders more than once",
      "Never, because React always caches derived values",
    ],
    reasoningFocus:
      "Use measurement and dependency stability rather than a blanket rule.",
  },
  "worker-offload": {
    prompt: "When is moving work to a Web Worker a reasonable trade-off?",
    options: [
      "When main-thread responsiveness matters more than added round-trip cost",
      "Whenever a calculation can be written as a function",
      "Only when worker time is lower than main-thread time in one run",
    ],
    reasoningFocus:
      "Compare main-thread isolation with end-to-end worker lifecycle cost.",
  },
  responsiveness: {
    prompt: "What should you conclude from a responsiveness measurement?",
    options: [
      "Only the specific supported metric and workload that were measured",
      "That every user will see the same latency",
      "That a long task and input delay are interchangeable",
    ],
    reasoningFocus:
      "Keep browser evidence precise, scoped, and explicit about unsupported APIs.",
  },
};
