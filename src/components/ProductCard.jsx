import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { toast } from "react-toastify";
import { useState, useEffect } from "react";

const formatINR = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

const getDiscountPercent = (p) => {
  const price = Number(p?.price || 0);
  const dp = Number(p?.discountPrice || 0);
  if (!dp || dp >= price) return 0;
  return Math.round(((price - dp) / price) * 100);
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
    <span className="inline-flex items-center whitespace-nowrap leading-none px-2.5 py-1 text-[10px] font-bold rounded-full bg-rose-500/15 text-red-600 border border-rose-500/20">
      🔥 {days > 0 ? `${days}d ` : ""}
      {pad2(hours)}:{pad2(minutes)}:{pad2(seconds)} left
    </span>
  );
}

// per-product toast count (in-memory)
const cartToastCount = {};
const MAX_QTY = 10;

export default function ProductCard({
  product,
  isWishlisted = false,
  onToggleWishlist,
}) {
  // ✅ get cart too so we can cap properly
  const { addToCart, cart } = useCart();

  // ✅ live tick for countdown
  const [nowTick, setNowTick] = useState(() => Date.now());

  // ✅ Timed offer
  const t = product?.timedOffer;
  const isTimedLive = t?.effectiveActive === true;

  useEffect(() => {
    if (!isTimedLive) return;
    if (!t?.endAt) return;

    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isTimedLive, t?.endAt]);

  const endedByTime = t?.endAt ? new Date(t.endAt).getTime() <= nowTick : false;
  const showTimedLive = isTimedLive && !endedByTime;

  // --- Data normalization ---
  const imgUrl =
    product?.images?.[0]?.url || product?.image || product?.thumbnail || "";

  const name =
    product?.title || product?.name || product?.productName || "Product";
  const slug = product?.slug || "";
  const brand = product?.brand?.name || product?.brand || "TechForge";
  const category = product?.category?.name || product?.category || "";

  const type = product?.type || "SINGLE";
  const isBundle = type === "BUNDLE";

  // ✅ Bundle base price = sum of individual item discountPrice (fallback to item price) * qty
  const bundleItems = Array.isArray(product?.bundleItems)
    ? product.bundleItems
    : [];

  // ✅ Rating + Reviews (SINGLE vs BUNDLE)
  const childReviewsTotal = isBundle
    ? bundleItems.reduce((sum, it) => {
        const cnt = Number(it?.product?.ratingsCount || 0);
        return sum + (Number.isFinite(cnt) ? cnt : 0);
      }, 0)
    : Number(product?.ratingsCount || 0);

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

        return totalCount > 0 ? totalWeighted / totalCount : 0;
      })()
    : Number(product?.avgRating || product?.rating || 0);

  const rating = Number.isFinite(bundleWeightedAvg) ? bundleWeightedAvg : 0;
  const reviewsCount = Number.isFinite(childReviewsTotal)
    ? childReviewsTotal
    : 0;

  const individualTotal = isBundle
    ? bundleItems.reduce((sum, it) => {
        const qty = Number(it?.qty ?? 1);

        const p = it?.product || {};
        const itemPrice = Number(p?.price ?? 0);
        const itemDp = Number(p?.discountPrice ?? 0);

        // take discountPrice only if it's valid (< price)
        const unit =
          Number.isFinite(itemDp) && itemDp > 0 && itemDp < itemPrice
            ? itemDp
            : Number.isFinite(itemPrice)
              ? itemPrice
              : 0;

        return sum + unit * (Number.isFinite(qty) ? qty : 1);
      }, 0)
    : 0;

  // ✅ Use bundleStock for bundles, else normal stock
  const stock = Math.max(
    0,
    Number(isBundle ? (product?.bundleStock ?? 0) : (product?.stock ?? 0)) || 0,
  );

  const outOfStock = stock <= 0;

  const stockStatus = outOfStock
    ? "Out of Stock"
    : stock <= 5
      ? "Low Stock"
      : "In Stock";

  const price = Number(product?.price || 0);
  const dp = Number(product?.discountPrice || 0);
  const hasDiscount = dp > 0 && dp < price;
  // ✅ what customer should pay NOW (server may send finalPrice for timed offers)
  const finalPrice = Number(
    product?.finalPrice ?? (isBundle ? price : hasDiscount ? dp : price),
  );

  // ✅ strike price for NON-bundle timed offer display
  const strikePrice = !isBundle && (showTimedLive || hasDiscount) ? price : 0;

  // ✅ timed % off for NON-bundle
  const timedOff =
    showTimedLive && strikePrice > 0 && finalPrice < strikePrice
      ? Math.round(((strikePrice - finalPrice) / strikePrice) * 100)
      : 0;

  const off = hasDiscount ? getDiscountPercent(product) : 0;

  const bundlePayNow = showTimedLive ? finalPrice : hasDiscount ? dp : price;

  const bundleOff =
    isBundle && individualTotal > 0 && bundlePayNow < individualTotal
      ? Math.round(((individualTotal - bundlePayNow) / individualTotal) * 100)
      : 0;

  const getKey = () => product?._id || product?.slug || name;

  const getCartQtyForThis = () => {
    const pid = String(product?._id);
    const item = (cart || []).find((x) => {
      const id = String(x?.product?._id || x?._id);
      return id === pid;
    });
    return Number(item?.qty || 0);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const key = getKey();

    if (outOfStock) {
      toast.error(`❌ ${name} is out of stock`, { toastId: `oos-${key}` });
      return;
    }

    const current = getCartQtyForThis();
    const maxAllowed = Math.min(stock, MAX_QTY);

    // already at cap
    if (current >= maxAllowed) {
      toast.info(`ℹ️ Max ${maxAllowed} allowed for ${name}`, {
        toastId: `max-${key}`,
      });
      return;
    }

    // how many can we add right now
    const addable = Math.min(1, maxAllowed - current);

    addToCart(product, addable);

    // update toast count only for what we added
    cartToastCount[key] = (cartToastCount[key] || 0) + addable;

    const qtyToast = cartToastCount[key];
    const toastId = `cart-${key}`;

    const closeReset = () => {
      cartToastCount[key] = 0;
    };

    if (toast.isActive(toastId)) {
      toast.update(toastId, {
        render: `🛒 ${name} added to cart (x${qtyToast})`,
        type: "success",
        autoClose: 1800,
        onClose: closeReset,
      });
    } else {
      toast.success(`🛒 ${name} added to cart`, {
        toastId,
        autoClose: 1800,
        onClose: closeReset,
      });
    }
  };

  const showWishlist = typeof onToggleWishlist === "function";

  return (
    <div className="group bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-500/50 transition-all duration-500 flex flex-col h-full">
      <Link
        to={slug ? `/product/${slug}` : "#"}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="block h-full"
      >
        <div className="relative h-[300px] overflow-hidden bg-slate-800">
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={name}
              className="w-full h-full object-cover transform-gpu will-change-transform group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-slate-500 text-sm">
              No Image
            </div>
          )}
          {/* Timed Offer Bottom-Left */}
          {showTimedLive && (
            <div className="absolute bottom-3 left-3 flex flex-col items-start gap-2 z-10">
              <span className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-xl">
                ⚡ Limited Time
              </span>

              <TimedOfferCountdown endAt={t?.endAt} now={nowTick} />
            </div>
          )}

          {/* Wishlist Button */}
          {showWishlist && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleWishlist(product?._id);

                toast(
                  isWishlisted
                    ? `${name} removed from wishlist`
                    : `${name} added to wishlist`,
                  {
                    type: isWishlisted ? "info" : "success",
                    toastId: `wishlist-${product?._id || name}`,
                  },
                );
              }}
              className={`absolute top-3 right-3 p-2.5 rounded-xl border transition-all duration-300 active:scale-75 z-10 ${
                isWishlisted
                  ? "bg-rose-500/20 border-rose-500/50 text-rose-500 shadow-lg shadow-rose-500/20"
                  : "bg-slate-950/40 border-white/10 text-slate-400 hover:text-white hover:bg-slate-950/60"
              }`}
              aria-label={
                isWishlisted ? "Remove from wishlist" : "Add to wishlist"
              }
              title={isWishlisted ? "Wishlisted" : "Wishlist"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-5 h-5 transition-transform duration-300 ${
                  isWishlisted ? "scale-110" : ""
                }`}
                fill={isWishlisted ? "currentColor" : "none"}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col items-start gap-2">
            {type === "BUNDLE" &&
              Array.isArray(product?.tags) &&
              product.tags.length > 0 && (
                <span className="inline-flex items-center whitespace-nowrap leading-none px-2.5 py-1 text-[10px] font-medium rounded-full bg-indigo-500/20 text-indigo-900 border border-indigo-500/20">
                  {product.tags.join(", ")}
                </span>
              )}

            {product?.category && (
              <span className="inline-flex items-center whitespace-nowrap leading-none px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-950/80 text-white border border-white/10 shadow-xl">
                {category}
              </span>
            )}

            {outOfStock ? (
              <span className="inline-flex items-center whitespace-nowrap leading-none px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/20">
                Out of Stock
              </span>
            ) : stock <= 5 ? (
              <span className="inline-flex items-center whitespace-nowrap leading-none px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/20">
                Limited
              </span>
            ) : null}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-grow">
          <div className="mb-2">
            <span className="text-xs font-medium text-indigo-400 uppercase tracking-wide">
              {brand}
            </span>

            <h3 className="text-lg font-bold text-slate-100 leading-tight line-clamp-2 mt-1 group-hover:text-indigo-400 transition-colors">
              {name}
            </h3>
          </div>

          {/* Rating */}
          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => {
                const filled = i < Math.floor(rating || 0);
                return (
                  <svg
                    key={i}
                    className={`w-3.5 h-3.5 ${filled ? "fill-current" : "fill-slate-700"}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                );
              })}
            </div>

            <span className="text-xs font-semibold text-slate-500">
              {rating > 0 ? rating.toFixed(1) : "—"}
            </span>

            {reviewsCount > 0 && (
              <>
                <span className="text-xs text-slate-600">•</span>
                <span className="text-xs font-semibold text-slate-500">
                  {reviewsCount.toLocaleString("en-IN")} review
                  {reviewsCount === 1 ? "" : "s"}
                </span>
              </>
            )}
          </div>

          {/* Price + Stock + Cart */}
          <div className="mt-auto flex items-center justify-between">
            <div className="flex flex-col gap-1">
              {isBundle ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-white">
                      {formatINR(
                        showTimedLive ? finalPrice : hasDiscount ? dp : price,
                      )}
                    </span>

                    {bundleOff > 0 && (
                      <span className="inline-flex items-center whitespace-nowrap leading-none px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/20 shadow-xl">
                        -{bundleOff}% OFF
                      </span>
                    )}
                  </div>

                  {individualTotal > 0 && (
                    <span className="text-xs font-bold text-slate-500 line-through">
                      {formatINR(individualTotal)}
                    </span>
                  )}
                </>
              ) : showTimedLive ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-white">
                      {formatINR(finalPrice)}
                    </span>

                    {timedOff > 0 && (
                      <span className="inline-flex items-center whitespace-nowrap leading-none px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/20 shadow-xl">
                        -{timedOff}% OFF
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-bold text-slate-500 line-through">
                    {formatINR(strikePrice)}
                  </span>
                </>
              ) : hasDiscount ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-white">
                      {formatINR(dp)}
                    </span>

                    <span className="inline-flex items-center whitespace-nowrap leading-none px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-950/80 text-white border border-white/10 shadow-xl">
                      -{off}% OFF
                    </span>
                  </div>

                  <span className="text-xs font-bold text-slate-500 line-through">
                    {formatINR(price)}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-black text-white">
                  {formatINR(price)}
                </span>
              )}

              <span
                className={`text-[10px] font-bold uppercase tracking-tight ${
                  outOfStock ? "text-rose-500" : "text-emerald-500"
                }`}
              >
                {isBundle ? "Bundle Stock" : "Stock"}: {stock} • {stockStatus}
              </span>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={outOfStock}
              className={`p-2.5 rounded-xl active:scale-95 transition-all shadow-lg border ${
                outOfStock
                  ? "bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed"
                  : "bg-slate-800 text-white hover:bg-indigo-600 border-slate-700 group-hover:border-indigo-500/50"
              }`}
              aria-label="Add to cart"
              title="Add to cart"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
}
