import { useState, useMemo } from "react";
import {
  Search,
  X,
  Navigation,
  Star,
  Accessibility,
  MapPin,
  ParkingCircle,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import NavigationFlow, { type NavPin } from "@/components/NavigationFlow";
import { useNavigate } from "react-router-dom";

/* ── Type config (matches map markers) ───────────────────────── */

type LocationType = "aula" | "edificio" | "ufficio" | "bagno" | "ascensore" | "parcheggio";

const TYPE_CONFIG: Record<LocationType, { color: string; label: string; icon: string }> = {
  aula: { color: "#2563EB", label: "Aula", icon: "A" },
  edificio: { color: "#7C3AED", label: "Edificio", icon: "E" },
  ufficio: { color: "#0891B2", label: "Ufficio", icon: "U" },
  bagno: { color: "#16A34A", label: "Bagno", icon: "B" },
  ascensore: { color: "#EA580C", label: "Ascensore", icon: "↕" },
  parcheggio: { color: "#64748B", label: "Parcheggio", icon: "P" },
};

const TYPE_IMAGES: Partial<Record<LocationType, string>> = {
  aula: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800",
  edificio: "https://images.unsplash.com/photo-1562774053-701939374585?w=800",
  ufficio: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
  parcheggio: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800",
};

/* ── Filter chips ────────────────────────────────────────────── */

const FILTER_CHIPS: { label: string; value: LocationType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Aule", value: "aula" },
  { label: "Uffici", value: "ufficio" },
  { label: "Bagni", value: "bagno" },
  { label: "Ascensori", value: "ascensore" },
  { label: "Uscite", value: "edificio" },
  { label: "Parcheggi", value: "parcheggio" },
];

/* ── Location data ───────────────────────────────────────────── */

interface Location {
  id: string;
  name: string;
  floor: string;
  building: string;
  type: LocationType;
  isAccessible: boolean;
  description: string;
}

const LOCATIONS: Location[] = [
  { id: "1", name: "Aula F3", floor: "P2", building: "Edificio F", type: "aula", isAccessible: false, description: "Large lecture hall with 120 seats and projector." },
  { id: "2", name: "Aula F5", floor: "P1", building: "Edificio F", type: "aula", isAccessible: false, description: "Medium-sized classroom with 60 seats and smart board." },
  { id: "3", name: "Aula del Consiglio", floor: "P2", building: "Edificio C", type: "aula", isAccessible: true, description: "Accessible council hall used for faculty meetings and events." },
  { id: "4", name: "Edificio F3", floor: "Campus", building: "UNISA", type: "edificio", isAccessible: false, description: "Main engineering building on the UNISA Fisciano campus." },
  { id: "5", name: "Ufficio Segreteria", floor: "P0", building: "Edificio C", type: "ufficio", isAccessible: false, description: "Student administration office for enrolment and transcripts." },
  { id: "6", name: "Bagno P1", floor: "P1", building: "Edificio F", type: "bagno", isAccessible: false, description: "Public restrooms located near the central staircase." },
  { id: "7", name: "Ascensore Edificio F", floor: "P0", building: "Edificio F", type: "ascensore", isAccessible: true, description: "Accessible elevator serving all floors of Edificio F." },
  { id: "8", name: "Parcheggio Studenti Nord", floor: "Esterno", building: "Campus UNISA", type: "parcheggio", isAccessible: true, description: "Open-air parking lot north of Edificio F with 200 spaces." },
  { id: "9", name: "Parcheggio Studenti Sud", floor: "Esterno", building: "Via delle Stelle", type: "parcheggio", isAccessible: true, description: "Parking area south of campus near Edificio C." },
];

/* ── Nearby parking mapping ──────────────────────────────────── */

const NEARBY_PARKING: Record<string, { id: string; name: string; distance: string }[]> = {
  "Edificio F": [{ id: "8", name: "Parcheggio Studenti Nord", distance: "~200m" }],
  "Edificio C": [{ id: "9", name: "Parcheggio Studenti Sud", distance: "~200m" }],
  "UNISA": [
    { id: "8", name: "Parcheggio Studenti Nord", distance: "~300m" },
    { id: "9", name: "Parcheggio Studenti Sud", distance: "~350m" },
  ],
  "Campus UNISA": [
    { id: "8", name: "Parcheggio Studenti Nord", distance: "~0m" },
    { id: "9", name: "Parcheggio Studenti Sud", distance: "~500m" },
  ],
  "Via delle Stelle": [
    { id: "9", name: "Parcheggio Studenti Sud", distance: "~0m" },
    { id: "8", name: "Parcheggio Studenti Nord", distance: "~500m" },
  ],
};

/* ── Icon component ──────────────────────────────────────────── */

function TypeIcon({ type, size = "md" }: { type: LocationType; size?: "sm" | "md" }) {
  const cfg = TYPE_CONFIG[type];
  const dim = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-lg font-bold text-primary-foreground`}
      style={{ backgroundColor: cfg.color }}
    >
      {cfg.icon}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */

const SearchScreen = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<LocationType | "all">("all");

  // Bottom sheet
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Departure modal
  const [departureOpen, setDepartureOpen] = useState(false);
  const [departureTarget, setDepartureTarget] = useState<Location | null>(null);
  const [showParkingPicker, setShowParkingPicker] = useState(false);

  // Navigation flow
  const [navigatingPin, setNavigatingPin] = useState<NavPin | null>(null);

  /* ── Filtered list ──────────────────────────────────────────── */

  const filtered = useMemo(() => {
    return LOCATIONS.filter((loc) => {
      if (activeFilter !== "all" && loc.type !== activeFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          loc.name.toLowerCase().includes(q) ||
          loc.building.toLowerCase().includes(q) ||
          loc.floor.toLowerCase().includes(q) ||
          TYPE_CONFIG[loc.type].label.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [query, activeFilter]);

  /* ── Handlers ───────────────────────────────────────────────── */

  const openSheet = (loc: Location) => {
    setSelectedLocation(loc);
    setSheetOpen(true);
  };

  const handleGo = (loc: Location) => {
    setSheetOpen(false);
    setDepartureTarget(loc);
    setDepartureOpen(true);
    setShowParkingPicker(false);
  };

  const handleGoParking = (parkingId: string) => {
    const parking = LOCATIONS.find((l) => l.id === parkingId);
    if (parking) {
      setSheetOpen(false);
      setDepartureTarget(parking);
      setDepartureOpen(true);
      setShowParkingPicker(false);
    }
  };

  const startNavFromParking = (parkingId: string) => {
    if (!departureTarget) return;
    setDepartureOpen(false);
    setNavigatingPin({
      id: departureTarget.id,
      name: departureTarget.name,
      type: departureTarget.type,
      floor: departureTarget.floor,
      isAccessible: departureTarget.isAccessible,
    });
  };

  const handleChooseFromMap = () => {
    setDepartureOpen(false);
    // Navigate to map tab — in a real app we'd pass the destination context
    navigate("/map");
  };

  const nearbyParking = selectedLocation
    ? NEARBY_PARKING[selectedLocation.building] ?? []
    : [];

  const departureParkingOptions = departureTarget
    ? NEARBY_PARKING[departureTarget.building] ?? LOCATIONS.filter((l) => l.type === "parcheggio").map((l) => ({ id: l.id, name: l.name, distance: "~300m" }))
    : [];

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pb-[var(--nav-height)]">
      {/* ── Search bar ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 pt-4 pb-3 backdrop-blur-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search rooms, buildings, offices..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 w-full rounded-xl border border-input bg-card pl-11 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-accent"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* ── Filter chips ───────────────────────────────────────── */}
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {FILTER_CHIPS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setActiveFilter(value)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeFilter === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Location list ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pt-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No results found</p>
            <p className="text-xs text-muted-foreground">Try a different search term or filter</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-4">
            {filtered.map((loc) => {
              const cfg = TYPE_CONFIG[loc.type];
              return (
                <button
                  key={loc.id}
                  onClick={() => openSheet(loc)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-colors hover:bg-accent active:scale-[0.98]"
                >
                  <TypeIcon type={loc.type} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{loc.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {loc.floor !== "Campus" && loc.floor !== "Esterno" ? `Floor ${loc.floor}, ` : `${loc.floor}, `}
                      {loc.building}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={{ borderColor: cfg.color, color: cfg.color }}
                    >
                      {cfg.label}
                    </Badge>
                    {loc.isAccessible && (
                      <span className="text-sm" title="Accessible">♿</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Bottom sheet ───────────────────────────────────────── */}
      <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent className="max-h-[85dvh]">
          {selectedLocation && (
            <>
              {/* Scrollable content area */}
              <div className="overflow-y-auto">
                <div className="pb-4">
                  {/* Close button */}
                  <div className="absolute right-4 top-4 z-10">
                    <button onClick={() => setSheetOpen(false)} className="rounded-full p-1 hover:bg-accent">
                      <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Image */}
                  {TYPE_IMAGES[selectedLocation.type] ? (
                    <div className="aspect-video w-full overflow-hidden">
                      <img
                        src={TYPE_IMAGES[selectedLocation.type]}
                        alt={selectedLocation.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center bg-muted">
                      <TypeIcon type={selectedLocation.type} size="md" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="px-4 pt-4">
                    <h3 className="text-xl font-bold text-foreground">{selectedLocation.name}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: TYPE_CONFIG[selectedLocation.type].color,
                          color: TYPE_CONFIG[selectedLocation.type].color,
                        }}
                      >
                        {TYPE_CONFIG[selectedLocation.type].label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {selectedLocation.floor !== "Campus" && selectedLocation.floor !== "Esterno"
                          ? `Floor ${selectedLocation.floor}`
                          : selectedLocation.floor}
                        {" · "}
                        {selectedLocation.building}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{selectedLocation.description}</p>

                    {/* Accessibility row */}
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <Accessibility className="h-4 w-4 text-primary" />
                      <span className="text-foreground">
                        Accessible: {selectedLocation.isAccessible ? "Yes ♿" : "No"}
                      </span>
                    </div>

                    {/* Nearby parking - shown for ALL types (even parcheggio shows others) */}
                    {nearbyParking.length > 0 && (
                      <div className="mt-5">
                        <p className="mb-2 text-sm font-semibold text-foreground">🅿️ Nearby Parking</p>
                        <div className="flex flex-col gap-2">
                          {nearbyParking.map((p) => {
                            const parkingLoc = LOCATIONS.find((l) => l.id === p.id);
                            return (
                              <div
                                key={p.id}
                                className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2"
                              >
                                <div className="flex items-center gap-2">
                                  <TypeIcon type="parcheggio" size="sm" />
                                  <div>
                                    <p className="text-xs font-semibold text-foreground">{p.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{p.distance}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {parkingLoc?.isAccessible && <span className="text-xs">♿</span>}
                                  <button
                                    onClick={() => handleGoParking(p.id)}
                                    className="text-xs font-semibold text-primary hover:underline"
                                  >
                                    Directions
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Fixed footer with GO button - always visible */}
              <div className="border-t border-border bg-background p-4">
                <Button
                  className="w-full gap-2 text-base font-bold"
                  style={{ backgroundColor: "hsl(224, 76%, 40%)" }}
                  onClick={() => handleGo(selectedLocation)}
                >
                  GO <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {/* ── Departure modal ────────────────────────────────────── */}
      {departureOpen && departureTarget && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background animate-fade-in">
          {/* Top bar */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <button
              onClick={() => { setDepartureOpen(false); setShowParkingPicker(false); }}
              className="flex items-center gap-1 text-sm font-medium text-primary"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          </div>

          <div className="flex flex-1 flex-col px-5 pt-8">
            <h2 className="text-2xl font-bold text-foreground">Departing from...</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose where you're starting your journey
            </p>

            {/* Destination summary */}
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-4">
              <MapPin className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">{departureTarget.name}</p>
                <p className="text-xs text-muted-foreground">
                  {departureTarget.floor !== "Campus" && departureTarget.floor !== "Esterno"
                    ? `Floor ${departureTarget.floor}`
                    : departureTarget.floor}
                  {" · "}
                  {departureTarget.building}
                </p>
              </div>
            </div>

            {/* Option cards */}
            {!showParkingPicker ? (
              <div className="mt-6 flex flex-col gap-4">
                {/* Choose from map */}
                <button
                  onClick={handleChooseFromMap}
                  className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-colors hover:bg-accent active:scale-[0.98]"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">Choose from map</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Tap your current position on the campus map
                    </p>
                  </div>
                </button>

                {/* Depart from parking */}
                <button
                  onClick={() => setShowParkingPicker(true)}
                  className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-colors hover:bg-accent active:scale-[0.98]"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <ParkingCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">Start from a parking lot</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Navigate from the nearest parking to your destination
                    </p>
                  </div>
                </button>
              </div>
            ) : (
              /* Parking picker */
              <div className="mt-6 flex flex-col gap-3">
                <p className="text-sm font-semibold text-foreground">Select a parking lot:</p>
                {(departureParkingOptions.length > 0
                  ? departureParkingOptions
                  : LOCATIONS.filter((l) => l.type === "parcheggio").map((l) => ({ id: l.id, name: l.name, distance: "~300m" }))
                ).map((p) => {
                  const parkingLoc = LOCATIONS.find((l) => l.id === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => startNavFromParking(p.id)}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent active:scale-[0.98]"
                    >
                      <TypeIcon type="parcheggio" size="sm" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.distance}</p>
                      </div>
                      {parkingLoc?.isAccessible && <span className="text-sm">♿</span>}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => setShowParkingPicker(false)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back to options
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Navigation flow ────────────────────────────────────── */}
      {navigatingPin && (
        <NavigationFlow
          pin={navigatingPin}
          onClose={() => setNavigatingPin(null)}
        />
      )}
    </div>
  );
};

export default SearchScreen;
