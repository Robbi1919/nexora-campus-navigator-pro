import { useState, useRef, useCallback, useEffect } from "react";
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
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import NavigationFlow, { type NavPin } from "@/components/NavigationFlow";
import { useNavigate } from "react-router-dom";
import { useSearchRooms, type RoomWithContext } from "@/hooks/use-supabase-data";

/*
 * ── SQL seed (kept as reference) ─────────────────────────────────
 * INSERT INTO rooms VALUES
 *   ('1','Aula F3','aula','P2','Edificio F',false),
 *   ('2','Aula F5','aula','P1','Edificio F',false),
 *   ('3','Aula del Consiglio','aula','P2','Edificio C',true),
 *   …
 */

/* ── Type config ──────────────────────────────────────────────── */

type LocationType = "aula" | "ufficio" | "bagno" | "ascensore" | "uscita_sicurezza" | "passaggio_disabili";

const TYPE_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  aula: { color: "#2563EB", label: "Aula", icon: "A" },
  ufficio: { color: "#0891B2", label: "Ufficio", icon: "U" },
  bagno: { color: "#16A34A", label: "Bagno", icon: "B" },
  ascensore: { color: "#EA580C", label: "Ascensore", icon: "↕" },
  uscita_sicurezza: { color: "#DC2626", label: "Uscita sicurezza", icon: "🚪" },
  passaggio_disabili: { color: "#9333EA", label: "Passaggio disabili", icon: "♿" },
};

const FILTER_CHIPS: { label: string; value: string }[] = [
  { label: "Tutti", value: "all" },
  { label: "Aule", value: "aula" },
  { label: "Uffici", value: "ufficio" },
  { label: "Bagni", value: "bagno" },
  { label: "Ascensori", value: "ascensore" },
  { label: "Uscite", value: "uscita_sicurezza" },
  { label: "Disabili", value: "passaggio_disabili" },
];

/* ── Icon component ──────────────────────────────────────────── */

