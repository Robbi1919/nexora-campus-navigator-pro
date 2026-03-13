import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { LogOut, Heart, Clock, Accessibility, Loader2 } from "lucide-react";
import nexoraLogo from "@/assets/nexora-logo.png";

/* ── Types ──────────────────────────────────────────────── */
interface FavRoom { id: string; room_id: string; custom_label: string | null; room_name: string }
interface RecentRoom { id: string; room_id: string; navigated_at: string; room_name: string }

/* ── helpers ──────────────────────────────────────────────── */
const emailRegex = /^[^\s@]+@(studenti\.unisa\.it|unisa\.it)$/i;

const ProfileScreen = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  /* auth modals */
  const [showSignup, setShowSignup] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background pb-[var(--nav-height)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pb-[var(--nav-height)]">
      {session ? (
        <LoggedInView session={session} />
      ) : (
        <GuestView onSignup={() => setShowSignup(true)} onLogin={() => setShowLogin(true)} />
      )}

      <SignupModal open={showSignup} onOpenChange={setShowSignup} onSwitchToLogin={() => { setShowSignup(false); setShowLogin(true); }} />
      <LoginModal open={showLogin} onOpenChange={setShowLogin} onSwitchToSignup={() => { setShowLogin(false); setShowSignup(true); }} />
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   GUEST VIEW
   ══════════════════════════════════════════════════════════ */
const GuestView = ({ onSignup, onLogin }: { onSignup: () => void; onLogin: () => void }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
    <img src={nexoraLogo} alt="Nexora" className="h-24 w-24 object-contain" />

    <div className="space-y-2">
      <h1 className="text-2xl font-bold text-foreground">Unlock the full experience</h1>
    </div>

    <ul className="w-full max-w-xs space-y-4 text-left">
      {[
        { icon: "💾", text: "Save your favorite routes" },
        { icon: "🕐", text: "Access recent navigations" },
        { icon: "♿", text: "Set permanent accessibility preferences" },
        { icon: "🎯", text: "Personalized route suggestions" },
      ].map((b) => (
        <li key={b.text} className="flex items-center gap-3 text-sm text-foreground">
          <span className="text-xl">{b.icon}</span>
          <span>{b.text}</span>
        </li>
      ))}
    </ul>

    <div className="flex w-full max-w-xs flex-col items-center gap-3">
      <Button className="w-full nexora-gradient text-primary-foreground" size="lg" onClick={onSignup}>
        Sign up with university email
      </Button>
      <button onClick={onLogin} className="text-sm text-muted-foreground hover:text-primary transition-colors">
        Already have an account? <span className="font-semibold text-primary">Log in</span>
      </button>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════
   AUTH MODALS
   ══════════════════════════════════════════════════════════ */
const SignupModal = ({ open, onOpenChange, onSwitchToLogin }: { open: boolean; onOpenChange: (o: boolean) => void; onSwitchToLogin: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");

  const validate = () => {
    if (!emailRegex.test(email)) { setEmailError("Use your @studenti.unisa.it or @unisa.it email"); return false; }
    setEmailError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setSubmitting(false);
    if (error) { toast({ title: "Sign up failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Check your email", description: "We sent a confirmation link to " + email });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create account</DialogTitle>
          <DialogDescription>Sign up with your university email</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="signup-email">Email</Label>
            <Input id="signup-email" type="email" placeholder="name@studenti.unisa.it" value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(""); }} />
            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="signup-pw">Password</Label>
            <Input id="signup-pw" type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </div>
          <Button type="submit" className="w-full nexora-gradient text-primary-foreground" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign up"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button type="button" className="font-semibold text-primary hover:underline" onClick={onSwitchToLogin}>Log in</button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const LoginModal = ({ open, onOpenChange, onSwitchToSignup }: { open: boolean; onOpenChange: (o: boolean) => void; onSwitchToSignup: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) { toast({ title: "Login failed", description: error.message, variant: "destructive" }); return; }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome back</DialogTitle>
          <DialogDescription>Log in to your Nexora account</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="login-email">Email</Label>
            <Input id="login-email" type="email" placeholder="name@studenti.unisa.it" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="login-pw">Password</Label>
            <Input id="login-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full nexora-gradient text-primary-foreground" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button type="button" className="font-semibold text-primary hover:underline" onClick={onSwitchToSignup}>Sign up</button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* ══════════════════════════════════════════════════════════
   LOGGED-IN VIEW
   ══════════════════════════════════════════════════════════ */
const LoggedInView = ({ session }: { session: Session }) => {
  const user = session.user;
  const email = user.email ?? "";
  const initial = email.charAt(0).toUpperCase();

  const [favorites, setFavorites] = useState<FavRoom[]>([]);
  const [recents, setRecents] = useState<RecentRoom[]>([]);
  const [accessible, setAccessible] = useState<boolean>(
    () => (user.user_metadata?.accessible_routes as boolean) ?? false
  );
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    const [favRes, recRes] = await Promise.all([
      supabase.from("user_favorites").select("id, room_id, custom_label, rooms(name)").eq("user_id", user.id),
      supabase.from("user_recent").select("id, room_id, navigated_at, rooms(name)").eq("user_id", user.id).order("navigated_at", { ascending: false }).limit(10),
    ]);
    if (favRes.data) setFavorites(favRes.data.map((r: any) => ({ id: r.id, room_id: r.room_id, custom_label: r.custom_label, room_name: r.rooms?.name ?? "Unknown" })));
    if (recRes.data) setRecents(recRes.data.map((r: any) => ({ id: r.id, room_id: r.room_id, navigated_at: r.navigated_at, room_name: r.rooms?.name ?? "Unknown" })));
    setLoadingData(false);
  }, [user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleAccessible = async (val: boolean) => {
    setAccessible(val);
    await supabase.auth.updateUser({ data: { accessible_routes: val } });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pt-12 pb-4">
      {/* avatar + email */}
      <div className="flex flex-col items-center gap-2">
        <Avatar className="h-20 w-20 text-2xl">
          <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">{initial}</AvatarFallback>
        </Avatar>
        <p className="text-sm text-muted-foreground">{email}</p>
      </div>

      {/* Favorites */}
      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Heart className="h-4 w-4 text-destructive" /> Favorites
        </h2>
        {loadingData ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : favorites.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No favorites yet — navigate somewhere and save it!</p>
        ) : (
          <ul className="space-y-1.5">
            {favorites.map((f) => (
              <li key={f.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground">
                <Heart className="h-3.5 w-3.5 text-destructive" />
                {f.custom_label || f.room_name}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recents */}
      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Clock className="h-4 w-4 text-muted-foreground" /> Recent
        </h2>
        {loadingData ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : recents.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Your recent navigations will appear here</p>
        ) : (
          <ul className="space-y-1.5">
            {recents.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground">
                <span className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {r.room_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.navigated_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Accessibility toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
        <Label htmlFor="acc-toggle" className="flex items-center gap-2 text-sm font-medium text-card-foreground cursor-pointer">
          <Accessibility className="h-4 w-4" />
          Always use accessible routes ♿
        </Label>
        <Switch id="acc-toggle" checked={accessible} onCheckedChange={toggleAccessible} />
      </div>

      {/* Logout */}
      <Button variant="outline" className="mt-auto w-full border-destructive text-destructive hover:bg-destructive/10" onClick={handleLogout}>
        <LogOut className="h-4 w-4" /> Log out
      </Button>
    </div>
  );
};

export default ProfileScreen;
