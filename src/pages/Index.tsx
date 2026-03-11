import { useState } from "react";
import { Search } from "lucide-react";
import ScannerViewfinder from "@/components/ScannerViewfinder";
import QuickAccessChips from "@/components/QuickAccessChips";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleChipClick = (label: string) => {
    navigate(`/search?category=${encodeURIComponent(label)}`);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pb-[var(--nav-height)]">
      <OnboardingOverlay />

      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nexora</h1>
          <p className="text-xs text-muted-foreground">UNISA Campus Navigator</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
          N
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-5 py-3">
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
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-5">
        <ScannerViewfinder />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Point at a QR code</p>
          <p className="text-xs text-muted-foreground">Find QR codes on walls and doors around campus</p>
        </div>
      </div>

      {/* Quick Access */}
      <div className="px-5 pb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Access</p>
        <QuickAccessChips onChipClick={handleChipClick} />
      </div>
    </div>
  );
};

export default Index;
