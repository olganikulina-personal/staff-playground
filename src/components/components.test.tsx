import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DecisionQuestion } from "./DecisionQuestion";
import { EventTimeline } from "./EventTimeline";
import { ExplanationPanel } from "./ExplanationPanel";
import { ParameterControls } from "./ParameterControls";
import { ScenarioComparison } from "./ScenarioComparison";
import type {
  DecisionQuestion as DecisionQuestionModel,
  Explanation,
  TimelineEvent,
} from "../simulations/types";

const events: readonly TimelineEvent[] = [
  {
    sequence: 1,
    kind: "first",
    label: "First event",
    detail: "The first event happened.",
    simulated: true,
  },
  {
    sequence: 2,
    kind: "second",
    label: "Second event",
    detail: "The second event happened.",
    simulated: true,
  },
];

const explanations: readonly Explanation[] = [
  {
    title: "Mechanism",
    mechanism: "The mechanism is visible.",
    tradeoff: "The trade-off is explicit.",
    failureMode: "The failure mode is named.",
    eventSequences: [1, 2],
  },
];

const question: DecisionQuestionModel = {
  prompt: "Which choice protects the invariant?",
  options: ["Option A", "Option B"],
  reasoningFocus: "Connect the choice to the failure mode.",
};

describe("shared lab components", () => {
  it("renders labeled controls and reports select changes", () => {
    const onChange = vi.fn();

    render(
      <ParameterControls
        fields={[
          {
            id: "distribution",
            label: "Distribution",
            inputType: "select",
            value: "even",
            options: [
              { label: "Even", value: "even" },
              { label: "Hot", value: "hot" },
            ],
          },
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Distribution"), {
      target: { value: "hot" },
    });

    expect(onChange).toHaveBeenCalledWith("distribution", "hot");
  });

  it("renders events in order and labels simulated outcomes", () => {
    render(<EventTimeline events={events} />);

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      expect.stringContaining("First event"),
      expect.stringContaining("Second event"),
    ]);
    expect(screen.getAllByText("Simulated").length).toBe(3);
  });

  it("renders mechanism, trade-off, and failure explanation", () => {
    render(<ExplanationPanel explanations={explanations} />);

    expect(screen.getByText("The mechanism is visible.")).toBeVisible();
    expect(screen.getByText("The trade-off is explicit.")).toBeVisible();
    expect(screen.getByText("The failure mode is named.")).toBeVisible();
  });

  it("reports the selected decision answer", () => {
    const onSelect = vi.fn();

    render(<DecisionQuestion question={question} onSelect={onSelect} />);

    fireEvent.click(screen.getByLabelText("Option B"));

    expect(onSelect).toHaveBeenCalledWith("Option B");
  });

  it("renders two immutable run summaries for comparison", () => {
    render(
      <ScenarioComparison
        leftLabel="Even distribution"
        rightLabel="Hot distribution"
        differences={[
          {
            label: "Shard 1 records",
            left: "6",
            right: "9",
          },
        ]}
      />,
    );

    expect(screen.getByText("Even distribution")).toBeVisible();
    expect(screen.getByText("Hot distribution")).toBeVisible();
    expect(screen.getByText("Shard 1 records")).toBeVisible();
    expect(screen.getByText("9")).toBeVisible();
  });
});
