import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DatabaseLab } from "./DatabaseLab";

vi.mock("../../components/ArchitectureDiagram", () => ({
  ArchitectureDiagram: () => (
    <div data-testid="architecture-diagram">Architecture diagram</div>
  ),
}));

describe("DatabaseLab", () => {
  it("guides the user from prediction to a simulated run", () => {
    render(<DatabaseLab />);

    expect(
      screen.getByRole("heading", { name: /database architecture lab/i }),
    ).toBeVisible();
    expect(
      screen.getByText(/predict the outcome before you run/i),
    ).toBeVisible();
    expect(screen.getByTestId("architecture-diagram")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /run simulation/i }));

    expect(screen.getByText(/run 1/i)).toBeVisible();
    expect(screen.getByRole("list", { name: /simulation timeline/i })).toBeVisible();
    expect(screen.getAllByText(/simulated/i).length).toBeGreaterThan(0);
  });

  it("keeps two immutable runs available for comparison", () => {
    render(<DatabaseLab />);

    fireEvent.click(screen.getByRole("button", { name: /run simulation/i }));
    fireEvent.change(screen.getByLabelText("Distribution"), {
      target: { value: "hot" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run simulation/i }));

    expect(
      screen.getByRole("button", { name: /compare runs/i }),
    ).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /compare runs/i }));

    expect(screen.getByRole("heading", { name: /run comparison/i })).toBeVisible();
    expect(screen.getAllByText(/even distribution/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/hot distribution/i).length).toBeGreaterThan(0);
  });

  it("resets parameters and clears the active run", () => {
    render(<DatabaseLab />);

    fireEvent.click(screen.getByRole("button", { name: /run simulation/i }));
    fireEvent.click(screen.getByRole("button", { name: /reset scenario/i }));

    expect(screen.getByText(/no active run/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: /replay last run/i }),
    ).toBeEnabled();
  });
});
