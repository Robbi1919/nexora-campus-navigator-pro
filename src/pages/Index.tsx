import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Camera, ArrowRight, X, Navigation, Star } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import ScannerViewfinder from "@/components/ScannerViewfinder";
import QuickAccessChips from "@/components/QuickAccessChips";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import NavigationFlow, { type NavPin } from "@/components/NavigationFlow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

/* ── QR code → Room mapping ──────────────────────────────────── */

interface QrRoom {
  id: string;
  name: string;
  type: string;
  floor: string;
  building: string;
  isAccessible: boolean;
  typeColor: string;
  typeLabel: string;
}

const QR_MAP: Record<string, QrRoom> = {
  NEXORA_EDILF_P1_AULAF3: {
    id: "1",
    name: "Aula F3",
    type: "aula",
    floor: "P1",
    building: "Edificio F",
    isAccessible: false,
    typeColor: "#2563EB",
    typeLabel: "Aula",
  },
  NEXORA_EDILF_P1_BAGNO: {
    id: "3",
    name: "Bagno",
    type: "bagno",
    floor: "P1",
    building: "Edificio F",
    isAccessible: true,
    typeColor: "#16A34A",
    typeLabel: "Bagno",
  },
  NEXORA_EDILF_P0_ASCENS: {
    id: "4",
    name: "Ascensore",
    type: "ascensore",
    floor: "P0",
    building: "Edificio F",
    isAccessible: true,
    typeColor: "#EA580C",
    typeLabel: "Ascensore",
  },
};

/* ── Component ───────────────────────────────────────────────── */

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Scanner state
  const [cameraState, setCameraState] = useState<"loading" | "active" | "denied" | "error">("loading");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-scanner-region";
  const isScannerTab = location.pathname === "/";
  const scanningRef = useRef(false);

  // Room bottom sheet
  const [scannedRoom, setScannedRoom] = useState<QrRoom | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Navigation flow
  const [navigatingPin, setNavigatingPin] = useState<NavPin | null>(null);

  /* ── Start / stop camera ───────────────────────────────────── */

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && scanningRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // already stopped
      }
      scanningRef.current = false;
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (scanningRef.current) return;

    // Ensure container exists
    const container = document.getElementById(scannerContainerId);
    if (!container) return;

    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(scannerContainerId);
    }

    try {
      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
          disableFlip: false,
        },
        (decodedText) => {
          // On successful scan
          const room = QR_MAP[decodedText.trim()];
          if (room) {
            stopScanner();
            setScannedRoom(room);
            setDrawerOpen(true);
          } else {
            toast.error("QR code not recognized. Try another.");
          }
        },
        () => {
          // ignore scan failures (no QR in frame)
        }
      );
      scanningRef.current = true;
      setCameraState("active");
    } catch (err: any) {
      if (err?.toString?.().includes("NotAllowedError") || err?.toString?.().includes("Permission")) {
        setCameraState("denied");
      } else {
        setCameraState("error");
        console.error("Scanner error:", err);
      }
    }
  }, [stopScanner]);

  // Auto-start on tab focus, stop on leave
  useEffect(() => {
    if (isScannerTab && !drawerOpen && !navigatingPin) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => startScanner(), 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isScannerTab, startScanner, stopScanner, drawerOpen, navigatingPin]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  /* ── Handlers ──────────────────────────────────────────────── */

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleChipClick = (label: string) => {
    navigate(`/search?category=${encodeURIComponent(label)}`);
  };

  const handleNavigate = () => {
    if (!scannedRoom) return;
    setDrawerOpen(false);
    setNavigatingPin({
      id: scannedRoom.id,
      name: scannedRoom.name,
      type: scannedRoom.type,
      floor: scannedRoom.floor,
      isAccessible: scannedRoom.isAccessible,
    });
  };

  const handleDrawerClose = (open: boolean) => {
    setDrawerOpen(open);
    if (!open) {
      // Resume scanning after closing drawer
      setTimeout(() => startScanner(), 300);
    }
  };

  /* ── Render ────────────────────────────────────────────────── */

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pb-[var(--nav-height)]">
      <OnboardingOverlay />

      {/* Header */}
      <header className="relative z-30 flex items-center justify-between px-5 pt-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nexora</h1>
          <p className="text-xs text-muted-foreground">UNISA Campus Navigator</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
          N
        </div>
      </header>

      {/* Search Bar */}
      <div className="relative z-30 px-5 py-3">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search room, office, building..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Search rooms and buildings"
            />
          </div>
        </form>
      </div>

      {/* Scanner Area */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 px-5">
        {/* Camera feed — html5-qrcode renders video here */}
        <div className="relative w-64 sm:w-72 aspect-square overflow-hidden rounded-2xl">
          {/* The scanner renders into this div */}
          <div
            id={scannerContainerId}
            className="absolute inset-0 [&>video]:object-cover [&>video]:w-full [&>video]:h-full"
            style={{ width: "100%", height: "100%" }}
          />

          {/* Corner bracket overlay on top of camera */}
          <div className="pointer-events-none absolute inset-0 z-10">
            <ScannerViewfinder />
          </div>

          {/* Permission denied overlay */}
          {cameraState === "denied" && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-card/95 rounded-2xl">
              <Camera className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Camera access required</p>
              <p className="text-xs text-muted-foreground text-center px-4">
                Allow camera access to scan QR codes
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => navigate("/search")}
              >
                Search manually instead <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Loading state */}
          {cameraState === "loading" && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/80 rounded-2xl">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-xs text-muted-foreground">Starting camera...</p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Point at a QR code</p>
          <p className="text-xs text-muted-foreground">Find QR codes on walls and doors around campus</p>
        </div>

        {/* Manual search fallback */}
        <button
          onClick={() => navigate("/search")}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Search manually <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Quick Access */}
      <div className="relative z-30 px-5 pb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Access</p>
        <QuickAccessChips onChipClick={handleChipClick} />
      </div>

      {/* ── Scanned room bottom sheet ────────────────────────────── */}
      <Drawer open={drawerOpen} onOpenChange={handleDrawerClose}>
        <DrawerContent>
          {scannedRoom && (
            <>
              <div className="absolute right-4 top-4 z-10">
                <button
                  onClick={() => handleDrawerClose(false)}
                  className="rounded-full p-1 hover:bg-accent"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <DrawerHeader className="text-left">
                <DrawerTitle className="flex items-center gap-2">
                  {scannedRoom.name}
                  {scannedRoom.isAccessible && (
                    <Badge variant="secondary" className="text-xs">
                      ♿ Accessible
                    </Badge>
                  )}
                </DrawerTitle>
                <DrawerDescription className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: scannedRoom.typeColor,
                      color: scannedRoom.typeColor,
                    }}
                  >
                    {scannedRoom.typeLabel}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {scannedRoom.building} · Floor {scannedRoom.floor}
                  </span>
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex flex-col gap-3 px-4 pb-6 pt-2">
                <Button className="w-full gap-2" onClick={handleNavigate}>
                  <Navigation className="h-4 w-4" />
                  Navigate here
                </Button>
                <Button variant="outline" className="w-full gap-2">
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

export default Index;
