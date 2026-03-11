import { Bath, DoorOpen, ArrowUpDown, Accessibility } from "lucide-react";

const chips = [
  { label: "Bathrooms", icon: Bath },
  { label: "Exits", icon: DoorOpen },
  { label: "Elevators", icon: ArrowUpDown },
  { label: "Accessible", icon: Accessibility },
] as const;

interface QuickAccessChipsProps {
  onChipClick?: (label: string) => void;
}

const QuickAccessChips = ({ onChipClick }: QuickAccessChipsProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
      {chips.map(({ label, icon: Icon }) => (
        <button
          key={label}
          onClick={() => onChipClick?.(label)}
          className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent active:scale-95"
        >
          <Icon className="h-4 w-4 text-primary" />
          {label}
        </button>
      ))}
    </div>
  );
};

export default QuickAccessChips;
