
-- ============================================================
-- graph_nodes: each node is a navigable point on a floor
-- ============================================================
CREATE TABLE public.graph_nodes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  floor_id    uuid NOT NULL REFERENCES public.floors(id)    ON DELETE CASCADE,
  room_id     uuid          REFERENCES public.rooms(id)     ON DELETE SET NULL,
  x_coord     double precision NOT NULL DEFAULT 0,
  y_coord     double precision NOT NULL DEFAULT 0,
  label       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.graph_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read graph_nodes"
  ON public.graph_nodes FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- graph_edges: weighted directed edges between nodes
-- ============================================================
CREATE TABLE public.graph_edges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id    uuid NOT NULL REFERENCES public.graph_nodes(id) ON DELETE CASCADE,
  to_node_id      uuid NOT NULL REFERENCES public.graph_nodes(id) ON DELETE CASCADE,
  distance_meters double precision NOT NULL DEFAULT 0,
  direction_hint  text,
  is_accessible   boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_loop CHECK (from_node_id <> to_node_id)
);

ALTER TABLE public.graph_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read graph_edges"
  ON public.graph_edges FOR SELECT
  TO anon, authenticated
  USING (true);
