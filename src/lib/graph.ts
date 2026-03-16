import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type GraphNode = Tables<"graph_nodes">;
export type GraphEdge = Tables<"graph_edges">;

export interface GraphData {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  roomToNode: Map<string, string>; // room_id -> node id
  adjacency: Map<string, { nodeId: string; edge: GraphEdge }[]>;
}

let cachedGraph: GraphData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function loadGraph(forceRefresh = false): Promise<GraphData> {
  if (cachedGraph && !forceRefresh && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedGraph;
  }

  const [nodesRes, edgesRes] = await Promise.all([
    supabase.from("graph_nodes").select("*"),
    supabase.from("graph_edges").select("*"),
  ]);

  if (nodesRes.error) throw new Error(`Failed to load graph nodes: ${nodesRes.error.message}`);
  if (edgesRes.error) throw new Error(`Failed to load graph edges: ${edgesRes.error.message}`);

  const nodes = new Map<string, GraphNode>();
  const roomToNode = new Map<string, string>();
  const adjacency = new Map<string, { nodeId: string; edge: GraphEdge }[]>();

  for (const n of nodesRes.data ?? []) {
    nodes.set(n.id, n);
    if (n.room_id) roomToNode.set(n.room_id, n.id);
    adjacency.set(n.id, []);
  }

  for (const e of edgesRes.data ?? []) {
    // Bidirectional: add both directions
    adjacency.get(e.from_node_id)?.push({ nodeId: e.to_node_id, edge: e });
    adjacency.get(e.to_node_id)?.push({ nodeId: e.from_node_id, edge: e });
  }

  cachedGraph = { nodes, edges: edgesRes.data ?? [], roomToNode, adjacency };
  cacheTimestamp = Date.now();
  return cachedGraph;
}

export function resolveRoomToNode(graph: GraphData, roomId: string): string | null {
  return graph.roomToNode.get(roomId) ?? null;
}
