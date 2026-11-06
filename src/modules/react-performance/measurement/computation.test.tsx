import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createMeasurementBuffer } from "./buffer";
import {
  DerivedComputationProbe,
  type DerivedComputationProbeProps,
} from "./computation";

function renderProbe(variant: DerivedComputationProbeProps["variant"]) {
  const buffer = createMeasurementBuffer();

  render(<DerivedComputationProbe buffer={buffer} variant={variant} />);
  fireEvent.click(screen.getByRole("button", { name: /update unrelated state/i }));
  fireEvent.click(screen.getByRole("button", { name: /update unrelated state/i }));

  return buffer;
}

describe("DerivedComputationProbe", () => {
  it("recomputes derived work for every unrelated parent update", () => {
    const buffer = renderProbe("baseline");

    expect(buffer.evidence).toContainEqual({
      kind: "measured-in-browser",
      metric: "calculation-count",
      value: 3,
      unit: "count",
    });
  });

  it("reuses memoized derived work when dependencies remain unchanged", () => {
    const buffer = renderProbe("optimized");

    expect(buffer.evidence).toContainEqual({
      kind: "measured-in-browser",
      metric: "calculation-count",
      value: 1,
      unit: "count",
    });
  });
});
