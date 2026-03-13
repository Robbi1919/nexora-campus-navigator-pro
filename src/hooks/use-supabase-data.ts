import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

/* ── Types ──────────────────────────────────────────────────────── */

export type RoomRow = Tables<"rooms">;
export type FloorRow = Tables<"floors">;
export type BuildingRow = Tables<"buildings">;
export type QrLocationRow = Tables<"qr_locations">;

export interface RoomWithContext extends RoomRow {
  floor_name: string | null;
  floor_number: number;
  building_name: string;
  building_id: string;
}

/* ── Fetch all buildings ────────────────────────────────────────── */

export function useBuildings() {
  const [buildings, setBuildings] = useState<BuildingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.from("buildings").select("*");
    if (err) {
      setError(err.message);
    } else {
      setBuildings(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { buildings, loading, error, refetch: fetch };
}

/* ── Fetch floors (optionally by building) ──────────────────────── */

export function useFloors(buildingId?: string) {
  const [floors, setFloors] = useState<FloorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    let q = supabase.from("floors").select("*").order("floor_number", { ascending: true });
    if (buildingId) q = q.eq("building_id", buildingId);
    const { data, error: err } = await q;
    if (err) {
      setError(err.message);
    } else {
      setFloors(data ?? []);
    }
    setLoading(false);
  }, [buildingId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { floors, loading, error, refetch: fetch };
}

/* ── Search rooms with debounce + infinite scroll ────────────────── */

const PAGE_SIZE = 20;

export function useSearchRooms(query: string, typeFilter: string | null) {
  const [rooms, setRooms] = useState<RoomWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const abortRef = useRef(0);

  const fetchPage = useCallback(async (page: number, append: boolean, abortId: number) => {
    if (page === 0) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let q = supabase
      .from("rooms")
      .select("*, floors!inner(floor_number, name, building_id, buildings:building_id(name))")
      .order("name", { ascending: true })
      .range(from, to);

    if (query.trim()) {
      q = q.ilike("name", `%${query.trim()}%`);
    }
    if (typeFilter && typeFilter !== "all") {
      q = q.eq("type", typeFilter);
    }

    const { data, error: err } = await q;

    // Abort if a newer query has been issued
    if (abortRef.current !== abortId) return;

    if (err) {
      setError(err.message);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const mapped: RoomWithContext[] = (data ?? []).map((r: any) => ({
      ...r,
      floor_name: r.floors?.name ?? null,
      floor_number: r.floors?.floor_number ?? 0,
      building_name: r.floors?.buildings?.name ?? "Unknown",
      building_id: r.floors?.building_id ?? "",
      floors: undefined,
    }));

    if (append) {
      setRooms((prev) => [...prev, ...mapped]);
    } else {
      setRooms(mapped);
    }
    setHasMore((data?.length ?? 0) === PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  }, [query, typeFilter]);

  // Reset & fetch on query/filter change (debounced)
  useEffect(() => {
    pageRef.current = 0;
    const id = ++abortRef.current;
    const timer = setTimeout(() => fetchPage(0, false, id), 300);
    return () => clearTimeout(timer);
  }, [query, typeFilter, fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    fetchPage(nextPage, true, abortRef.current);
  }, [loadingMore, hasMore, fetchPage]);

  return { rooms, loading, loadingMore, error, hasMore, loadMore, refetch: () => fetchPage(0, false, ++abortRef.current) };
}

/* ── Fetch rooms for map (by floor_id) ──────────────────────────── */

export function useRoomsByFloor(floorId: string | null, accessibleOnly: boolean) {
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!floorId) {
      setRooms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    let q = supabase.from("rooms").select("*").eq("floor_id", floorId);
    if (accessibleOnly) q = q.eq("is_accessible", true);
    const { data, error: err } = await q;
    if (err) setError(err.message);
    else setRooms(data ?? []);
    setLoading(false);
  }, [floorId, accessibleOnly]);

  useEffect(() => { fetch(); }, [fetch]);

  return { rooms, loading, error, refetch: fetch };
}

/* ── QR code lookup ─────────────────────────────────────────────── */

export async function lookupQrCode(qrData: string): Promise<RoomWithContext | null> {
  const { data: qrRow } = await supabase
    .from("qr_locations")
    .select("room_id")
    .eq("qr_code_data", qrData.trim())
    .maybeSingle();

  if (!qrRow) return null;

  const { data: room } = await supabase
    .from("rooms")
    .select("*, floors!inner(floor_number, name, building_id, buildings:building_id(name))")
    .eq("id", qrRow.room_id)
    .maybeSingle();

  if (!room) return null;

  const r = room as any;
  return {
    ...r,
    floor_name: r.floors?.name ?? null,
    floor_number: r.floors?.floor_number ?? 0,
    building_name: r.floors?.buildings?.name ?? "Unknown",
    building_id: r.floors?.building_id ?? "",
    floors: undefined,
  };
}
