import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProductBySlug, listProducts } from "../api/products";
import { useCart } from "../context/CartContext";
import { toast } from "react-toastify";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import ProductGallery from "../components/ProductGallery";
import ProductInfo from "../components/ProductInfo";
import ProductTabs from "../components/ProductTabs";
import ProductCard from "../components/ProductCard";

const normalizeTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags))
    return tags
      .map(String)
      .map((t) => t.trim())
      .filter(Boolean);
  return String(tags)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
};

const toYouTubeEmbedUrl = (url) => {
  if (!url) return "";
  try {
    const u = new URL(String(url).trim());

    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : "";
    }

    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;

      const parts = u.pathname.split("/").filter(Boolean);
      const embedIndex = parts.indexOf("embed");
      if (embedIndex !== -1 && parts[embedIndex + 1]) {
        return `https://www.youtube-nocookie.com/embed/${parts[embedIndex + 1]}`;
      }
    }

    return "";
  } catch {
    return "";
  }
};

// ✅ per-product toast counter (in-memory)
const cartToastCount = {};
const MAX_QTY = 10;
const animDelay = (i) => ({ animationDelay: `${i * 70}ms` });

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();

  // ✅ take cart also (needed to cap at 10 properly)
  const { addToCart, cart } = useCart();
  const { user } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const location = useLocation();
  const [animKey, setAnimKey] = useState(0);
  const [relAnimKey, setRelAnimKey] = useState(0);

  const handleToggleWishlist = async (productId) => {
    if (!user) {
      toast.info("Please login to use wishlist");
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    try {
      await toggleWishlist(productId);
    } catch {
      toast.error("Wishlist update failed");
    }
  };

  const [p, setP] = useState(null);

  const [related, setRelated] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  // carousel refs/state
  const relatedRef = useRef(null);
  const [showRelatedArrows, setShowRelatedArrows] = useState(false);

  const categoryId = useMemo(() => {
    const c = p?.category;
    if (!c) return "";
    if (typeof c === "string") return c;
    return c?._id || "";
  }, [p]);

  const updateRelatedArrows = () => {
    const el = relatedRef.current;
    if (!el) return;
    setShowRelatedArrows(el.scrollWidth > el.clientWidth + 2);
  };

  const scrollRelated = (dir) => {
    const el = relatedRef.current;
    if (!el) return;
    const amount = Math.max(280, Math.floor(el.clientWidth * 0.85));
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  // Fetch product
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await getProductBySlug(slug);
        const data = res.data?.product || res.data;
        if (alive) {
          setP(data);
          setAnimKey((k) => k + 1);
        }
      } catch (e) {
        console.log("DETAILS FETCH ERROR:", e?.response?.data || e.message);
        if (alive) setP(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [slug]);

  // Fetch related (same category ONLY)
  // Fetch related (bundle-aware)
  useEffect(() => {
    if (!p?._id) return;

    const isBundleNow = (p?.type || "SINGLE") === "BUNDLE";

    let alive = true;

    (async () => {
      setRelatedLoading(true);

      try {
        // ✅ normalized tags for queries (backend expects lowercase)
        const tagList = normalizeTags(p?.tags)
          .map((t) => String(t).trim().toLowerCase())
          .filter(Boolean);

        // ✅ SINGLE → category singles + tag bundles
        if (!isBundleNow) {
          if (!categoryId) {
            if (alive) setRelated([]);
            return;
          }

          // 1) singles from same category
          const resSingles = await listProducts({
            page: 1,
            limit: 20,
            category: categoryId,
            sort: "newest",
          });

          const singlesArr = resSingles.data?.products || [];
          const singlesFiltered = singlesArr
            .filter((x) => String(x?._id) !== String(p._id))
            .filter((x) => (x?.type || "SINGLE") !== "BUNDLE"); // keep only singles

          // 2) bundles by tags (only if tags exist)
          let bundlesFiltered = [];
          if (tagList.length) {
            const resBundles = await listProducts({
              page: 1,
              limit: 40,
              sort: "newest",
              tags: tagList.join(","),
              tagMode: "any",
              type: "bundle", // ✅ admin-only filter in your backend; if this doesn't work, remove it
            });

            const bundlesArr = resBundles.data?.products || [];
            bundlesFiltered = bundlesArr
              .filter((x) => String(x?._id) !== String(p._id))
              .filter((x) => (x?.type || "SINGLE") === "BUNDLE"); // keep only bundles
          }

          // ✅ merge + dedupe + cap to 8 (prefer singles first, then bundles)
          // ✅ merge + dedupe + cap to 8 (prefer bundles first, then singles)
          const merged = [];
          const seen = new Set();

          for (const item of [...bundlesFiltered, ...singlesFiltered]) {
            const id = String(item?._id || "");
            if (!id || seen.has(id)) continue;
            seen.add(id);
            merged.push(item);
            if (merged.length >= 8) break;
          }

          if (alive) setRelated(merged);
          return;
        }

        // ✅ BUNDLE → singles by tags (NO category filter because bundle category = "bundles")
        if (!tagList.length) {
          if (alive) setRelated([]);
          return;
        }

        const res = await listProducts({
          page: 1,
          limit: 40,
          sort: "newest",
          tags: tagList.join(","),
          tagMode: "any",
        });

        const arr = res.data?.products || [];

        const filtered = arr
          .filter((x) => String(x?._id) !== String(p._id))
          .filter((x) => (x?.type || "SINGLE") !== "BUNDLE")
          .slice(0, 8);

        if (alive) {
          setRelated(filtered);
          setRelAnimKey((k) => k + 1);
        }
      } catch (e) {
        console.log("RELATED FETCH ERROR:", e?.response?.data || e.message);
        if (alive) {
          setRelated([]);
          setRelAnimKey((k) => k + 1);
        }
      } finally {
        if (alive) setRelatedLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [p?._id, categoryId]);

  // update arrows when related changes & on resize
  useEffect(() => {
    updateRelatedArrows();
    window.addEventListener("resize", updateRelatedArrows);
    return () => window.removeEventListener("resize", updateRelatedArrows);
  }, [related.length]);

  const isBundle = (p?.type || "SINGLE") === "BUNDLE";

  const stock = Math.max(
    0,
    Number(isBundle ? (p?.bundleStock ?? 0) : (p?.stock ?? 0)) || 0,
  );

  const images = useMemo(() => {
    if (!p) return [];

    const type = p?.type || "SINGLE";
    const isBundle = type === "BUNDLE";

    // ✅ Base product images (common bundle image comes first automatically)
    const baseImages = Array.isArray(p?.images)
      ? p.images.map((x) => x?.url).filter(Boolean)
      : [];

    if (!isBundle) return baseImages;

    // ✅ Collect images from individual bundle products
    const bundleImages = (
      Array.isArray(p?.bundleItems) ? p.bundleItems : []
    ).flatMap((it) => {
      const ip = it?.product;
      if (!ip || !Array.isArray(ip?.images)) return [];
      return ip.images.map((img) => img?.url).filter(Boolean);
    });

    // ✅ Merge while removing duplicates (base first)
    return [...new Set([...baseImages, ...bundleImages])];
  }, [p]);

  const videoEmbed = useMemo(() => toYouTubeEmbedUrl(p?.youtubeUrl), [p]);
  const tags = useMemo(() => {
    // prefer direct tags if present
    const direct = normalizeTags(p?.tags);
    if (direct.length) return direct;

    // fallback: collect from bundle items' products
    const fromItems = (
      Array.isArray(p?.bundleItems) ? p.bundleItems : []
    ).flatMap((it) => normalizeTags(it?.product?.tags));

    return Array.from(new Set(fromItems));
  }, [p?.tags, p?.bundleItems]);

  const getKey = (prod) => prod?._id || prod?.slug || prod?.name || "product";

  const getName = (prod) =>
    String(
      prod?.title ??
        prod?.name ??
        prod?.productName ??
        prod?.displayName ??
        prod?.slug ??
        "Product",
    ).trim() || "Product";

  const getCartQtyFor = (prodId) => {
    const item = (cart || []).find(
      (x) => String(x?.product?._id || x?._id) === String(prodId),
    );
    return Number(item?.qty || 0);
  };

  const onAddToCart = (qty) => {
    if (!p) return;

    const key = getKey(p);
    const displayName = getName(p);

    const isBundleNow = (p?.type || "SINGLE") === "BUNDLE";
    const stockNow = Math.max(
      0,
      Number(isBundleNow ? (p?.bundleStock ?? 0) : (p?.stock ?? 0)) || 0,
    );

    if (stockNow <= 0) {
      toast.error(`❌ ${displayName} is out of stock`, {
        toastId: `oos-${key}`,
      });
      return;
    }

    const q = Math.max(1, Number(qty || 1));

    const current = getCartQtyFor(p._id);

    // max allowed = min(stock, MAX_QTY)
    const maxAllowed = Math.min(stockNow, MAX_QTY);

    if (current >= maxAllowed) {
      toast.info(`ℹ️ Max ${maxAllowed} allowed for ${displayName}`, {
        toastId: `max-${key}`,
      });
      return;
    }

    // only add the amount still allowed
    const addable = Math.min(q, maxAllowed - current);

    addToCart(p, addable);

    // update count only for what we really added
    cartToastCount[key] = (cartToastCount[key] || 0) + addable;

    const count = cartToastCount[key];
    const toastId = `cart-${key}`;

    const closeReset = () => {
      cartToastCount[key] = 0;
    };

    if (toast.isActive(toastId)) {
      toast.update(toastId, {
        render: `🛒 ${displayName} added to cart (x${count})`,
        type: "success",
        autoClose: 1800,
        onClose: closeReset,
      });
    } else {
      toast.success(`🛒 ${displayName} added to cart`, {
        toastId,
        autoClose: 1800,
        onClose: closeReset,
      });
    }

    // if user tried to add more than allowed, tell them
    if (addable < q) {
      toast.info(`ℹ️ Only ${maxAllowed} allowed for ${displayName}`, {
        toastId: `cap-${key}`,
      });
    }
  };

  const onBuyNow = (qty) => {
    if (!p) return;

    const q = Math.max(1, Number(qty || 1));
    const isBundleNow = (p?.type || "SINGLE") === "BUNDLE";
    const stockNow = Math.max(
      0,
      Number(isBundleNow ? (p?.bundleStock ?? 0) : (p?.stock ?? 0)) || 0,
    );

    const key = getKey(p);
    const displayName = getName(p);

    if (stockNow <= 0) {
      toast.error(`❌ ${displayName} is out of stock`, {
        toastId: `oos-${key}`,
      });
      return;
    }

    addToCart(p, q, { mode: "set" });

    toast.info(`⚡ Buying now: ${displayName}`, { toastId: `buynow-${key}` });

    navigate("/checkout", { state: { buyNowId: p._id } });
  };

  // ✅ safe early return AFTER all hooks
  if (!p)
    return (
      <div className="px-4 py-16 flex flex-col items-center justify-center text-slate-300 animate-fade-in">
        <div className="h-12 w-12 rounded-full border-4 border-slate-700 border-t-indigo-500 animate-spin mb-6" />
        <div className="text-sm uppercase tracking-widest text-slate-400">
          Loading product...
        </div>
      </div>
    );

  return (
    <main className="mx-auto max-w-7xl px-4 pt-12 md:px-8">
      <style>{`
      @keyframes pageIn {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes riseIn {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes popIn {
        from { opacity: 0; transform: translateY(-6px) scale(.98); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes heartBeat {
        0% { transform: scale(1); }
        40% { transform: scale(1.12); }
        100% { transform: scale(1); }
      }
    `}</style>

      <div
        key={animKey}
        className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20 opacity-0 translate-y-2 animate-[pageIn_520ms_ease-out_forwards]"
      >
        <div className="h-fit lg:sticky lg:top-28 relative opacity-0 translate-y-2 animate-[riseIn_520ms_ease-out_forwards] [animation-delay:80ms]">
          <ProductGallery images={images} />

          {/* Wishlist button on product image */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const id = p?._id;
              if (!id) return;

              handleToggleWishlist(id);

              toast(
                isWishlisted(id)
                  ? `${getName(p)} removed from wishlist`
                  : `${getName(p)} added to wishlist`,
                {
                  type: isWishlisted(id) ? "info" : "success",
                  toastId: `wishlist-details-${id}`,
                },
              );
            }}
            className={`absolute top-4 right-4 p-3 rounded-2xl border transition-all duration-300 active:scale-90 z-10 ${
              isWishlisted(p?._id)
                ? "bg-rose-500/20 border-rose-500/50 text-rose-500 shadow-lg shadow-rose-500/20"
                : "bg-slate-950/60 border-white/10 text-slate-300 hover:text-white hover:bg-slate-950/80"
            }`}
            aria-label={
              isWishlisted(p?._id) ? "Remove from wishlist" : "Add to wishlist"
            }
            title={isWishlisted(p?._id) ? "Wishlisted" : "Wishlist"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-6 h-6 transition-transform duration-300 ${
                isWishlisted(p?._id) ? "scale-110" : ""
              }`}
              fill={isWishlisted(p?._id) ? "currentColor" : "none"}
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
        </div>

        <div className="opacity-0 translate-y-2 animate-[riseIn_520ms_ease-out_forwards] [animation-delay:160ms]">
          {/* Tags */}
          {tags.length > 0 && (
            <div className="mb-5 opacity-0 animate-[popIn_320ms_ease-out_forwards] [animation-delay:220ms]">
              <div className="text-sm font-semibold text-slate-200">Tags</div>

              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 text-xs rounded-full border border-slate-800 bg-slate-900 text-slate-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <ProductInfo
            product={p}
            stock={stock}
            onAddToCart={onAddToCart}
            onBuyNow={onBuyNow}
          />
        </div>
      </div>

      <ProductTabs product={p} videoEmbed={videoEmbed} />

      {/* Related products */}
      <section className="mt-16 pb-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Related <span className="text-indigo-500">Products</span>
            </h3>
            <p className="mt-2 text-slate-400 text-sm">
              More items from the same category.
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="hidden sm:inline-flex px-4 py-2 rounded-xl border border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500/50 transition-all"
          >
            Back to top
          </button>
        </div>

        <div className="mt-8">
          {relatedLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden"
                >
                  <div className="aspect-square bg-slate-800 animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 w-24 bg-slate-800 animate-pulse rounded" />
                    <div className="h-4 w-3/4 bg-slate-800 animate-pulse rounded" />
                    <div className="h-8 w-32 bg-slate-800 animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : related.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
              No related products found.
            </div>
          ) : (
            <div className="relative">
              {showRelatedArrows && (
                <button
                  type="button"
                  onClick={() => scrollRelated(-1)}
                  className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10
                             h-11 w-11 rounded-2xl bg-slate-950/80 border border-slate-800
                             text-slate-200 hover:text-white hover:border-indigo-500/50 transition-all
                             items-center justify-center active:scale-95"
                  aria-label="Scroll related left"
                  title="Previous"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.4}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              )}

              {showRelatedArrows && (
                <button
                  type="button"
                  onClick={() => scrollRelated(1)}
                  className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10
                             h-11 w-11 rounded-2xl bg-slate-950/80 border border-slate-800
                             text-slate-200 hover:text-white hover:border-indigo-500/50 transition-all
                             items-center justify-center active:scale-95"
                  aria-label="Scroll related right"
                  title="Next"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.4}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}

              <div
                key={relAnimKey}
                ref={relatedRef}
                onScroll={updateRelatedArrows}
                className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 pr-2
             [-ms-overflow-style:none] [scrollbar-width:none]
             [&::-webkit-scrollbar]:hidden"
              >
                {related.map((rp, i) => (
                  <div
                    key={rp._id}
                    style={animDelay(i)}
                    className="snap-start flex-none w-[260px] sm:w-[290px] md:w-[310px]
               opacity-0 translate-y-2 animate-[riseIn_420ms_ease-out_forwards]"
                  >
                    <ProductCard
                      product={rp}
                      isWishlisted={isWishlisted(rp._id)}
                      onToggleWishlist={(id) => handleToggleWishlist(id)}
                    />
                  </div>
                ))}
              </div>

              {showRelatedArrows && (
                <>
                  <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-slate-950 to-transparent" />
                  <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-slate-950 to-transparent" />
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
