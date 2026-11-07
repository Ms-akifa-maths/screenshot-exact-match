// @ts-nocheck
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { formatPrice, type Product } from "@/lib/store";
import { cn } from "@/lib/utils";

const DIFF_DOT: Record<string, string> = {
  Beginner: "bg-success",
  Intermediate: "bg-primary",
  Advanced: "bg-destructive",
};

export function ProductCard({ product, className }: { product: Product; className?: string }) {
  const cart = useCart();
  const inCart = cart.has(product.id);
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40",
        className,
      )}
    >
      <Link
        to="/store/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-[4/3] overflow-hidden bg-paper"
        aria-label={`View ${product.title}`}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={`Preview of ${product.title}`}
            loading="lazy"
            width={1024}
            height={1024}
            className="size-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.05]"
          />
        ) : (
          <div className="grid size-full place-items-center font-display text-5xl text-paper-foreground/30">∫</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-card/80 to-transparent" />
        <span className="absolute top-3 left-3 rounded-full bg-background/80 px-3 py-1 font-mono text-[10.5px] tracking-wider uppercase backdrop-blur">
          {product.category}
        </span>
        {product.featured && (
          <span className="absolute top-3 right-3 rounded-full bg-primary px-2.5 py-1 text-[10.5px] font-bold text-primary-foreground">
            Featured
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", DIFF_DOT[product.difficulty] ?? "bg-accent")} />
            {product.difficulty}
          </span>
          <span>·</span>
          <span>{product.grade}</span>
          <span className="ml-auto flex items-center gap-1">
            <Star className="size-3.5 fill-primary text-primary" /> {Number(product.rating).toFixed(1)}
          </span>
        </div>
        <h3 className="text-xl leading-tight font-semibold">
          <Link to="/store/$slug" params={{ slug: product.slug }} className="hover:text-primary">
            {product.title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.short_description}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="font-display text-2xl font-semibold">{formatPrice(product.price)}</span>
          <div className="flex gap-1.5">
            <Button asChild variant="outline" size="icon" aria-label={`View details for ${product.title}`}>
              <Link to="/store/$slug" params={{ slug: product.slug }}>
                <ArrowUpRight />
              </Link>
            </Button>
            <Button
              size="sm"
              variant={inCart ? "secondary" : "default"}
              onClick={() => cart.add(product.id, product.title)}
              disabled={inCart}
              className="h-9"
            >
              {inCart ? <Check /> : <Plus />}
              {inCart ? "In cart" : "Add to cart"}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="aspect-[4/3] animate-pulse bg-muted" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-9 w-full animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}
