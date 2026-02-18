import { useEffect, useMemo, useState } from "react";
import BrandBadge from "./BrandBadge";
import { Icons } from "./constants";

const formatINR = (amount) => {
  const n = Number(amount || 0);
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
};
const pad2 = (n) => String(n).padStart(2, "0");

function TimedOfferCountdown({ endAt, now }) {
  if (!endAt) return null;

  const end = new Date(endAt).getTime();
  const diff = end - now;
  if (!Number.isFinite(end) || diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return (
    <span className="inline-flex items-center whitespace-nowrap leading-none px-2.5 py-1 text-[11px] font-bold rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/20">
      🔥 {days > 0 ? `${days}d ` : ""}
      {pad2(hours)}:{pad2(minutes)}:{pad2(seconds)} left
    </span>
  );
}

function RatingRow({ rating = 0, count = 0 }) {
  const r = Math.max(0, Math.min(5, Number(rating || 0)));
  const c = Math.max(0, Number(count || 0));

  if (!c) {
    return (
      <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="text-slate-400">★</span>
          <span>No reviews yet</span>
        </span>
      </div>
    );
  }

  const full = Math.floor(r);
  const frac = r - full;
  const half = frac >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1">
        {Array.from({ length: full }).map((_, i) => (
          <span
            key={`f-${i}`}
            className="text-amber-400 text-base leading-none"
          >
            ★
          </span>
        ))}
        {half === 1 && (
          <span className="text-amber-400 text-base leading-none">★</span>
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <span
            key={`e-${i}`}
            className="text-slate-700 text-base leading-none"
          >
            ★
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="font-extrabold text-white">{r.toFixed(1)}</span>
        <span className="text-slate-500">•</span>
        <span className="text-slate-400">
          {c.toLocaleString("en-IN")} review{c === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

export default function ProductInfo({
  product,
  stock = 0,
  onAddToCart,
  onBuyNow,
}) {
  const [quantity, setQuantity] = useState(1);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    setQuantity(1);
  }, [product?._id]);

  const disabled = stock === 0;

  const clampQty = (q) => {
    const max = Math.min(stock > 0 ? stock : 1, 10);
    return Math.min(Math.max(Number(q) || 1, 1), max);
  };

  const inc = () => setQuantity((q) => clampQty(q + 1));
  const dec = () => setQuantity((q) => clampQty(q - 1));

  const wMonths = Number(product?.warranty?.months || 0);

  const warrantyLabel = useMemo(() => {
    if (wMonths <= 0) return "No Warranty";

    if (wMonths % 12 === 0) {
      const years = wMonths / 12;
      return `${years} Year${years > 1 ? "s Warranty" : ""}`;
    }

    return `${wMonths} Month${wMonths > 1 ? "s Warranty" : ""}`;
  }, [wMonths]);

  const type = product?.type || "SINGLE";
  const isBundle = type === "BUNDLE";

  const price = Number(product?.price || 0);
  const dpRaw = product?.discountPrice;
  const dp = dpRaw != null ? Number(dpRaw) : 0;
  const hasDiscount = Number.isFinite(dp) && dp > 0 && dp < price;

  const t = product?.timedOffer || null;

  // endTime used for LIVE countdown
  const endTime = t?.endAt ? new Date(t.endAt).getTime() : 0;

  // ✅ status from backend if available
  const uiStatus = t?.uiStatus; // "LIVE" | "ENDED" | "NONE" (from list aggregation)
  const endedTodayFlag = t?.endedToday === true;

  // ✅ compat: some APIs only send effectiveActive, some only isActive
  const isTimedActiveFlag = t?.effectiveActive === true || t?.isActive === true;

  // ✅ derive LIVE / ENDED client-side fallback (if backend didn't send uiStatus)
  const computedLive = isTimedActiveFlag && endTime > nowTick;
  const computedEnded = isTimedActiveFlag && endTime > 0 && endTime <= nowTick;

  const isTimedLive = uiStatus ? uiStatus === "LIVE" : computedLive;

  // ✅ show ENDED badge for rest of day if backend marks endedToday
  // (fallback: if uiStatus says ENDED, we show it; if not, we avoid guessing “today” on client)
  const isTimedEndedToday = uiStatus
    ? uiStatus === "ENDED" || endedTodayFlag
    : false;

  // ticker only needed for LIVE countdown
  useEffect(() => {
    if (!isTimedLive) return;
    if (!t?.endAt) return;

    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isTimedLive, t?.endAt]);

  // ✅ compute payNow
  // Priority:
  // 1) use backend product.finalPrice if it exists (already resolved by backend)
  // 2) else: timed LIVE => timed price
  // 3) else: normal discount => discountPrice
  // 4) else: price
  const backendFinal = product?.finalPrice;
  const backendFinalNum =
    backendFinal != null && backendFinal !== "" ? Number(backendFinal) : null;

  const timedPrice =
    t?.price != null && t?.price !== "" ? Number(t.price) : null;

  const normalPrice = hasDiscount ? dp : price;

  const payNow = Number.isFinite(backendFinalNum)
    ? backendFinalNum
    : isTimedLive && Number.isFinite(timedPrice)
      ? timedPrice
      : normalPrice;

  // ✅ strike price
  // SINGLE: show strike (MRP) if any offer (discount or timed or endedToday)
  // BUNDLE: your special logic stays
  const bundleItems = Array.isArray(product?.bundleItems)
    ? product.bundleItems
    : [];

  const individualTotal = isBundle
    ? bundleItems.reduce((sum, it) => {
        const qty = Number(it?.qty ?? 1);
        const p = it?.product || {};
        const itemPrice = Number(p?.price ?? 0);
        const itemDp = Number(p?.discountPrice ?? 0);

        const unit = itemDp > 0 && itemDp < itemPrice ? itemDp : itemPrice;
        return sum + unit * (Number.isFinite(qty) ? qty : 1);
      }, 0)
    : 0;

  const strike = isBundle
    ? individualTotal
    : (isTimedLive || hasDiscount || isTimedEndedToday) && price > 0
      ? price
      : 0;

  const offPercent =
    strike > 0 && payNow < strike
      ? Math.round(((strike - payNow) / strike) * 100)
      : 0;

  // ✅ Rating (SINGLE vs BUNDLE)

  // Total child reviews
  const childReviewsTotal = isBundle
    ? bundleItems.reduce((sum, it) => {
        const cnt = Number(it?.product?.ratingsCount || 0);
        return sum + (Number.isFinite(cnt) ? cnt : 0);
      }, 0)
    : 0;

  // Weighted average for bundle
  const bundleWeightedAvg = isBundle
    ? (() => {
        let totalWeighted = 0;
        let totalCount = 0;

        for (const it of bundleItems) {
          const avg = Number(it?.product?.avgRating || 0);
          const cnt = Number(it?.product?.ratingsCount || 0);

          if (!Number.isFinite(avg) || !Number.isFinite(cnt) || cnt <= 0)
            continue;

          totalWeighted += avg * cnt;
          totalCount += cnt;
        }

        return totalCount > 0
          ? Number((totalWeighted / totalCount).toFixed(2))
          : 0;
      })()
    : 0;

  const displayRating = isBundle
    ? bundleWeightedAvg
    : Number(product?.avgRating ?? 0);

  const displayReviews = isBundle
    ? childReviewsTotal
    : Number(product?.ratingsCount ?? 0);

  return (
    <div className="flex flex-col">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-sm font-semibold text-indigo-400">
        <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
        <span>
          {stock > 0 ? `In Stock — ${stock} available` : "Out of Stock"}
        </span>
      </div>

      <h1 className="text-3xl font-extrabold text-white md:text-4xl lg:text-5xl leading-tight">
        {product?.title}
      </h1>

      {/* ✅ Brand line */}
      {/* ✅ FIX: no div inside p */}
      <div className="mt-3 flex items-center gap-3 text-lg font-medium text-slate-400">
        <span className="shrink-0">{isBundle ? "Brands:" : "Brand:"}</span>

        {isBundle ? (
          (() => {
            const brandMap = new Map();

            (product?.bundleItems || []).forEach((it) => {
              const b = it?.product?.brand;

              if (b && typeof b === "object") {
                const id = b?._id;
                if (id && !brandMap.has(id)) brandMap.set(id, b);
                return;
              }

              const nameGuess = it?.product?.brandName; // optional
              const id = typeof b === "string" ? b : null;

              if (id && nameGuess && !brandMap.has(id)) {
                brandMap.set(id, { _id: id, name: nameGuess });
              }
            });

            const brands = Array.from(brandMap.values());

            if (!brands.length)
              return <span className="text-slate-500">—</span>;

            return (
              <div className="flex flex-wrap gap-2">
                {brands.map((b) =>
                  b && typeof b === "object" ? (
                    <BrandBadge key={b._id} brand={b} size="lg" />
                  ) : null,
                )}
              </div>
            );
          })()
        ) : (
          <BrandBadge brand={product?.brand} size="lg" />
        )}
      </div>

      <RatingRow rating={displayRating} count={displayReviews} />

      {/* Pricing */}
      <div className="mt-8 flex flex-col gap-1">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-4xl font-black text-white">
            ₹{formatINR(payNow)}
          </span>

          {offPercent > 0 && (
            <span className="rounded-md bg-rose-500/10 px-2 py-1 text-sm font-bold text-rose-500">
              -{offPercent}%
            </span>
          )}

          {/* ✅ Timed Offer: LIVE */}
          {isTimedLive && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md">
                ⚡ Limited
              </span>
              <TimedOfferCountdown endAt={t?.endAt} now={nowTick} />
            </div>
          )}

          {/* ✅ Timed Offer: ENDED today */}
          {!isTimedLive && isTimedEndedToday && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg bg-slate-700/60 text-slate-100 border border-slate-600">
                ⏳ Offer Ended
              </span>
            </div>
          )}
        </div>

        {strike > 0 && strike !== payNow && (
          <p className="text-lg text-slate-500 line-through">
            ₹{formatINR(strike)}
          </p>
        )}
      </div>

      <div className="mt-6 space-y-6 text-slate-300 leading-relaxed max-w-xl">
        {product?.description && (
          <p className="whitespace-pre-line">{product.description}</p>
        )}

        {/* Bundle included items */}
        {isBundle && bundleItems.length > 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-black text-white">Included Items</h2>

            {bundleItems.map((it, idx) => {
              const ip = it?.product || {};
              const itemName =
                ip?.title || ip?.name || ip?.productName || `Item ${idx + 1}`;

              const itemDesc = ip?.description || "";

              const specs = Array.isArray(ip?.specifications)
                ? ip.specifications
                : Array.isArray(ip?.specs)
                  ? ip.specs
                  : Array.isArray(ip?.highlights)
                    ? ip.highlights
                    : Array.isArray(ip?.features)
                      ? ip.features
                      : [];

              return (
                <div
                  key={ip?._id || idx}
                  className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4"
                >
                  <h3 className="text-base font-extrabold text-indigo-400">
                    {itemName}
                    {Number(it?.qty || 1) > 1 ? (
                      <span className="ml-2 text-xs font-bold text-slate-400">
                        x{Number(it?.qty || 1)}
                      </span>
                    ) : null}
                  </h3>

                  {itemDesc && (
                    <p className="mt-2 whitespace-pre-line text-slate-400">
                      {itemDesc}
                    </p>
                  )}

                  {specs.length > 0 && (
                    <ul className="mt-3 list-disc pl-5 text-sm text-slate-500 space-y-1">
                      {specs.map((s, i) => (
                        <li key={i}>{String(s)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quantity */}
      <div className="mt-10 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Quantity
          </label>

          <div className="flex items-center rounded-xl bg-slate-800 p-1 border border-slate-700">
            <button
              type="button"
              onClick={dec}
              disabled={disabled}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-40"
            >
              -
            </button>

            <span className="w-12 text-center text-lg font-bold text-white">
              {quantity}
            </span>

            <button
              type="button"
              onClick={inc}
              disabled={disabled}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-40"
            >
              +
            </button>
          </div>

          {stock > 10 && <span className="text-xs text-slate-500">Max 10</span>}
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAddToCart?.(quantity)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:translate-y-[-2px] disabled:opacity-50"
          >
            Add to Cart
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => onBuyNow?.(quantity)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-lg font-bold text-slate-900 transition-all hover:bg-slate-100 hover:translate-y-[-2px] disabled:opacity-50"
          >
            Buy Now
          </button>
        </div>
      </div>

      {/* Badges */}
      <div className="mt-12 grid grid-cols-2 gap-4 border-t border-slate-800 pt-8 sm:grid-cols-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-indigo-400">
            <Icons.Shield />
          </div>
          <div className="text-xs">
            <p className="font-bold text-slate-200">{warrantyLabel}</p>
            <p className="text-slate-500">Premium Protection</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-emerald-400">
            <Icons.Truck />
          </div>
          <div className="text-xs">
            <p className="font-bold text-slate-200">Fast Shipping</p>
            <p className="text-slate-500">2-3 Business Days</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-amber-400">
            <Icons.Return />
          </div>

          <div className="text-xs">
            <p className="font-bold text-slate-200">Easy Returns</p>
            <p className="text-slate-500">7 Days Return Window</p>
          </div>
        </div>
      </div>
    </div>
  );
}
