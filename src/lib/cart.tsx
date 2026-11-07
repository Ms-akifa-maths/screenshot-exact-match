import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

const KEY = "axiom-cart";

type CartState = {
  ids: string[];
  has: (id: string) => boolean;
  add: (id: string, title?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearLocal: () => void;
  ready: boolean;
};

const CartContext = createContext<CartState | null>(null);

function readLocal(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function writeLocal(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids));
}

/**
 * Digital worksheets: each item can be in the cart once (no accidental duplicates).
 * Guests keep the cart in the browser; signed-in customers keep it in the database,
 * and a guest cart is merged into it on sign-in.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      if (!user) {
        setIds(readLocal());
        setReady(true);
        return;
      }
      const local = readLocal();
      if (local.length) {
        await supabase
          .from("cart_items")
          .upsert(
            local.map((product_id) => ({ user_id: user.id, product_id })),
            { onConflict: "user_id,product_id", ignoreDuplicates: true },
          );
        writeLocal([]);
      }
      const { data } = await supabase.from("cart_items").select("product_id").order("created_at");
      if (!cancelled) {
        setIds((data ?? []).map((r) => r.product_id));
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  const add = useCallback(
    async (id: string, title?: string) => {
      if (ids.includes(id)) {
        toast.info("Already in your cart", { description: title });
        return;
      }
      if (user) {
        const { error } = await supabase.from("cart_items").insert({ user_id: user.id, product_id: id });
        if (error && !error.message.includes("duplicate")) {
          toast.error("Couldn't add to cart", { description: error.message });
          return;
        }
      } else {
        writeLocal([...readLocal().filter((x) => x !== id), id]);
      }
      setIds((s) => [...s, id]);
      toast.success("Added to cart", { description: title });
    },
    [ids, user],
  );

  const remove = useCallback(
    async (id: string) => {
      if (user) {
        await supabase.from("cart_items").delete().eq("product_id", id).eq("user_id", user.id);
      } else {
        writeLocal(readLocal().filter((x) => x !== id));
      }
      setIds((s) => s.filter((x) => x !== id));
    },
    [user],
  );

  return (
    <CartContext.Provider
      value={{
        ids,
        has: (id) => ids.includes(id),
        add,
        remove,
        clearLocal: () => {
          writeLocal([]);
          setIds([]);
        },
        ready,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
