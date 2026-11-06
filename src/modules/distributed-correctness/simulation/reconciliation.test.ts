import { describe, expect, it } from "vitest";

import { simulateReconciliation } from "./reconciliation";

describe("reconciliation scenarios", () => {
  it("classifies mismatches against the authoritative record set", () => {
    const result = simulateReconciliation({
      authoritativeRecords: [
        { id: "a", value: "paid" },
        { id: "b", value: "shipped" },
        { id: "c", value: "delivered" },
      ],
      derivedRecords: [
        { id: "a", value: "paid" },
        { id: "b", value: "pending" },
        { id: "d", value: "cancelled" },
      ],
    });

    expect(result.missingRecordIds).toEqual(["c"]);
    expect(result.extraRecordIds).toEqual(["d"]);
    expect(result.divergentRecordIds).toEqual(["b"]);
    expect(result.repairActions.map((action) => action.kind)).toEqual([
      "create-missing",
      "remove-extra",
      "update-divergent",
    ]);
  });

  it("emits no repairs when the derived set matches the authority", () => {
    const result = simulateReconciliation({
      authoritativeRecords: [{ id: "a", value: "paid" }],
      derivedRecords: [{ id: "a", value: "paid" }],
    });

    expect(result.repairActions).toEqual([]);
    expect(result.events.map((event) => event.kind)).toEqual([
      "reconciliation-started",
      "reconciliation-complete",
    ]);
  });
});
