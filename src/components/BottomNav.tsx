import { useLocation, useNavigate } from "react-router-dom";
import { ScanLine, Map, Search, User } from "lucide-react";

const tabs = [
  { path: "/", label: "Scanner", icon: ScanLine },
  { path: "/map", label: "Map", icon: Map },
  { path: "/search", label: "Search", icon: Search },
  { path: "/profile", label: "Profile", icon: User },
] as const;

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md safe-bottom">
      <div className="mx-auto flex h-[var(--nav-height)] max-w-lg items-center justify-around px-2">
        {tabs.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] font-medium ${isActive ? "font-semibold" : ""}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
