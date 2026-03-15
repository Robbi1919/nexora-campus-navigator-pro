import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { ChevronDown, ChevronUp, Accessibility, Navigation, Star, AlertCircle } from "lucide-react";
import NavigationFlow from "@/components/NavigationFlow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useFloors, useRoomsByFloor, type RoomRow, type FloorRow } from "@/hooks/use-supabase-data";

/*
 * ── SQL seed (kept as reference) ─────────────────────────────────
 * INSERT INTO rooms (name, type, floor, lat, lng, is_accessible) VALUES
 *   ('Aula F3','aula','P1', 40.7728, 14.7897, false),
 *   ('Bagno','bagno','P1', 40.7727, 14.7896, true),
 *   …
 */

/* ── SVG icon builders ────────────────────────────────────────── */

type RoomType = "aula" | "ufficio" | "bagno" | "ascensore" | "uscita_sicurezza" | "passaggio_disabili";

const PIN_CONFIG: Record<string, { color: string; label: string; svg: string }> = {
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

function createMarkerElement(type: string): HTMLDivElement {
  const cfg = PIN_CONFIG[type];
  const el = document.createElement("div");
  el.innerHTML = cfg?.svg ?? PIN_CONFIG.aula.svg;
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

  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navigatingPin, setNavigatingPin] = useState<RoomRow | null>(null);

  // Fetch floors from Supabase
  const { floors, loading: floorsLoading, error: floorsError, refetch: refetchFloors } = useFloors();
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null);

  // Set first floor as active once loaded
  useEffect(() => {
    if (floors.length > 0 && !activeFloorId) {
      setActiveFloorId(floors[0].id);
    }
  }, [floors, activeFloorId]);

  // Fetch rooms for active floor
  const {
    rooms,
    loading: roomsLoading,
    error: roomsError,
    refetch: refetchRooms,
  } = useRoomsByFloor(activeFloorId, accessibleOnly);

  const activeFloor = floors.find((f) => f.id === activeFloorId);

  /* ── Initialise map ──────────────────────────────────────────── */
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return;
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

  /* ── Render markers when rooms change ──────────────────────── */
  const renderMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const map = mapRef.current;
    if (!map) return;

    rooms.forEach((room) => {
      if (room.x_coord == null || room.y_coord == null) return;

      const el = createMarkerElement(room.type);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedRoom(room);
        setDrawerOpen(true);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([room.x_coord, room.y_coord]) // x=lng, y=lat
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [rooms]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.loaded()) renderMarkers();
    else {
      map.on("load", renderMarkers);
      return () => {
        map.off("load", renderMarkers);
      };
    }
  }, [renderMarkers]);

  /* ── UI ──────────────────────────────────────────────────────── */
  return (
    <div className="relative h-[100dvh] w-full pb-[var(--nav-height)]">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* No-token fallback */}
      {!import.meta.env.VITE_MAPBOX_TOKEN && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-muted/90 px-6 text-center">
          <p className="text-lg font-semibold text-foreground">Mapbox token mancante</p>
          <p className="text-sm text-muted-foreground">
            Imposta <code className="rounded bg-secondary px-1 py-0.5 text-xs font-mono">VITE_MAPBOX_TOKEN</code> per
            abilitare la mappa.
          </p>
        </div>
      )}

      {/* Error state */}
      {(floorsError || roomsError) && (
        <div className="absolute left-1/2 top-16 z-30 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-xl border border-destructive bg-background px-4 py-2 shadow-lg">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-xs text-destructive">Errore nel caricamento</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchFloors();
                refetchRooms();
              }}
            >
              Riprova
            </Button>
          </div>
        </div>
      )}

      {/* ── Floor switcher pill ──────────────────────────────────── */}
      <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2">
        {floorsLoading ? (
          <Skeleton className="h-10 w-48 rounded-full" />
        ) : (
          <div className="flex overflow-hidden rounded-full border border-border bg-background/90 shadow-lg backdrop-blur-sm">
            {floors.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFloorId(f.id)}
                className={`min-w-[3rem] px-3 py-2 text-xs font-semibold transition-colors ${
                  activeFloorId === f.id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                }`}
              >
                {f.name ?? `P${f.floor_number}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading indicator for rooms */}
      {roomsLoading && (
        <div className="absolute left-1/2 top-16 z-20 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-xl bg-background/90 px-3 py-2 shadow-lg backdrop-blur-sm">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-xs text-muted-foreground">Caricamento...</span>
          </div>
        </div>
      )}

      {/* ── Accessible route toggle ─────────────────────────────── */}
      <div className="absolute bottom-20 left-4 z-20">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background/90 px-3 py-2 shadow-lg backdrop-blur-sm">
          <Accessibility className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Solo accessibili</span>
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
            Legenda
            {legendOpen ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
          {legendOpen && (
            <div className="flex flex-col gap-1.5 px-3 pb-3">
              {Object.entries(PIN_CONFIG).map(([type, cfg]) => (
                <div key={type} className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: cfg.color }} />
                  <span className="text-[11px] text-muted-foreground">{cfg.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom sheet for selected pin ────────────────────────── */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          {selectedRoom && (
            <>
              <DrawerHeader className="text-left">
                <DrawerTitle className="flex items-center gap-2">
                  {selectedRoom.name}
                  {selectedRoom.is_accessible && (
                    <Badge variant="secondary" className="text-xs">
                      ♿ Accessibile
                    </Badge>
                  )}
                </DrawerTitle>
                <DrawerDescription className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: (PIN_CONFIG[selectedRoom.type] ?? { color: "#6B7280" }).color,
                      color: (PIN_CONFIG[selectedRoom.type] ?? { color: "#6B7280" }).color,
                    }}
                  >
                    {(PIN_CONFIG[selectedRoom.type] ?? { label: selectedRoom.type }).label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {activeFloor?.name ?? `P${activeFloor?.floor_number}`}
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
                  Naviga qui
                </Button>
                <Button variant="outline" className="flex-1 gap-2">
                  <Star className="h-4 w-4" />
                  Salva
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
            floor: activeFloor?.name ?? `P${activeFloor?.floor_number}`,
            isAccessible: navigatingPin.is_accessible ?? false,
          }}
          onClose={() => setNavigatingPin(null)}
        />
      )}
    </div>
  );
};

export default MapScreen;
