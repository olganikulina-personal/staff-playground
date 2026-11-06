import { useState } from "react";

import {
  ModuleNavigation,
  type LearningModule,
} from "../components/ModuleNavigation";
import { DatabaseLab } from "../modules/database/DatabaseLab";
import { DistributedCorrectnessLab } from "../modules/distributed-correctness/DistributedCorrectnessLab";
import { ReactPerformanceLab } from "../modules/react-performance/ReactPerformanceLab";

export default function App() {
  const [selectedModule, setSelectedModule] =
    useState<LearningModule>("database");

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Staff engineering practice</p>
        <h1>Architecture Playground</h1>
        <p className="app-intro">
          Explore architectural mechanisms by changing inputs, breaking
          systems, and tracing deterministic outcomes.
        </p>
      </header>

      <section className="disclaimer" aria-label="Evidence boundary">
        <strong>Simulation environment.</strong> Results in this playground
        are illustrative teaching models unless a module explicitly reports a
        measurement from real code.
      </section>

      <ModuleNavigation
        selectedModule={selectedModule}
        onSelect={setSelectedModule}
      />
      {selectedModule === "database" ? (
        <DatabaseLab />
      ) : selectedModule === "distributed-correctness" ? (
        <DistributedCorrectnessLab />
      ) : (
        <ReactPerformanceLab />
      )}
    </main>
  );
}
