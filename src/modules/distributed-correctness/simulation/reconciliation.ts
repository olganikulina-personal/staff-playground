import type { TimelineEvent } from "../../../simulations/types";
import type {
  ReconciliationInput,
  ReconciliationResult,
  RepairAction,
} from "../model/types";

export function simulateReconciliation(
  input: ReconciliationInput,
): ReconciliationResult {
  const authoritative = new Map(
    input.authoritativeRecords.map((record) => [record.id, record.value]),
  );
  const derived = new Map(
    input.derivedRecords.map((record) => [record.id, record.value]),
  );
  const allRecordIds = [...new Set([...authoritative.keys(), ...derived.keys()])].sort();
  const missingRecordIds = allRecordIds.filter(
    (recordId) => authoritative.has(recordId) && !derived.has(recordId),
  );
  const extraRecordIds = allRecordIds.filter(
    (recordId) => !authoritative.has(recordId) && derived.has(recordId),
  );
  const divergentRecordIds = allRecordIds.filter(
    (recordId) =>
      authoritative.has(recordId) &&
      derived.has(recordId) &&
      authoritative.get(recordId) !== derived.get(recordId),
  );
  const repairActions: RepairAction[] = [
    ...missingRecordIds.map((recordId) => ({
      kind: "create-missing" as const,
      recordId,
      value: authoritative.get(recordId),
    })),
    ...extraRecordIds.map((recordId) => ({
      kind: "remove-extra" as const,
      recordId,
    })),
    ...divergentRecordIds.map((recordId) => ({
      kind: "update-divergent" as const,
      recordId,
      value: authoritative.get(recordId),
    })),
  ];

  const events: TimelineEvent[] = [
    makeEvent(
      1,
      "reconciliation-started",
      "Reconciliation started",
      "The derived record set is compared with the authoritative source.",
    ),
  ];

  if (repairActions.length > 0) {
    events.push(
      makeEvent(
        events.length + 1,
        "mismatches-classified",
        "Mismatches classified",
        `${repairActions.length} deterministic repair action(s) were identified.`,
      ),
    );
    repairActions.forEach((action) => {
      events.push(
        makeEvent(
          events.length + 1,
          "repair-action-planned",
          "Repair action planned",
          `${action.kind} will reconcile record ${action.recordId} to the authoritative value.`,
        ),
      );
    });
  }

  events.push(
    makeEvent(
      events.length + 1,
      "reconciliation-complete",
      "Reconciliation complete",
      repairActions.length === 0
        ? "The derived record set matches the authoritative source."
        : "The mismatch evidence remains available alongside the repair plan.",
    ),
  );

  return {
    missingRecordIds,
    extraRecordIds,
    divergentRecordIds,
    repairActions,
    events,
    explanations: [
      {
        title: "Authoritative source",
        mechanism:
          "Reconciliation classifies the derived state by comparing it with a named authoritative record set.",
        tradeoff:
          "Repairing derived state restores convergence but can overwrite local observations if authority is chosen incorrectly.",
        failureMode:
          repairActions.length > 0
            ? "Unrepaired mismatches can keep downstream views inconsistent."
            : "A matching snapshot does not prove that future delivery or writes cannot diverge.",
        eventSequences: events.map((event) => event.sequence),
      },
    ],
  };
}

function makeEvent(
  sequence: number,
  kind: string,
  label: string,
  detail: string,
): TimelineEvent {
  return {
    sequence,
    kind,
    label,
    detail,
    simulated: true,
  };
}
