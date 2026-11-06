import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createMeasurementBuffer } from "./buffer";
import {
  RenderPropagationProbe,
  type RenderPropagationProbeProps,
} from "./rendering";

function renderProbe(
  variant: RenderPropagationProbeProps["variant"],
  updateCount = 2,
) {
  const buffer = createMeasurementBuffer();

  render(
    <RenderPropagationProbe
      buffer={buffer}
      variant={variant}
    />,
  );

  for (let index = 0; index < updateCount; index += 1) {
    fireEvent.click(screen.getByRole("button", { name: /update parent/i }));
  }

  return buffer;
}

describe("RenderPropagationProbe", () => {
  it("measures child render invocations separately from profiler commits", () => {
    const buffer = renderProbe("non-memoized-unstable");

    expect(buffer.renderInvocations.child).toBe(3);
    expect(buffer.commitDurationsMs.length).toBe(3);
  });

  it("does not rerender a memoized child when stable props are unchanged", () => {
    const buffer = renderProbe("memoized-stable");

    expect(buffer.renderInvocations.child).toBe(1);
    expect(buffer.commitDurationsMs.length).toBe(3);
  });

  it("cannot avoid child rerenders when memoized props change identity", () => {
    const buffer = renderProbe("memoized-unstable");

    expect(buffer.renderInvocations.child).toBe(3);
  });
});