function TypeIcon({ type, size = "md" }: { type: string; size?: "sm" | "md" }) {
  const cfg = TYPE_CONFIG[type] ?? { color: "#6B7280", label: type, icon: "?" };
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

/* ── Skeleton card ───────────────────────────────────────────── */

function CardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */

const SearchScreen = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Supabase search hook
  const { rooms, loading, loadingMore, error, hasMore, loadMore, refetch } = useSearchRooms(query, activeFilter);

  // Bottom sheet
  const [selectedRoom, setSelectedRoom] = useState<RoomWithContext | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Departure modal
  const [departureOpen, setDepartureOpen] = useState(false);
  const [departureTarget, setDepartureTarget] = useState<RoomWithContext | null>(null);

  // Navigation flow
  const [navigatingPin, setNavigatingPin] = useState<NavPin | null>(null);

  // Infinite scroll ref
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasMore || loadingMore) return;
    const distBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distBottom < 100) loadMore();
  }, [hasMore, loadingMore, loadMore]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  /* ── Handlers ───────────────────────────────────────────────── */

  const openSheet = (room: RoomWithContext) => {
    setSelectedRoom(room);
    setSheetOpen(true);
  };

  const handleGo = (room: RoomWithContext) => {
    setSheetOpen(false);
    setDepartureTarget(room);
    setDepartureOpen(true);
  };

  const handleChooseFromMap = () => {
    setDepartureOpen(false);
    navigate("/map");
  };

  const startNav = (target: RoomWithContext) => {
    setDepartureOpen(false);
    setNavigatingPin({
      id: target.id,
      name: target.name,
      type: target.type,
      floor: target.floor_name ?? `P${target.floor_number}`,
      isAccessible: target.is_accessible ?? false,
    });
  };

  const floorLabel = (r: RoomWithContext) => r.floor_name ?? `P${r.floor_number}`;

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pb-[var(--nav-height)]">
      {/* ── Search bar ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 pt-4 pb-3 backdrop-blur-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cerca aule, edifici, uffici..."
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-3">
        {/* Error state */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
            <p className="text-sm font-medium text-foreground">Errore nel caricamento</p>
            <p className="text-xs text-muted-foreground mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch}>
              Riprova
            </Button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="flex flex-col gap-2 pb-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && rooms.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Nessun risultato</p>
            <p className="text-xs text-muted-foreground">Prova un termine di ricerca o filtro diverso</p>
          </div>
        )}

        {/* Results */}
        {!loading && !error && rooms.length > 0 && (
          <div className="flex flex-col gap-2 pb-4">
            {rooms.map((room) => {
              const cfg = TYPE_CONFIG[room.type] ?? { color: "#6B7280", label: room.type };
              return (
                <button
                  key={room.id}
                  onClick={() => openSheet(room)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-colors hover:bg-accent active:scale-[0.98]"
                >
                  <TypeIcon type={room.type} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{room.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {floorLabel(room)} · {room.building_name}
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
                    {room.is_accessible && (
                      <span className="text-sm" title="Accessible">
                        ♿
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Infinite scroll spinner */}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}

            {/* No more results */}
            {!hasMore && rooms.length > 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">Nessun altro risultato</p>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom sheet ───────────────────────────────────────── */}
      <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent className="max-h-[85dvh]">
          {selectedRoom && (
            <>
              <div className="overflow-y-auto">
                <div className="pb-4">
                  <div className="absolute right-4 top-4 z-10">
                    <button onClick={() => setSheetOpen(false)} className="rounded-full p-1 hover:bg-accent">
                      <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="flex aspect-video w-full items-center justify-center bg-muted">
                    <TypeIcon type={selectedRoom.type} size="md" />
                  </div>

                  <div className="px-4 pt-4">
                    <h3 className="text-xl font-bold text-foreground">{selectedRoom.name}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: (TYPE_CONFIG[selectedRoom.type] ?? { color: "#6B7280" }).color,
                          color: (TYPE_CONFIG[selectedRoom.type] ?? { color: "#6B7280" }).color,
                        }}
                      >
                        {(TYPE_CONFIG[selectedRoom.type] ?? { label: selectedRoom.type }).label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {floorLabel(selectedRoom)} · {selectedRoom.building_name}
                      </span>
                    </div>
                    {selectedRoom.description && (
                      <p className="mt-3 text-sm text-muted-foreground">{selectedRoom.description}</p>
                    )}

                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <Accessibility className="h-4 w-4 text-primary" />
                      <span className="text-foreground">
                        Accessibile: {selectedRoom.is_accessible ? "Sì ♿" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border bg-background p-4">
                <Button className="w-full gap-2 text-base font-bold" onClick={() => handleGo(selectedRoom)}>
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
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <button
              onClick={() => setDepartureOpen(false)}
              className="flex items-center gap-1 text-sm font-medium text-primary"
            >
              <ChevronLeft className="h-4 w-4" /> Indietro
            </button>
          </div>

          <div className="flex flex-1 flex-col px-5 pt-8">
            <h2 className="text-2xl font-bold text-foreground">Parti da...</h2>
            <p className="mt-1 text-sm text-muted-foreground">Scegli il punto di partenza</p>

            <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-4">
              <MapPin className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">{departureTarget.name}</p>
                <p className="text-xs text-muted-foreground">
                  {floorLabel(departureTarget)} · {departureTarget.building_name}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <button
                onClick={handleChooseFromMap}
                className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-colors hover:bg-accent active:scale-[0.98]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">Scegli dalla mappa</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Tocca la tua posizione attuale sulla mappa</p>
                </div>
              </button>

              <button
                onClick={() => startNav(departureTarget)}
                className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-colors hover:bg-accent active:scale-[0.98]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Navigation className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">Naviga direttamente</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Inizia la navigazione verso la destinazione</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation flow ────────────────────────────────────── */}
      {navigatingPin && (
        <NavigationFlow
          pin={navigatingPin}
          fromPin={departureTarget ?? undefined}
          onClose={() => setNavigatingPin(null)}
        />
      )}
    </div>
  );
};

export default SearchScreen;
