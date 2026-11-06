import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ModuleNavigation } from "./ModuleNavigation";

describe("ModuleNavigation", () => {
  it("labels modules and reports a selected module", () => {
    const onSelect = vi.fn();

    render(
      <ModuleNavigation
        selectedModule="database"
        onSelect={onSelect}
      />,
    );

    expect(screen.getByRole("navigation", { name: /learning modules/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /database architecture/i })).toHaveAttribute(
      "aria-current",
      "page",
    );

    fireEvent.click(
      screen.getByRole("button", { name: /distributed correctness/i }),
    );

    expect(onSelect).toHaveBeenCalledWith("distributed-correctness");
  });
});
