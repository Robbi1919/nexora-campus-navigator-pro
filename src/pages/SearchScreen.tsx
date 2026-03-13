/*
 * ── SEED DATA (SQL) ─────────────────────────────────────────────
 * INSERT INTO rooms (name, floor_id, type, is_accessible, description, x_coord, y_coord) VALUES
 *   ('Aula F3',              '<floor_p2_id>', 'aula',              false, 'Large lecture hall with 120 seats and projector.', NULL, NULL),
 *   ('Aula F5',              '<floor_p1_id>', 'aula',              false, 'Medium-sized classroom with 60 seats and smart board.', NULL, NULL),
 *   ('Aula del Consiglio',   '<floor_p2_id>', 'aula',              true,  'Accessible council hall used for faculty meetings and events.', NULL, NULL),
 *   ('Ufficio Segreteria',   '<floor_p0_id>', 'ufficio',           false, 'Student administration office for enrolment and transcripts.', NULL, NULL),
 *   ('Bagno P1',             '<floor_p1_id>', 'bagno',             false, 'Public restrooms located near the central staircase.', NULL, NULL),
 *   ('Ascensore Edificio F', '<floor_p0_id>', 'ascensore',         true,  'Accessible elevator serving all floors of Edificio F.', NULL, NULL),
 *   ('Passaggio Disabili',   '<floor_p1_id>', 'passaggio_disabili',true,  'Wheelchair-accessible passage between corridors.', NULL, NULL),
 *   ('Uscita Sicurezza',     '<floor_p1_id>', 'uscita_sicurezza',  false, 'Emergency exit near central staircase.', NULL, NULL);
 */

import { useState, useEffect, useRef, useCallback } from "react";
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
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import NavigationFlow, { type NavPin } from "@/components/NavigationFlow";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

/* ── Type config ─────────────────────────────────────────────── */

type RoomType = "aula" | "ufficio" | "bagno" | "ascensore" | "uscita_sicurezza" | "passaggio_disabili";

const TYPE_CONFIG: Record<RoomType, { color: string; label: string; icon: string }> = {
  aula: { color: "#2563EB", label: "Aula", icon: "A" },
  ufficio: { color: "#0891B2", label: "Ufficio", icon: "U" },
  bagno: { color: "#16A34A", label: "Bagno", icon: "B" },
  ascensore: { color: "#EA580C", label: "Ascensore", icon: "↕" },
  uscita_sicurezza: { color: "#DC2626", label: "Uscita sicurezza", icon: "!" },
  passaggio_disabili: { color: "#9333EA", label: "Passaggio disabili", icon: "♿" },
};

const TYPE_IMAGES: Partial<Record<RoomType, string>> = {
  aula: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800",
  ufficio: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
};

const FILTER_CHIPS: { label: string; value: RoomType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Aule", value: "aula" },
  { label: "Uffici", value: "ufficio" },
  { label: "Bagni", value: "bagno" },
  { label: "Ascensori", value: "ascensore" },
  { label: "Uscite", value: "uscita_sicurezza" },
  { label: "Accessibilità", value: "passaggio_disabili" },
];

const PAGE_SIZE = 20;

/* ── Enriched room with joined floor/building data ───────────── */

interface EnrichedRoom {
  id: string;
  name: string;
  type: RoomType;
  is_accessible: boolean | null;
  description: string | null;
  floor_name: string | null;
  floor_number: number;
  building_name: string;
}

/* ── Icon component ──────────────────────────────────────────── */

