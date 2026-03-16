import { useState, useEffect } from "react";
import { loadGraph, resolveRoomToNode } from "@/lib/graph";
import { computeRoute, type NavStep } from "@/lib/routing";

interface UseRoutingResult {
  steps: NavStep[];
  loading: boolean;
  error: string | null;
}

export function useRouting(
  fromRoomId: string | null | undefined,
  toRoomId: string | null | undefined,
  accessibleRoute: boolean,
  enabled: boolean
): UseRoutingResult {
  const [steps, setSteps] = useState<NavStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !fromRoomId || !toRoomId) {
      setSteps([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const graph = await loadGraph();
        const startNode = resolveRoomToNode(graph, fromRoomId);
        const endNode = resolveRoomToNode(graph, toRoomId);

        if (!startNode || !endNode) {
          if (!cancelled) {
            setError("Could not find a route between these locations. Graph data may be missing.");
            setLoading(false);
          }
          return;
        }

        const result = computeRoute(graph, startNode, endNode, accessibleRoute);

        if (!cancelled) {
          if (!result || result.length === 0) {
            setError("No route found between these locations.");
          } else {
            setSteps(result);
          }
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to compute route.");
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [fromRoomId, toRoomId, accessibleRoute, enabled]);

  return { steps, loading, error };
}
