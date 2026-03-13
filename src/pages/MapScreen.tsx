/*
 * ── SEED DATA (SQL) ─────────────────────────────────────────────
 * INSERT INTO buildings (name, description, address) VALUES ('Edificio F', 'Main engineering building', 'Via Giovanni Paolo II, Fisciano');
 * INSERT INTO floors (building_id, floor_number, name) VALUES
 *   ('<building_id>', -1, 'B1'), ('<building_id>', 0, 'P0'), ('<building_id>', 1, 'P1'), ('<building_id>', 2, 'P2'), ('<building_id>', 3, 'P3');
 * INSERT INTO rooms (name, floor_id, type, is_accessible, x_coord, y_coord) VALUES
 *   ('Aula F3',            '<floor_p1_id>', 'aula',              false, 14.7897, 40.7728),
 *   ('Aula F5',            '<floor_p1_id>', 'aula',              false, 14.7895, 40.7729),
 *   ('Bagno',              '<floor_p1_id>', 'bagno',             true,  14.7896, 40.7727),
 *   ('Ascensore',          '<floor_p1_id>', 'ascensore',         true,  14.7894, 40.7726),
 *   ('Uscita Sicurezza',   '<floor_p1_id>', 'uscita_sicurezza',  false, 14.7898, 40.7730),
 *   ('Passaggio Disabili', '<floor_p1_id>', 'passaggio_disabili',true,  14.7893, 40.7725);
 */

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { ChevronDown, ChevronUp, Accessibility, Navigation, Star, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import NavigationFlow from "@/components/NavigationFlow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";

/* ── Types ────────────────────────────────────────────────────── */

type RoomType = "aula" | "ufficio" | "bagno" | "ascensore" | "uscita_sicurezza" | "passaggio_disabili";

interface MapRoom {
  id: string;
  name: string;
  type: RoomType;
  is_accessible: boolean;
  x_coord: number | null;
  y_coord: number | null;
  floor_id: string;
  floor_number: number;
  floor_name: string | null;
}

interface FloorOption {
  id: string;
  floor_number: number;
  name: string | null;
}

/* ── SVG icon builders ────────────────────────────────────────── */

const PIN_CONFIG: Record<RoomType, { color: string; label: string; svg: string }> = {
  aula: {
    color: "#2563EB",
    label: "Aula",
    svg: `<svg width="32" height="32" viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="24" rx="4" fill="#2563EB"/><text x="16" y="21" text-anchor="middle" fill="white" font-size="14" font-weight="700" font-family="Inter,sans-serif">A</text></svg>`,
  },
  ufficio: {
    color: "#0891B2",
    label: "Ufficio",
    svg: `<svg width="32" height="32" viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="24" rx="4" fill="#0891B2"/><text x="16" y="21" text-anchor="middle" fill="white" font-size="14" font-weight="700" font-family="Inter,sans-serif">U</text></svg>`,
  },
  bagno: {
    color: "#16A34A",
    label: "Bagno",
    svg: `<svg width="32" height="32" viewBox="0 0 32 32"><path d="M16 4C11 4 8 10 8 16c0 6 8 14 8 14s8-8 8-14c0-6-3-12-8-12z" fill="#16A34A"/><circle cx="16" cy="15" r="4" fill="white"/></svg>`,
  },
  ascensore: {
    color: "#EA580C",
    label: "Ascensore",
    svg: `<svg width="32" height="32" viewBox="0 0 32 32"><rect x="6" y="6" width="20" height="20" rx="4" fill="#EA580C"/><path d="M16 10l5 8H11z" fill="white"/></svg>`,
  },
  uscita_sicurezza: {
    color: "#DC2626",
    label: "Uscita sicurezza",
    svg: `<svg width="32" height="32" viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="24" rx="4" fill="#DC2626"/><rect x="10" y="8" width="8" height="16" rx="1" fill="white"/><circle cx="16" cy="18" r="1.5" fill="#DC2626"/></svg>`,
  },
  passaggio_disabili: {
    color: "#9333EA",
    label: "Passaggio disabili",
    svg: `<svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#9333EA"/><text x="16" y="22" text-anchor="middle" fill="white" font-size="16">♿</text></svg>`,
  },
};

function createMarkerElement(type: RoomType): HTMLDivElement {
  const el = document.createElement("div");
  el.innerHTML = PIN_CONFIG[type]?.svg ?? "";
  el.style.cursor = "pointer";
  el.style.width = "32px";
  el.style.height = "32px";
  return el;
}

/* ── Component ────────────────────────────────────────────────── */

const MapScreen = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [floors, setFloors] = useState<FloorOption[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null);
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  const [rooms, setRooms] = useState<MapRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const [selectedRoom, setSelectedRoom] = useState<MapRoom | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navigatingPin, setNavigatingPin] = useState<MapRoom | null>(null);

  /* ── Fetch floors ──────────────────────────────────────────── */

  useEffect(() => {
    const fetchFloors = async () => {
      const { data, error } = await supabase
        .from("floors")
        .select("id, floor_number, name")
        .order("floor_number", { ascending: true });

      if (!error && data && data.length > 0) {
        setFloors(data);
        setActiveFloorId(data[0].id);
      }
    };
    fetchFloors();
  }, []);

  /* ── Fetch rooms for active floor ──────────────────────────── */

  const fetchRooms = useCallback(async () => {
    if (!activeFloorId) return;
    setRoomsLoading(true);
    setRoomsError(null);

    try {
      let q = supabase
        .from("rooms")
        .select("id, name, type, is_accessible, x_coord, y_coord, floor_id, floors!inner(floor_number, name)")
        .eq("floor_id", activeFloorId);

      if (accessibleOnly) {
        q = q.eq("is_accessible", true);
      }

      const { data, error } = await q;
      if (error) throw error;

      const mapped: MapRoom[] = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        type: r.type as RoomType,
        is_accessible: r.is_accessible ?? false,
        x_coord: r.x_coord,
        y_coord: r.y_coord,
        floor_id: r.floor_id,
        floor_number: r.floors?.floor_number ?? 0,
        floor_name: r.floors?.name ?? null,
      }));

      setRooms(mapped);
    } catch (err: any) {
      setRoomsError(err.message || "Failed to load rooms");
      setRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  }, [activeFloorId, accessibleOnly]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  /* ── Initialise map ──────────────────────────────────────────── */

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) {
      console.warn("VITE_MAPBOX_TOKEN not set — map will not load.");
      return;
    }
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [14.7895, 40.7726],
      zoom: 17,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "top-left");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* ── Render markers when rooms change ───────────────────────── */

  useEffect(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const map = mapRef.current;
    if (!map) return;

    const addMarkers = () => {
      rooms.forEach((room) => {
        if (room.x_coord == null || room.y_coord == null) return;
        const el = createMarkerElement(room.type);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelectedRoom(room);
          setDrawerOpen(true);
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([room.x_coord, room.y_coord])
          .addTo(map);

        markersRef.current.push(marker);
      });
    };

    if (map.loaded()) {
      addMarkers();
    } else {
      map.on("load", addMarkers);
      return () => { map.off("load", addMarkers); };
    }
  }, [rooms]);

  /* ── Active floor label ─────────────────────────────────────── */

  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const floorDisplayName = (f: FloorOption) => f.name ?? `P${f.floor_number}`;

  /* ── UI ──────────────────────────────────────────────────────── */

  return (
    <div className="relative h-[100dvh] w-full pb-[var(--nav-height)]">
      <div ref={mapContainer} className="absolute inset-0" />

      {!import.meta.env.VITE_MAPBOX_TOKEN && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-muted/90 px-6 text-center">
          <p className="text-lg font-semibold text-foreground">Mapbox token missing</p>
          <p className="text-sm text-muted-foreground">
            Set <code className="rounded bg-secondary px-1 py-0.5 text-xs font-mono">VITE_MAPBOX_TOKEN</code> in your environment.
          </p>
        </div>
      )}

      {/* Loading / error overlay for rooms */}
      {roomsLoading && (
        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background/90 px-4 py-3 shadow-lg backdrop-blur-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs font-medium text-foreground">Loading rooms…</span>
          </div>
        </div>
      )}

      {roomsError && (
        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background/90 px-5 py-4 shadow-lg backdrop-blur-sm">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-xs text-foreground">{roomsError}</p>
            <Button variant="outline" size="sm" className="gap-1" onClick={fetchRooms}>
              <RefreshCw className="h-3 w-3" /> Retry
            </Button>
          </div>
        </div>
      )}

      {/* ── Floor switcher pill ──────────────────────────────────── */}
      {floors.length > 0 && (
        <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2">
          <div className="flex overflow-hidden rounded-full border border-border bg-background/90 shadow-lg backdrop-blur-sm">
            {floors.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFloorId(f.id)}
                className={`min-w-[3rem] px-3 py-2 text-xs font-semibold transition-colors ${
                  activeFloorId === f.id
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                {floorDisplayName(f)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Accessible route toggle ─────────────────────────────── */}
      <div className="absolute bottom-20 left-4 z-20">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background/90 px-3 py-2 shadow-lg backdrop-blur-sm">
          <Accessibility className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Accessible only</span>
          <Switch checked={accessibleOnly} onCheckedChange={setAccessibleOnly} />
        </div>
      </div>

      {/* ── Legend card ──────────────────────────────────────────── */}
      <div className="absolute bottom-20 right-4 z-20">
        <div className="rounded-xl border border-border bg-background/90 shadow-lg backdrop-blur-sm">
          <button
            onClick={() => setLegendOpen(!legendOpen)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-foreground"
          >
            Legend
            {legendOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronUp className="h-3 w-3 text-muted-foreground" />}
          </button>
          {legendOpen && (
            <div className="flex flex-col gap-1.5 px-3 pb-3">
              {(Object.keys(PIN_CONFIG) as RoomType[]).map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: PIN_CONFIG[type].color }} />
                  <span className="text-[11px] text-muted-foreground">{PIN_CONFIG[type].label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom sheet for selected room ────────────────────── */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          {selectedRoom && (
            <>
              <DrawerHeader className="text-left">
                <DrawerTitle className="flex items-center gap-2">
                  {selectedRoom.name}
                  {selectedRoom.is_accessible && (
                    <Badge variant="secondary" className="text-xs">♿ Accessible</Badge>
                  )}
                </DrawerTitle>
                <DrawerDescription className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: PIN_CONFIG[selectedRoom.type]?.color,
                      color: PIN_CONFIG[selectedRoom.type]?.color,
                    }}
                  >
                    {PIN_CONFIG[selectedRoom.type]?.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {selectedRoom.floor_name ?? `P${selectedRoom.floor_number}`}
                  </span>
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex gap-3 px-4 pb-6 pt-2">
                <Button
                  className="flex-1 gap-2"
                  onClick={() => {
                    setDrawerOpen(false);
                    setNavigatingPin(selectedRoom);
                  }}
                >
                  <Navigation className="h-4 w-4" />
                  Navigate here
                </Button>
                <Button variant="outline" className="flex-1 gap-2">
                  <Star className="h-4 w-4" />
                  Save to favorites
                </Button>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {/* Navigation flow overlay */}
      {navigatingPin && (
        <NavigationFlow
          pin={{
            id: navigatingPin.id,
            name: navigatingPin.name,
            type: navigatingPin.type,
            floor: navigatingPin.floor_name ?? `P${navigatingPin.floor_number}`,
            isAccessible: navigatingPin.is_accessible,
          }}
          onClose={() => setNavigatingPin(null)}
        />
      )}
    </div>
  );
};

export default MapScreen;