function TypeIcon({ type, size = "md" }: { type: RoomType; size?: "sm" | "md" }) {
  const cfg = TYPE_CONFIG[type];
  if (!cfg) return null;
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
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<RoomType | "all">("all");

  // Data state
  const [rooms, setRooms] = useState<EnrichedRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // Bottom sheet
  const [selectedRoom, setSelectedRoom] = useState<EnrichedRoom | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Departure modal
  const [departureOpen, setDepartureOpen] = useState(false);
  const [departureTarget, setDepartureTarget] = useState<EnrichedRoom | null>(null);

  // Navigation flow
  const [navigatingPin, setNavigatingPin] = useState<NavPin | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  /* ── Debounce query ────────────────────────────────────────── */

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  /* ── Reset pagination on filter/query change ───────────────── */

  useEffect(() => {
    setRooms([]);
    setPage(0);
    setHasMore(true);
    setError(null);
  }, [debouncedQuery, activeFilter]);

  /* ── Fetch rooms from Supabase ─────────────────────────────── */

  const fetchRooms = useCallback(async (pageNum: number) => {
    const isFirstPage = pageNum === 0;
    if (isFirstPage) setLoading(true);
    else setLoadingMore(true);

    try {
      let q = supabase
        .from("rooms")
        .select("id, name, type, is_accessible, description, floor_id, floors!inner(floor_number, name, building_id, buildings!inner(name))")
        .order("name", { ascending: true })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (activeFilter !== "all") {
        q = q.eq("type", activeFilter);
      }

      if (debouncedQuery.trim()) {
        q = q.ilike("name", `%${debouncedQuery.trim()}%`);
      }

      const { data, error: fetchError } = await q;

      if (fetchError) throw fetchError;

      const enriched: EnrichedRoom[] = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        type: r.type as RoomType,
        is_accessible: r.is_accessible,
        description: r.description,
        floor_name: r.floors?.name ?? null,
        floor_number: r.floors?.floor_number ?? 0,
        building_name: r.floors?.buildings?.name ?? "Unknown",
      }));

      if (isFirstPage) {
        setRooms(enriched);
      } else {
        setRooms((prev) => [...prev, ...enriched]);
      }

      setHasMore(enriched.length === PAGE_SIZE);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load rooms");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedQuery, activeFilter]);

  useEffect(() => {
    fetchRooms(page);
  }, [page, fetchRooms]);

  /* ── Infinite scroll ───────────────────────────────────────── */

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (loadingMore || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 100) {
        setPage((p) => p + 1);
      }
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [loadingMore, hasMore]);

  /* ── Handlers ──────────────────────────────────────────────── */

  const openSheet = (room: EnrichedRoom) => {
    setSelectedRoom(room);
    setSheetOpen(true);
  };

  const handleGo = (room: EnrichedRoom) => {
    setSheetOpen(false);
    setDepartureTarget(room);
    setDepartureOpen(true);
  };

  const handleChooseFromMap = () => {
    setDepartureOpen(false);
    navigate("/map");
  };

  const startNav = (room: EnrichedRoom) => {
    setDepartureOpen(false);
    setNavigatingPin({
      id: room.id,
      name: room.name,
      type: room.type,
      floor: room.floor_name ?? `P${room.floor_number}`,
      isAccessible: room.is_accessible ?? false,
    });
  };

  const floorLabel = (room: EnrichedRoom) =>
    room.floor_name ?? `Floor ${room.floor_number}`;

  /* ── Render ────────────────────────────────────────────────── */

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
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 pt-3">
        {/* Loading skeleton */}
        {loading ? (
          <div className="flex flex-col gap-2 pb-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
            <p className="text-sm font-medium text-foreground">Failed to load rooms</p>
            <p className="text-xs text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" className="gap-2" onClick={() => { setError(null); setPage(0); setRooms([]); setHasMore(true); }}>
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
          </div>
        ) : rooms.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No results found</p>
            <p className="text-xs text-muted-foreground">Try a different search term or filter</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-4">
            {rooms.map((room) => {
              const cfg = TYPE_CONFIG[room.type];
              if (!cfg) return null;
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
                      <span className="text-sm" title="Accessible">♿</span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Infinite scroll loading spinner */}
            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* No more results */}
            {!hasMore && rooms.length > 0 && (
              <p className="py-3 text-center text-xs text-muted-foreground">No more results</p>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom sheet ───────────────────────────────────────── */}
      <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent className="max-h-[85dvh]">
          {selectedRoom && (() => {
            const cfg = TYPE_CONFIG[selectedRoom.type];
            return (
              <>
                <div className="overflow-y-auto">
                  <div className="pb-4">
                    <div className="absolute right-4 top-4 z-10">
                      <button onClick={() => setSheetOpen(false)} className="rounded-full p-1 hover:bg-accent">
                        <X className="h-5 w-5 text-muted-foreground" />
                      </button>
                    </div>

                    {TYPE_IMAGES[selectedRoom.type] ? (
                      <div className="aspect-video w-full overflow-hidden">
                        <img
                          src={TYPE_IMAGES[selectedRoom.type]}
                          alt={selectedRoom.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center bg-muted">
                        <TypeIcon type={selectedRoom.type} size="md" />
                      </div>
                    )}

                    <div className="px-4 pt-4">
                      <h3 className="text-xl font-bold text-foreground">{selectedRoom.name}</h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {cfg && (
                          <Badge variant="outline" style={{ borderColor: cfg.color, color: cfg.color }}>
                            {cfg.label}
                          </Badge>
                        )}
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
                          Accessible: {selectedRoom.is_accessible ? "Yes ♿" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border bg-background p-4">
                  <Button
                    className="w-full gap-2 text-base font-bold"
                    onClick={() => handleGo(selectedRoom)}
                  >
                    GO <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
              </>
            );
          })()}
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
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          </div>

          <div className="flex flex-1 flex-col px-5 pt-8">
            <h2 className="text-2xl font-bold text-foreground">Departing from...</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose where you're starting your journey
            </p>

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
                  <p className="text-base font-semibold text-foreground">Choose from map</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Tap your current position on the campus map
                  </p>
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
                  <p className="text-base font-semibold text-foreground">Start navigation</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Begin navigating to {departureTarget.name}
                  </p>
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
          onClose={() => setNavigatingPin(null)}
        />
      )}
    </div>
  );
};

export default SearchScreen;
