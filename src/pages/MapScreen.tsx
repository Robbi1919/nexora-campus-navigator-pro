import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { ChevronDown, ChevronUp, Accessibility, Navigation, Star, X } from "lucide-react";
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

/* ── Marker seed data ─────────────────────────────────────────── */

type RoomType = "aula" | "bagno" | "ascensore" | "uscita_sicurezza" | "passaggio_disabili";

interface MapPin {
  id: string;
  name: string;
  type: RoomType;
  floor: string;
  lat: number;
  lng: number;
  isAccessible: boolean;
}

const SEED_PINS: MapPin[] = [
  { id: "1", name: "Aula F3", type: "aula", floor: "P1", lat: 40.7728, lng: 14.7897, isAccessible: false },
  { id: "2", name: "Aula F5", type: "aula", floor: "P1", lat: 40.7729, lng: 14.7895, isAccessible: false },
  { id: "3", name: "Bagno", type: "bagno", floor: "P1", lat: 40.7727, lng: 14.7896, isAccessible: true },
  { id: "4", name: "Ascensore", type: "ascensore", floor: "P1", lat: 40.7726, lng: 14.7894, isAccessible: true },
  { id: "5", name: "Uscita Sicurezza", type: "uscita_sicurezza", floor: "P1", lat: 40.7730, lng: 14.7898, isAccessible: false },
  { id: "6", name: "Passaggio Disabili", type: "passaggio_disabili", floor: "P1", lat: 40.7725, lng: 14.7893, isAccessible: true },
];

const FLOORS = ["B1", "P0", "P1", "P2", "P3"];

/* ── SVG icon builders ────────────────────────────────────────── */

const PIN_CONFIG: Record<RoomType, { color: string; label: string; svg: string }> = {
  aula: {
    color: "#2563EB",
    label: "Aula",
    svg: `<svg width="32" height="32" viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="24" rx="4" fill="#2563EB"/><text x="16" y="21" text-anchor="middle" fill="white" font-size="14" font-weight="700" font-family="Inter,sans-serif">A</text></svg>`,
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
  el.innerHTML = PIN_CONFIG[type].svg;
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

  const [activeFloor, setActiveFloor] = useState("P1");
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navigatingPin, setNavigatingPin] = useState<MapPin | null>(null);

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

  /* ── Render markers when floor / accessibleOnly changes ──────── */
  const renderMarkers = useCallback(() => {
    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const map = mapRef.current;
    if (!map) return;

    const visiblePins = SEED_PINS.filter((p) => {
      if (p.floor !== activeFloor) return false;
      if (accessibleOnly && !p.isAccessible) return false;
      return true;
    });

    visiblePins.forEach((pin) => {
      const el = createMarkerElement(pin.type);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedPin(pin);
        setDrawerOpen(true);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [activeFloor, accessibleOnly]);

  useEffect(() => {
    // Wait for map to be ready
    const map = mapRef.current;
    if (!map) return;

    if (map.loaded()) {
      renderMarkers();
    } else {
      map.on("load", renderMarkers);
      return () => {
        map.off("load", renderMarkers);
      };
    }
  }, [renderMarkers]);

  /* ── UI ──────────────────────────────────────────────────────── */
  return (
    <div className="relative h-[100dvh] w-full pb-[var(--nav-height)]">
      {/* Map container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* No-token fallback */}
      {!import.meta.env.VITE_MAPBOX_TOKEN && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-muted/90 px-6 text-center">
          <p className="text-lg font-semibold text-foreground">Mapbox token missing</p>
          <p className="text-sm text-muted-foreground">
            Set <code className="rounded bg-secondary px-1 py-0.5 text-xs font-mono">VITE_MAPBOX_TOKEN</code> in
            your environment to enable the map.
          </p>
        </div>
      )}

      {/* ── Floor switcher pill ──────────────────────────────────── */}
      <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2">
        <div className="flex overflow-hidden rounded-full border border-border bg-background/90 shadow-lg backdrop-blur-sm">
          {FLOORS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFloor(f)}
              className={`min-w-[3rem] px-3 py-2 text-xs font-semibold transition-colors ${
                activeFloor === f
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

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
            {legendOpen ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
          {legendOpen && (
            <div className="flex flex-col gap-1.5 px-3 pb-3">
              {(Object.keys(PIN_CONFIG) as RoomType[]).map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ backgroundColor: PIN_CONFIG[type].color }}
                  />
                  <span className="text-[11px] text-muted-foreground">{PIN_CONFIG[type].label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom sheet for selected pin ────────────────────────── */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          {selectedPin && (
            <>
              <DrawerHeader className="text-left">
                <DrawerTitle className="flex items-center gap-2">
                  {selectedPin.name}
                  {selectedPin.isAccessible && (
                    <Badge variant="secondary" className="text-xs">
                      ♿ Accessible
                    </Badge>
                  )}
                </DrawerTitle>
                <DrawerDescription className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: PIN_CONFIG[selectedPin.type].color,
                      color: PIN_CONFIG[selectedPin.type].color,
                    }}
                  >
                    {PIN_CONFIG[selectedPin.type].label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Edificio F · Floor {selectedPin.floor}
                  </span>
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex gap-3 px-4 pb-6 pt-2">
                <Button
                  className="flex-1 gap-2"
                  onClick={() => {
                    setDrawerOpen(false);
                    setNavigatingPin(selectedPin);
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
          pin={navigatingPin}
          onClose={() => setNavigatingPin(null)}
        />
      )}
    </div>
  );
};

export default MapScreen;
