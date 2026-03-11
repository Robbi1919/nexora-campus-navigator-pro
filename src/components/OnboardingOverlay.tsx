import { useState, useEffect } from "react";
import { ScanLine, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: ScanLine,
    title: "Scan a QR Code",
    description: "Find QR codes posted around campus and scan them to know exactly where you are.",
  },
  {
    icon: MapPin,
    title: "Navigate Indoors",
    description: "Get step-by-step directions to any room, office, or facility inside university buildings.",
  },
  {
    icon: Star,
    title: "Save Favorites",
    description: "Sign in with your university email to save favorite locations and access your history.",
  },
];

const OnboardingOverlay = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("nexora_onboarding_done");
    if (!seen) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem("nexora_onboarding_done", "true");
    setVisible(false);
  };

  if (!visible) return null;

  const { icon: Icon, title, description } = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/60 backdrop-blur-sm">
      <div className="mx-4 mb-8 w-full max-w-sm animate-in slide-in-from-bottom-8 rounded-2xl bg-card p-6 shadow-2xl">
        <div className="mb-4 flex justify-center">
          <div className="nexora-gradient flex h-16 w-16 items-center justify-center rounded-2xl">
            <Icon className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <h2 className="mb-2 text-center text-xl font-bold text-foreground">{title}</h2>
        <p className="mb-6 text-center text-sm text-muted-foreground">{description}</p>

        {/* Dots */}
        <div className="mb-4 flex justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === currentStep ? "w-6 bg-primary" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={dismiss}>
            Skip
          </Button>
          <Button
            className="flex-1"
            onClick={() => (isLast ? dismiss() : setCurrentStep((s) => s + 1))}
          >
            {isLast ? "Get Started" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingOverlay;
