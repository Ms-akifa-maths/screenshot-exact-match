import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/store";
import { cn } from "@/lib/utils";

const STYLE: Record<OrderStatus, string> = {
  pending_payment: "bg-warning/15 text-warning border-warning/30",
  payment_submitted: "bg-accent/15 text-accent border-accent/30",
  payment_verified: "bg-success/15 text-success border-success/30",
  processing: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-success/20 text-success border-success/40",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        STYLE[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
