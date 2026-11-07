import { Link } from "@tanstack/react-router";
import { Logo } from "./site-header";

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Carefully designed mathematics worksheets for students, parents and teachers. Clear explanations, real
            practice, and answer keys you can trust.
          </p>
          <p className="font-mono text-xs text-muted-foreground/70">e^(iπ) + 1 = 0</p>
        </div>
        <div>
          <h3 className="mb-3 font-sans text-sm font-semibold tracking-normal">Shop</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/store" className="hover:text-foreground">All worksheets</Link></li>
            <li><Link to="/how-it-works" className="hover:text-foreground">How ordering works</Link></li>
            <li><Link to="/cart" className="hover:text-foreground">Cart</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-sans text-sm font-semibold tracking-normal">Account</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/account" className="hover:text-foreground">My orders</Link></li>
            <li><Link to="/login" className="hover:text-foreground">Sign in</Link></li>
            <li><Link to="/signup" className="hover:text-foreground">Create account</Link></li>
            <li><Link to="/admin-login" className="hover:text-foreground">Admin</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Axiom Worksheets. Digital products — delivered after manual payment verification.
      </div>
    </footer>
  );
}
