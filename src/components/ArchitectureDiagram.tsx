import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { DatabaseTopology } from "../modules/database/model/types";

interface ArchitectureDiagramProps {
  readonly topology?: DatabaseTopology;
  readonly highlightedNodeId?: string;
}

export function ArchitectureDiagram({
  topology,
  highlightedNodeId,
}: ArchitectureDiagramProps) {
  const { nodes, edges } = topology
    ? createFlowElements(topology, highlightedNodeId)
    : { nodes: [], edges: [] };

  return (
    <section className="lab-panel diagram-panel" aria-labelledby="diagram-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Observe</p>
          <h2 id="diagram-heading">Architecture topology</h2>
        </div>
        <span className="evidence-badge">Derived from simulation</span>
      </div>
      <div className="diagram-canvas" aria-label="Database architecture diagram">
        {topology ? (
          <ReactFlow nodes={nodes} edges={edges} fitView>
            <Background color="#30363d" gap={20} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        ) : (
          <p className="empty-state">
            Run a scenario to render logical partitions, shards, instances, and
            compute nodes.
          </p>
        )}
      </div>
    </section>
  );
}

function createFlowElements(
  topology: DatabaseTopology,
  highlightedNodeId?: string,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  topology.computeNodes.forEach((computeNode, index) => {
    nodes.push({
      id: computeNode.id,
      position: { x: 0, y: index * 150 },
      data: {
        label: `${computeNode.id}\n${computeNode.id === highlightedNodeId ? "FAILED" : "available"}`,
      },
      className:
        computeNode.id === highlightedNodeId
          ? "flow-node flow-node-failed"
          : "flow-node",
    });
  });

  topology.physicalShards.forEach((shard, shardIndex) => {
    const shardNodeId = `diagram-${shard.id}`;
    nodes.push({
      id: shardNodeId,
      position: { x: 260, y: shardIndex * 180 },
      data: {
        label: `${shard.id}\n${shard.primaryRecordIds.length} primary records`,
      },
      className: "flow-node flow-node-shard",
    });

    const instances = topology.databaseInstances.filter(
      (instance) => instance.physicalShardId === shard.id,
    );
    instances.forEach((instance, instanceIndex) => {
      nodes.push({
        id: instance.id,
        position: { x: 560, y: shardIndex * 180 + instanceIndex * 70 },
        data: {
          label: `${instance.id}\n${instance.role}`,
        },
        className: "flow-node flow-node-instance",
      });
      edges.push({
        id: `${instance.id}-${shardNodeId}`,
        source: instance.id,
        target: shardNodeId,
        animated: instance.role === "replica",
      });
      edges.push({
        id: `${instance.computeNodeId}-${instance.id}`,
        source: instance.computeNodeId,
        target: instance.id,
      });
    });
  });

  return { nodes, edges };
}
