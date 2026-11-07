import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Floating equations used as quiet decoration behind page headers. */
export function MathDecor({ className }: { className?: string }) {
  const items = [
    { t: "∫₀¹ x² dx = ⅓", c: "top-[12%] left-[6%]", r: "-8deg" },
    { t: "a² + b² = c²", c: "top-[22%] right-[8%]", r: "6deg" },
    { t: "π ≈ 3.14159", c: "bottom-[18%] left-[12%]", r: "4deg" },
    { t: "Σ n = n(n+1)/2", c: "bottom-[10%] right-[14%]", r: "-5deg" },
  ];
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {items.map((i, k) => (
        <span
          key={k}
          className={cn("absolute hidden animate-float font-mono text-sm text-foreground/15 md:block", i.c)}
          style={{ ["--r" as string]: i.r, animationDelay: `${k * 1.3}s` }}
        >
          {i.t}
        </span>
      ))}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative overflow-hidden graph-paper pt-32 pb-12", className)}>
      <div className="absolute inset-0 bg-ink-glow" aria-hidden="true" />
      <MathDecor />
      <div className="relative mx-auto max-w-6xl px-5">
        {eyebrow && (
          <p className="mb-3 font-mono text-xs tracking-[0.25em] text-primary uppercase">{eyebrow}</p>
        )}
        <h1 className="max-w-3xl text-4xl leading-[1.05] font-semibold md:text-6xl">{title}</h1>
        {children && <div className="mt-4 max-w-2xl text-muted-foreground md:text-lg">{children}</div>}
      </div>
    </section>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-6xl px-5", className)}>{children}</div>;
}
