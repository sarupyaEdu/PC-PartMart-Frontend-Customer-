import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import TrashIcon from "../assets/bin.svg";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

const fmtINR = (n) => `₹${Number(n || 0).toFixed(0)}`;
const MAX_QTY = 10;
const animDelay = (i) => ({ animationDelay: `${i * 70}ms` });

export default function Cart() {
  const [removing, setRemoving] = useState(new Set());

  const {
    cart,
    updateQty,
    removeFromCart,
    syncCartStock,
    removeOutOfStockItems,
    clearBuyNowIfOutOfStock,
  } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    syncCartStock?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isTimedLive = (p) => {
    const t = p?.timedOffer;
    if (!t) return false;

    const end = t?.endAt ? new Date(t.endAt).getTime() : 0;
    const active = t?.effectiveActive === true || t?.isActive === true;

    return active && Number.isFinite(end) && end > Date.now();
  };

  const getBundleIndividualTotal = (p) => {
    const items = Array.isArray(p?.bundleItems) ? p.bundleItems : [];
    return items.reduce((sum, it) => {
      const qty = Number(it?.qty ?? 1);

      const ip = it?.product || {};
      const price = Number(ip?.price ?? 0);
      const dp = Number(ip?.discountPrice ?? 0);

      const unit = dp > 0 && dp < price ? dp : price;

      return sum + unit * (Number.isFinite(qty) ? qty : 1);
    }, 0);
  };

  const getPricing = (p) => {
    const type = p?.type || "SINGLE";
    const isBundle = type === "BUNDLE";

    const price = Number(p?.price ?? 0);
    const dp = Number(p?.discountPrice ?? 0);
    const hasDiscount = dp > 0 && dp < price;

    const timedLive = isTimedLive(p);

    // ✅ what user pays now
    const payNow = timedLive
      ? Number(
          p?.finalPrice ?? p?.timedOffer?.price ?? (hasDiscount ? dp : price),
        )
      : isBundle
        ? hasDiscount
          ? dp
          : price // bundle normal pay (dp if valid else price)
        : hasDiscount
          ? dp
          : price;

    // ✅ strike (context) price
    // ✅ strike (context) price
    const strike = isBundle
      ? getBundleIndividualTotal(p) // ✅ unchanged for bundles
      : timedLive || hasDiscount // ✅ for SINGLE: show strike whenever timed/discount exists
        ? price // ✅ always normal price as strike
        : 0;

    return { payNow, strike, timedLive, isBundle, hasDiscount };
  };

  // ✅ FIX: if stock <= 0 => qty must be 0 (so totals ignore it)
  const clampQty = (p, q) => {
    const stock = Math.max(0, Number(p?.stock ?? 0));
    if (stock <= 0) return 0;

    const maxAllowed = Math.min(MAX_QTY, stock);
    return Math.min(maxAllowed, Math.max(1, Number(q || 1)));
  };

  const hasOutOfStock = useMemo(
    () => cart.some((p) => Math.max(0, Number(p?.stock ?? 0)) <= 0),
    [cart],
  );

  const handleCheckout = async () => {
    await syncCartStock?.();

    if (hasOutOfStock) {
      toast.dismiss("checkout-oos");
      toast.info("ℹ️ Out-of-stock items will be removed on checkout.", {
        toastId: "checkout-oos",
      });
    }

    removeOutOfStockItems?.();
    clearBuyNowIfOutOfStock?.();

    toast.dismiss("checkout-go");
    toast.success("✅ Proceeding to checkout", { toastId: "checkout-go" });

    navigate("/checkout");
  };

  const computedSubtotal = useMemo(() => {
    return cart.reduce((sum, p) => {
      const { payNow } = getPricing(p);
      const qty = clampQty(p, p.qty);
      return sum + payNow * qty;
    }, 0);
  }, [cart]);

  const originalSubtotal = useMemo(() => {
    return cart.reduce((sum, p) => {
      const { strike } = getPricing(p);
      const qty = clampQty(p, p.qty);
      return sum + (strike > 0 ? strike : Number(p?.price ?? 0)) * qty;
    }, 0);
  }, [cart]);

  if (!cart.length) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-xl p-10 text-center shadow-[0_0_40px_rgba(0,0,0,0.35)]">
        <div className="text-2xl font-black tracking-tight text-white">
          Your cart is empty
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Add some products to continue.
        </p>

        <Link
          to="/products"
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:translate-y-[-2px] active:translate-y-[0px]"
        >
          Browse Store
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <style>{`
  @keyframes cartIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes cartOut {
    to { opacity: 0; transform: scale(0.98); height: 0; margin: 0; padding: 0; }
  }
`}</style>

      {/* Cart Items */}
      <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Cart
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Review items and update quantities.
            </p>

            {hasOutOfStock && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                Some items are out of stock. They’ll be removed on checkout.
              </div>
            )}
          </div>

          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Items: <span className="text-slate-200">{cart.length}</span>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {cart.map((p, i) => {
            const { payNow: unitPrice, strike: strikePrice } = getPricing(p);

            const stock = Math.max(0, Number(p?.stock ?? 0));
            const isOut = stock <= 0;

            // ✅ if out of stock => qty becomes 0 for totals, but UI shows previous qty
            const qtyForUI = Math.max(1, Math.min(MAX_QTY, Number(p.qty || 1)));
            const qty = isOut ? qtyForUI : clampQty(p, p.qty);

            const lineTotal = isOut ? 0 : unitPrice * qty;

            const price = Number(p?.price ?? 0);
            const showDiscount = strikePrice > 0 && unitPrice < strikePrice;

            const imgUrl = p?.images?.[0]?.url || "";
            const maxForThisItem =
              stock > 0 ? Math.min(MAX_QTY, stock) : MAX_QTY;

            const key = p?._id || p?.slug || p?.title || "item";
            const title =
              String(
                p?.title ?? p?.name ?? p?.productName ?? p?.slug ?? "Product",
              ).trim() || "Product";

            // ✅ INSTANT TOAST: fire toast first, then state update
            const dec = (e) => {
              e?.preventDefault?.();
              e?.stopPropagation?.();
              if (isOut) return;

              if (qty <= 1) {
                toast.dismiss(`min-${key}`);
                toast.info("ℹ️ Minimum quantity is 1", {
                  toastId: `min-${key}`,
                });
                return;
              }

              const next = clampQty(p, qty - 1);

              toast.dismiss(`qty-${key}`);
              toast.info(`➖ ${title} quantity: ${next}`, {
                toastId: `qty-${key}`,
              });

              updateQty(p._id, next);
            };

            const inc = (e) => {
              e?.preventDefault?.();
              e?.stopPropagation?.();
              if (isOut) return;

              if (qty >= maxForThisItem) {
                toast.dismiss(`max-${key}`);
                toast.info(`ℹ️ Max ${maxForThisItem} allowed for ${title}`, {
                  toastId: `max-${key}`,
                });
                return;
              }

              const next = clampQty(p, qty + 1);

              toast.dismiss(`qty-${key}`);
              toast.success(`➕ ${title} quantity: ${next}`, {
                toastId: `qty-${key}`,
              });

              updateQty(p._id, next);
            };

            const handleRemove = (e) => {
              e?.preventDefault?.();
              e?.stopPropagation?.();

              toast.dismiss(`rm-${key}`);
              toast.info(`🗑️ Removed ${title} from cart`, {
                toastId: `rm-${key}`,
              });

              setRemoving((prev) => new Set(prev).add(String(p._id)));

              setTimeout(() => {
                removeFromCart(p._id);
                setRemoving((prev) => {
                  const next = new Set(prev);
                  next.delete(String(p._id));
                  return next;
                });
              }, 250);
            };

            return (
              <div
                key={p._id}
                style={animDelay(i)}
                className={[
                  "group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40 p-4 transition hover:bg-slate-950/60",
                  "opacity-0 translate-y-2 animate-[cartIn_420ms_ease-out_forwards]",
                  removing.has(String(p._id))
                    ? "animate-[cartOut_250ms_ease-in_forwards]"
                    : "",
                  isOut ? "opacity-50 grayscale" : "",
                ].join(" ")}
              >
                {isOut && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                    <div className="rounded-full bg-black/60 px-4 py-2 text-xs font-black uppercase tracking-widest text-rose-200 border border-rose-500/30">
                      Out of stock
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/30">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={title}
                          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-[10px] font-bold text-slate-500">
                          NO IMG
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 to-transparent pointer-events-none" />
                    </div>

                    <div className="min-w-0">
                      <div
                        className={[
                          "text-base font-black line-clamp-2",
                          isOut ? "line-through text-slate-300" : "text-white",
                        ].join(" ")}
                      >
                        {title}
                      </div>

                      {showDiscount ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-sm text-slate-500 line-through">
                            {fmtINR(strikePrice)}
                          </span>
                          <span className="text-lg font-black text-white">
                            {fmtINR(unitPrice)}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1 text-lg font-black text-white">
                          {fmtINR(unitPrice)}
                        </div>
                      )}

                      <div className="mt-1 text-xs text-slate-500">
                        Unit price
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Stock:{" "}
                        <span
                          className={
                            isOut
                              ? "text-rose-300 font-bold"
                              : "text-slate-200 font-bold"
                          }
                        >
                          {stock}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:items-end">
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Quantity
                      </div>

                      <div className="flex items-center rounded-xl bg-slate-800 p-1 border border-slate-700">
                        <button
                          type="button"
                          onClick={(e) => dec(e)}
                          disabled={isOut || qty <= 1}
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-40"
                        >
                          -
                        </button>

                        <span className="w-12 text-center text-lg font-bold text-white">
                          {qty}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => inc(e)}
                          disabled={isOut || qty >= maxForThisItem}
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-widest text-slate-500">
                          Line total
                        </div>
                        <div className="mt-1 text-lg font-black text-white">
                          {fmtINR(lineTotal)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleRemove(e)}
                        className="relative z-20 inline-flex h-11 w-11 items-center justify-center hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/30 transition"
                        aria-label="Remove item"
                        title="Remove"
                      >
                        <img
                          src={TrashIcon}
                          alt="trash"
                          style={{ width: "32px", height: "32px" }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-800 pt-6">
          <Link
            to="/products"
            className="rounded-2xl border border-slate-800 bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900 transition text-center"
          >
            ← Continue shopping
          </Link>

          <button
            onClick={handleCheckout}
            className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:translate-y-[-2px] active:translate-y-[0px]"
          >
            Proceed to Checkout →
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="h-fit rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
        <h3 className="text-sm font-black uppercase tracking-widest text-white">
          Summary
        </h3>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Subtotal (discount applied)</span>
            <span className="font-black text-slate-100">
              {fmtINR(computedSubtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Subtotal (context)</span>
            <span className="font-bold text-slate-400">
              {fmtINR(originalSubtotal)}
            </span>
          </div>

          {originalSubtotal > computedSubtotal && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-300">You saved</span>
              <span className="font-bold text-emerald-200">
                {fmtINR(originalSubtotal - computedSubtotal)}
              </span>
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-xs uppercase tracking-widest text-slate-500">
              Total Payable
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {fmtINR(computedSubtotal)}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Shipping & taxes calculated at checkout.
            </div>
          </div>
        </div>

        <button
          onClick={handleCheckout}
          className="mt-6 w-full rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:translate-y-[-2px] active:translate-y-[0px]"
        >
          Checkout
        </button>

        <p className="mt-3 text-xs text-slate-500 text-center">
          Secure checkout • Fast support
        </p>
      </div>
    </div>
  );
}
