import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { bulkProducts } from "../api/products"; // ✅ adjust path if needed

const CartCtx = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cart") || "[]");
    } catch {
      return [];
    }
  });

  // ✅ NEW: separate buyNow item (use sessionStorage so it resets after tab close)
  const [buyNowItem, setBuyNowItem] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("buyNowItem") || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    sessionStorage.setItem("buyNowItem", JSON.stringify(buyNowItem));
  }, [buyNowItem]);

  const MAX_QTY = 10;

  const getStock = (p) => {
    const type = p?.type || "SINGLE";
    const raw = type === "BUNDLE" ? p?.bundleStock : p?.stock;
    return Math.max(0, Number(raw ?? 0));
  };

  const addToCart = (product, qty = 1, options = {}) => {
    const { mode = "add" } = options; // "add" | "set" | "replace"

    const stock = getStock(product);
    if (!product?._id) return;
    if (stock <= 0) return; // ✅ OUT OF STOCK => block completely

    const requested = Math.max(1, Number(qty) || 1);

    setCart((prev) => {
      const idx = prev.findIndex((x) => x._id === product._id);

      const clampToRules = (q) => Math.min(q, MAX_QTY, stock);

      // ✅ NEW ITEM
      if (idx < 0) {
        return [...prev, { ...product, qty: clampToRules(requested) }];
      }

      const copy = [...prev];
      const currentQty = Number(copy[idx].qty || 0);

      // ✅ SET / REPLACE
      if (mode === "set" || mode === "replace") {
        copy[idx] = { ...copy[idx], qty: clampToRules(requested) };
        return copy;
      }

      // ✅ ADD
      const nextQty = clampToRules(currentQty + requested);
      copy[idx] = { ...copy[idx], qty: nextQty };
      return copy;
    });
  };

  // ✅ NEW: Buy Now flow (does NOT clear cart)
  const startBuyNow = (product, qty = 1) => {
    const stock = getStock(product);
    if (!product?._id) return;
    if (stock <= 0) return; // ✅ OUT OF STOCK => block buy-now too

    const requested = Math.max(1, Number(qty) || 1);
    const safeQty = Math.min(requested, MAX_QTY, stock);

    setBuyNowItem({ product: { ...product }, qty: safeQty });
  };

  const clearBuyNow = () => setBuyNowItem(null);

  const updateQty = (id, qty) => {
    const requested = Math.max(1, Number(qty) || 1);

    setCart((prev) =>
      prev.map((x) => {
        if (x._id !== id) return x;

        const stock = getStock(x);
        if (stock <= 0) {
          // ✅ keep qty unchanged; UI will disable and show out-of-stock
          return x;
        }

        const safeQty = Math.min(requested, MAX_QTY, stock);
        return { ...x, qty: safeQty };
      }),
    );
  };

  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((x) => x._id !== id));
  const clearCart = () => setCart([]);

  const removeOutOfStockItems = () => {
    setCart((prev) => prev.filter((x) => getStock(x) > 0));
  };

  const clearBuyNowIfOutOfStock = () => {
    setBuyNowItem((prev) => {
      const stock = getStock(prev?.product);
      return stock > 0 ? prev : null;
    });
  };

  const syncCartStock = async (opts = {}) => {
    const { returnLatest = false } = opts;

    try {
      // always take ids from current cart snapshot
      const ids = (JSON.parse(localStorage.getItem("cart") || "[]") || []).map(
        (x) => x._id,
      );

      if (!ids.length) return returnLatest ? [] : undefined;

      const res = await bulkProducts(ids);
      const latest = res.data.products || [];
      console.log("bulkProducts latest[0]:", latest[0]);

      const map = new Map(latest.map((p) => [String(p._id), p]));

      setCart((prev) =>
        prev.map((item) => {
          const p = map.get(String(item._id));
          if (!p) {
            return { ...item, stock: 0, isActive: false };
          }

          const latestStock = Number(
            (p.type === "BUNDLE" ? p.bundleStock : p.stock) ?? 0,
          );

          return {
            ...item,
            stock: latestStock,
            bundleStock: p.bundleStock ?? item.bundleStock,
            type: p.type ?? item.type,
            isActive: p.isActive !== false,

            // ✅ clamp qty only when in stock
            qty:
              latestStock > 0
                ? Math.min(Number(item.qty || 1), MAX_QTY, latestStock)
                : Number(item.qty || 1),

            // keep updated fields
            price: p.price ?? item.price,
            discountPrice: p.discountPrice ?? item.discountPrice,
            title: p.title ?? item.title,
            slug: p.slug ?? item.slug,
            images: p.images ?? item.images,
            timedOffer: p.timedOffer ?? item.timedOffer,
            finalPrice: p.finalPrice ?? item.finalPrice,
            bundleItems: p.bundleItems ?? item.bundleItems,
            warranty: p.warranty ?? item.warranty,
            brand: p.brand ?? item.brand,
          };
        }),
      );

      return returnLatest ? latest : undefined;
    } catch (e) {
      console.log("syncCartStock failed", e?.message);
      return returnLatest ? [] : undefined;
    }
  };

  const getUnitPrice = (x) => {
    const price = Number(x?.price ?? 0);
    const dp = Number(x?.discountPrice ?? 0);
    const hasDiscount = dp > 0 && dp < price;

    const t = x?.timedOffer;
    const now = Date.now();
    const end = t?.endAt ? new Date(t.endAt).getTime() : 0;

    const isTimedLive =
      (t?.effectiveActive === true || t?.isActive === true) && end > now;

    if (isTimedLive) {
      return Number(x?.finalPrice ?? t?.price ?? (hasDiscount ? dp : price));
    }

    return hasDiscount ? dp : price;
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, x) => {
      const unit = getUnitPrice(x);
      return sum + unit * Number(x.qty || 1);
    }, 0);

    return { subtotal };
  }, [cart]);

  return (
    <CartCtx.Provider
      value={{
        cart,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        syncCartStock,
        removeOutOfStockItems,
        clearBuyNowIfOutOfStock,
        totals,

        // ✅ expose buy-now checkout-only item
        buyNowItem,
        startBuyNow,
        clearBuyNow,
      }}
    >
      {children}
    </CartCtx.Provider>
  );
}

export const useCart = () => useContext(CartCtx);
