import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DistributedCorrectnessLab } from "./DistributedCorrectnessLab";

describe("DistributedCorrectnessLab", () => {
  it("guides the user from prediction to an ambiguous simulated outcome", () => {
    render(<DistributedCorrectnessLab />);

    expect(
      screen.getByRole("heading", { name: /distributed correctness lab/i }),
    ).toBeVisible();
    expect(
      screen.getByLabelText(/predict the outcome before you run/i),
    ).toBeVisible();

    fireEvent.change(screen.getByLabelText(/predict the outcome/i), {
      target: { value: "The server may commit even if the response is lost." },
    });
    fireEvent.click(screen.getByRole("button", { name: /run simulation/i }));

    expect(screen.getByText(/unknown-after-timeout/i)).toBeVisible();
    expect(screen.getByRole("list", { name: /simulation timeline/i })).toBeVisible();
    expect(screen.getAllByText(/simulated/i).length).toBeGreaterThan(0);
  });

  it("switches scenarios and compares two immutable runs", () => {
    render(<DistributedCorrectnessLab />);

    fireEvent.click(screen.getByRole("button", { name: /run simulation/i }));
    fireEvent.change(screen.getByLabelText("Scenario"), {
      target: { value: "idempotency" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run simulation/i }));
    fireEvent.click(screen.getByRole("button", { name: /compare runs/i }));

    expect(screen.getByRole("heading", { name: /run comparison/i })).toBeVisible();
    expect(screen.getAllByText(/timeout ambiguity/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/idempotency keys/i).length).toBeGreaterThan(0);
  });

  it("resets the active result without deleting the run history", () => {
    render(<DistributedCorrectnessLab />);

    fireEvent.click(screen.getByRole("button", { name: /run simulation/i }));
    fireEvent.click(screen.getByRole("button", { name: /reset scenario/i }));

    expect(screen.getByText(/no active run/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /replay last run/i })).toBeEnabled();
  });
});
