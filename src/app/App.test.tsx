import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App", () => {
  it("communicates that the playground outcomes are simulations", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /architecture playground/i })).toBeVisible();
    expect(screen.getByRole("region", { name: /evidence boundary/i })).toHaveTextContent(
      /illustrative teaching models/i,
    );
  });
});
