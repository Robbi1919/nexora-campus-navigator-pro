import type { GraphData, GraphNode } from "./graph";

export interface NavStep {
  icon: "up" | "right" | "left" | "elevator" | "exit";
  instruction: string;
  distance: string;
}

/**
 * Dijkstra shortest path over the in-memory graph.
 * When accessibleOnly is true, edges with is_accessible=false are skipped.
 * Returns NavStep[] ready for NavigationFlow consumption.
 */
export function computeRoute(
  graph: GraphData,
  startNodeId: string,
  endNodeId: string,
  accessibleOnly: boolean
): NavStep[] | null {
  const dist = new Map<string, number>();
  const prev = new Map<string, { nodeId: string; edgeId: string } | null>();
  const visited = new Set<string>();

  // Priority queue as simple array (sufficient for campus-scale graphs)
  const pq: { nodeId: string; cost: number }[] = [];

  dist.set(startNodeId, 0);
  prev.set(startNodeId, null);
  pq.push({ nodeId: startNodeId, cost: 0 });

  while (pq.length > 0) {
    // Extract min
    pq.sort((a, b) => a.cost - b.cost);
    const current = pq.shift()!;

    if (visited.has(current.nodeId)) continue;
    visited.add(current.nodeId);

    if (current.nodeId === endNodeId) break;

    const neighbors = graph.adjacency.get(current.nodeId) ?? [];
    for (const { nodeId: neighborId, edge } of neighbors) {
      if (visited.has(neighborId)) continue;
      if (accessibleOnly && !edge.is_accessible) continue;

      const newDist = current.cost + edge.distance_meters;
      const oldDist = dist.get(neighborId);
      if (oldDist === undefined || newDist < oldDist) {
        dist.set(neighborId, newDist);
        prev.set(neighborId, { nodeId: current.nodeId, edgeId: edge.id });
        pq.push({ nodeId: neighborId, cost: newDist });
      }
    }
  }

  // Reconstruct path
  if (!prev.has(endNodeId)) return null;

  const pathNodes: string[] = [];
  let cur: string | undefined = endNodeId;
  while (cur) {
    pathNodes.unshift(cur);
    const p = prev.get(cur);
    cur = p?.nodeId;
  }

  if (pathNodes.length < 2) return null;

  // Convert path to NavStep[]
  const steps: NavStep[] = [];
  for (let i = 0; i < pathNodes.length - 1; i++) {
    const fromId = pathNodes[i];
    const toId = pathNodes[i + 1];
    const fromNode = graph.nodes.get(fromId)!;
    const toNode = graph.nodes.get(toId)!;

    // Find the edge used
    const neighbors = graph.adjacency.get(fromId) ?? [];
    const link = neighbors.find((n) => n.nodeId === toId);
    const edge = link?.edge;

    const distance = edge ? edge.distance_meters : 0;
    const isReversed = edge ? edge.from_node_id !== fromId : false;

    const icon = resolveIcon(edge?.direction_hint ?? null, fromNode, toNode, isReversed);
    const instruction = buildInstruction(icon, toNode, edge?.direction_hint ?? null);

    steps.push({
      icon,
      instruction,
      distance: `~${Math.round(distance)}m`,
    });
  }

  return steps;
}

function resolveIcon(
  hint: string | null,
  fromNode: GraphNode,
  toNode: GraphNode,
  isReversed: boolean
): NavStep["icon"] {
  if (hint) {
    const h = hint.toLowerCase().trim();
    if (h === "elevator" || h === "lift") return "elevator";
    if (h === "exit" || h === "door") return "exit";
    if (h === "up" || h === "straight" || h === "forward") return "up";
    if (h === "right") return isReversed ? "left" : "right";
    if (h === "left") return isReversed ? "right" : "left";
  }

  // Floor change → elevator
  if (fromNode.floor_id !== toNode.floor_id) return "elevator";

  // Infer from coordinates
  const dx = toNode.x_coord - fromNode.x_coord;
  const dy = toNode.y_coord - fromNode.y_coord;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  }
  return "up";
}

function buildInstruction(
  icon: NavStep["icon"],
  toNode: GraphNode,
  hint: string | null
): string {
  const label = toNode.label || toNode.room_id ? `towards ${toNode.label || "the destination"}` : "ahead";

  switch (icon) {
    case "elevator":
      return `Take the elevator ${label}`;
    case "exit":
      return `Exit ${label}`;
    case "right":
      return `Turn right ${label}`;
    case "left":
      return `Turn left ${label}`;
    case "up":
    default:
      return `Go straight ${label}`;
  }
}
