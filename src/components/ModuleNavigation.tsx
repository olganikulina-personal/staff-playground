export type LearningModule =
  | "database"
  | "distributed-correctness"
  | "react-performance";

interface ModuleNavigationProps {
  readonly selectedModule: LearningModule;
  readonly onSelect: (module: LearningModule) => void;
}

const MODULES: readonly {
  readonly id: LearningModule;
  readonly label: string;
  readonly description: string;
}[] = [
  {
    id: "database",
    label: "Database Architecture",
    description: "Ownership, replicas, failures, queries, and indexes",
  },
  {
    id: "distributed-correctness",
    label: "Distributed Correctness",
    description: "Timeouts, retries, idempotency, delivery, and repair",
  },
  {
    id: "react-performance",
    label: "React Performance",
    description: "Render work, memoization, workers, and responsiveness",
  },
];

export function ModuleNavigation({
  selectedModule,
  onSelect,
}: ModuleNavigationProps) {
  return (
    <nav className="module-navigation" aria-label="Learning modules">
      <p className="eyebrow">Learning modules</p>
      <div className="module-navigation-list">
        {MODULES.map((module) => (
          <button
            type="button"
            className={
              module.id === selectedModule
                ? "module-navigation-button is-selected"
                : "module-navigation-button"
            }
            aria-current={module.id === selectedModule ? "page" : undefined}
            key={module.id}
            onClick={() => onSelect(module.id)}
          >
            <strong>{module.label}</strong>
            <span>{module.description}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
