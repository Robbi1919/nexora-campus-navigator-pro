import { useState, useCallback, useEffect } from "react";
import { ArrowUp, ArrowRight, ArrowLeft, X, Star, ChevronLeft, ChevronRight, Accessibility, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRouting } from "@/hooks/useRouting";
import type { NavStep } from "@/lib/routing";

/* ── Types ──────────────────────────────────────────────────────── */

export interface NavPin {
  id: string;
  name: string;
  type: string;
  floor: string;
  isAccessible: boolean;
}

type FlowPhase = "accessibility-modal" | "navigating" | "arrived";

/* ── Step icon renderer ─────────────────────────────────────────── */

function StepIcon({ type }: { type: NavStep["icon"] }) {
  const base = "h-16 w-16 text-primary";
  switch (type) {
    case "up":
      return <ArrowUp className={base} />;
    case "right":
      return <ArrowRight className={base} />;
    case "left":
      return <ArrowLeft className={base} />;
    case "elevator":
      return <span className="text-5xl">🛗</span>;
    case "exit":
      return <span className="text-5xl">🚪</span>;
    default:
      return <ArrowUp className={base} />;
  }
}

/* ── Main component ─────────────────────────────────────────────── */

interface NavigationFlowProps {
  pin: NavPin;
  fromPin?: NavPin;
  onClose: () => void;
}

export default function NavigationFlow({ pin, fromPin, onClose }: NavigationFlowProps) {
  const [phase, setPhase] = useState<FlowPhase>("accessibility-modal");
  const [accessibleRoute, setAccessibleRoute] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [startTime] = useState(Date.now());

  // Arrival state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Touch swipe
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const steps = SAMPLE_STEPS;
  const progress = phase === "arrived" ? 100 : ((currentStep + 1) / steps.length) * 100;

  const goNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, steps.length]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleArrive = useCallback(() => {
    setPhase("arrived");
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Insert navigation log
      await supabase.from("navigation_logs").insert({
        from_room_id: fromPin?.id ?? null,
        to_room_id: pin.id,
        user_id: user?.id ?? null,
        completed: true,
        duration_seconds: durationSeconds,
        is_accessible_route: accessibleRoute,
      });

      // Insert review if rated
      if (rating > 0) {
        await supabase.from("reviews").insert({
          route_from: pin.id,
          route_to: pin.id,
          user_id: user?.id ?? null,
          rating,
          comment: comment || null,
        });
      }

      // Save to favorites if logged in
      if (user) {
        await supabase.from("user_favorites").insert({
          user_id: user.id,
          room_id: pin.id,
        });
      }

      toast.success("Route saved!");
      onClose();
    } catch {
      toast.error("Could not save, please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [pin, rating, comment, accessibleRoute, startTime, onClose]);

  // Keyboard nav
  useEffect(() => {
    if (phase !== "navigating") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, goNext, goPrev]);

  const durationMinutes = Math.max(1, Math.round((Date.now() - startTime) / 60000));

  /* ── Phase 1: Accessibility modal ─────────────────────────────── */
  if (phase === "accessibility-modal") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm animate-fade-in">
        <div className="mx-6 w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl animate-scale-in">
          <div className="mb-1 flex items-center justify-between">
            <Accessibility className="h-8 w-8 text-primary" />
            <button onClick={onClose} className="rounded-full p-1 hover:bg-accent">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
          <h2 className="mt-2 text-xl font-bold text-foreground">Do you need accessible navigation?</h2>
          <p className="mt-1 text-sm text-muted-foreground">We'll use elevators, ramps and wide passages</p>
          <div className="mt-6 flex gap-3">
            <Button
              className="flex-1 gap-1"
              onClick={() => {
                setAccessibleRoute(true);
                setPhase("navigating");
              }}
            >
              Yes, accessible ♿
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setAccessibleRoute(false);
                setPhase("navigating");
              }}
            >
              Standard route
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Phase 2: Step-by-step navigation ─────────────────────────── */
  if (phase === "navigating") {
    const step = steps[currentStep];
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background animate-fade-in">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <button onClick={onClose} className="flex items-center gap-1 text-sm font-medium text-primary">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <span className="flex-1 text-center text-sm font-semibold text-foreground truncate">{pin.name}</span>
          <Badge variant="secondary" className="text-xs">
            {pin.floor}
          </Badge>
        </div>

        {/* Progress */}
        <div className="px-4 pt-3">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Accessible badge */}
        {accessibleRoute && (
          <div className="absolute right-4 top-16 z-10">
            <Badge className="bg-primary text-primary-foreground text-xs">♿ Accessible</Badge>
          </div>
        )}

        {/* Step card — swipeable area */}
        <div
          className="flex flex-1 flex-col items-center justify-center px-6"
          onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStartX === null) return;
            const diff = e.changedTouches[0].clientX - touchStartX;
            if (diff > 60) goPrev();
            if (diff < -60) goNext();
            setTouchStartX(null);
          }}
        >
          <div
            className="w-full max-w-xs rounded-2xl border border-border bg-card p-8 text-center shadow-lg animate-scale-in"
            key={currentStep}
          >
            <StepIcon type={step.icon} />
            <p className="mt-4 text-lg font-semibold text-foreground">{step.instruction}</p>
            <p className="mt-1 text-sm text-muted-foreground">{step.distance}</p>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="border-t border-border px-4 pb-6 pt-4 safe-bottom">
          <p className="mb-3 text-center text-sm text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" size="icon" onClick={goPrev} disabled={currentStep === 0}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button className="flex-1 gap-1" onClick={currentStep < steps.length - 1 ? goNext : handleArrive}>
              {currentStep < steps.length - 1 ? (
                <>
                  Next step <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next step <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
            <Button variant="outline" size="icon" onClick={currentStep < steps.length - 1 ? goNext : handleArrive}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <Button
            className="mt-3 w-full gap-2 bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-primary-foreground"
            onClick={handleArrive}
          >
            I arrived! ✅
          </Button>
        </div>
      </div>
    );
  }

  /* ── Phase 3: Arrival screen ──────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 animate-fade-in">
      {/* Animated checkmark */}
      <div className="mb-4 animate-bounce">
        <span className="text-7xl">✅</span>
      </div>

      <h2 className="text-2xl font-bold text-foreground">You arrived at {pin.name}! 🎉</h2>
      <p className="mt-1 text-sm text-muted-foreground">Navigation completed in {durationMinutes} min</p>

      {/* Star rating */}
      <div className="mt-6">
        <p className="mb-2 text-center text-sm font-medium text-foreground">How was your journey?</p>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => setRating(s)}
              className="rounded-full p-1 transition-transform hover:scale-110"
              aria-label={`${s} star`}
            >
              <Star
                className={`h-8 w-8 ${s <= rating ? "fill-[hsl(var(--nexora-warning))] text-[hsl(var(--nexora-warning))]" : "text-muted-foreground"}`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div className="mt-4 w-full max-w-sm">
        <Textarea
          placeholder="Leave a comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="resize-none"
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="mt-6 flex w-full max-w-sm flex-col gap-3">
        <Button className="w-full gap-2" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving..." : "Submit & Save route"}
        </Button>
        <Button variant="outline" className="w-full" onClick={onClose}>
          Back to map
        </Button>
      </div>
    </div>
  );
}
