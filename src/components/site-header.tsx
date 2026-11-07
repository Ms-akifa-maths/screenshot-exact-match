// @ts-nocheck
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LayoutDashboard, LogOut, Menu, ShoppingBag, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("group flex items-center gap-2.5", className)} aria-label="Axiom Worksheets home">
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-primary font-display text-lg font-bold text-primary-foreground shadow-glow transition-transform group-hover:rotate-[-8deg]">
        ∑
      </span>
      <span className="leading-none">
        <span className="block font-display text-lg font-semibold tracking-tight">Axiom</span>
        <span className="block font-mono text-[9.5px] tracking-[0.22em] text-muted-foreground uppercase">Worksheets</span>
      </span>
    </Link>
  );
}

const NAV = [
  { to: "/", label: "Home" },
  { to: "/store", label: "Explore Worksheets" },
  { to: "/how-it-works", label: "How it works" },
] as const;

export function SiteHeader() {
  const { user, isAdmin, signOut } = useAuth();
  const { ids } = useCart();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto mt-3 flex max-w-6xl items-center justify-between rounded-full border border-border bg-background/70 px-3 py-2 pl-4 shadow-card backdrop-blur-xl sm:mx-4 lg:mx-auto">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground bg-secondary" }}
              activeOptions={{ exact: true }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          {isAdmin && (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/admin">
                <LayoutDashboard /> Admin
              </Link>
            </Button>
          )}
          {user ? (
            <>
              <Button asChild variant="ghost" size="icon" aria-label="My account">
                <Link to="/account">
                  <User />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sign out"
                className="hidden sm:inline-flex"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut />
              </Button>
            </>
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
          <Button asChild size="sm" className="relative">
            <Link to="/cart" aria-label={`Cart, ${ids.length} items`}>
              <ShoppingBag />
              <span className="hidden sm:inline">Cart</span>
              {ids.length > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-primary-foreground px-1 text-[11px] text-primary">
                  {ids.length}
                </span>
              )}
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open && (
        <div className="mx-3 mt-2 animate-rise rounded-3xl border border-border bg-popover/95 p-3 shadow-card backdrop-blur-xl md:hidden">
          {[
            ...NAV,
            ...(user ? [{ to: "/account", label: "My account" } as const] : [{ to: "/login", label: "Sign in" } as const, { to: "/signup", label: "Create account" } as const]),
            ...(isAdmin ? [{ to: "/admin", label: "Admin dashboard" } as const] : []),
          ].map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="block rounded-2xl px-4 py-3 text-base font-medium hover:bg-secondary"
            >
              {n.label}
            </Link>
          ))}
          {user && (
            <button
              className="block w-full rounded-2xl px-4 py-3 text-left text-base font-medium text-muted-foreground hover:bg-secondary"
              onClick={async () => {
                setOpen(false);
                await signOut();
                navigate({ to: "/" });
              }}
            >
              Sign out
            </button>
          )}
        </div>
      )}
    </header>
  );
}
