import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReactPerformanceLab } from "./ReactPerformanceLab";

describe("ReactPerformanceLab", () => {
  it("renders the measurement workflow and scenario controls", () => {
    render(<ReactPerformanceLab />);

    expect(
      screen.getByRole("heading", { name: "React Performance Lab" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /run measurement/i })).toBeVisible();
    expect(screen.getByLabelText("Scenario")).toBeVisible();
  });

  it("runs a derived-computation measurement and publishes evidence after work", async () => {
    render(<ReactPerformanceLab />);

    fireEvent.change(screen.getByLabelText("Scenario"), {
      target: { value: "derived-computation" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run measurement/i }));

    expect(await screen.findByText("Calculation count")).toBeVisible();
    expect(screen.getAllByText("Measured in this browser").length).toBeGreaterThan(0);
    expect(screen.getByText(/This browser measurement/)).toBeVisible();
  });

  it("replays the captured snapshot without rerunning browser work", async () => {
    render(<ReactPerformanceLab />);

    fireEvent.click(screen.getByRole("button", { name: /run measurement/i }));
    await screen.findByText("Child render invocations");
    fireEvent.click(screen.getByRole("button", { name: /replay last measurement/i }));

    expect(screen.getByText("Replayed captured measurement")).toBeVisible();
  });

  it("compares two captured measurements and resets the active result", async () => {
    render(<ReactPerformanceLab />);

    const runButton = screen.getByRole("button", { name: /run measurement/i });
    fireEvent.click(runButton);
    await screen.findByText("Child render invocations");
    fireEvent.click(runButton);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /compare measurements/i }),
      ).toBeEnabled(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /compare measurements/i }),
    );
    expect(screen.getByRole("heading", { name: "Run comparison" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /reset scenario/i }));
    expect(screen.getByText("No active measurement")).toBeVisible();
  });

  it("shows precise responsiveness evidence without collapsing distinct metrics", async () => {
    render(<ReactPerformanceLab />);

    fireEvent.change(screen.getByLabelText("Scenario"), {
      target: { value: "responsiveness" },
    });
    fireEvent.change(screen.getByLabelText("Responsiveness variant"), {
      target: { value: "baseline" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run measurement/i }));

    await waitFor(() =>
      expect(screen.getAllByText(/Input delay|Long task/).length).toBeGreaterThan(
        0,
      ),
    );
  });
});
