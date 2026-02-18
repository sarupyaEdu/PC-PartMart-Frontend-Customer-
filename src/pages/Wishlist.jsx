import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

import { getWishlist } from "../api/wishlist";
import { listProducts } from "../api/products";

import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import ProductCard from "../components/ProductCard";

const normalize = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const getFinalPrice = (p) => {
  // prefer server computed finalPrice, else fallback
  const fp = Number(p?.finalPrice);
  if (Number.isFinite(fp) && fp > 0) return fp;

  const price = Number(p?.price || 0);
  const dp = Number(p?.discountPrice || 0);
  if (dp > 0 && dp < price) return dp;
  return price;
};

const getStrikePrice = (p) => {
  const price = Number(p?.price || 0);
  return price;
};

const getDiscountPercent = (p) => {
  const price = Number(p?.price || 0);
  const finalP = getFinalPrice(p);
  if (!price || finalP >= price) return 0;
  return Math.round(((price - finalP) / price) * 100);
};

const isLiveTimed = (p) =>
  p?.timed === true || p?.timedOffer?.uiStatus === "LIVE";

function SkeletonCard() {
  return (
    <div className="w-full max-w-[380px] rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden animate-pulse">
      <div className="h-[220px] bg-slate-900/60" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 bg-slate-900/60 rounded" />
        <div className="h-3 w-1/2 bg-slate-900/60 rounded" />
        <div className="h-10 w-full bg-slate-900/60 rounded-xl mt-2" />
      </div>
    </div>
  );
}

// small helper for stagger delay (no libs)
const animDelay = (i) => ({ animationDelay: `${i * 60}ms` });

export default function Wishlist() {
  const [items, setItems] = useState([]); // card-ready products
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ UI controls
  const [q, setQ] = useState("");
  const [filterBy, setFilterBy] = useState("ALL"); // ALL | INSTOCK | DISCOUNTED | TIMED
  const [sortBy, setSortBy] = useState("ADDED_NEWEST"); // ADDED_NEWEST | PRICE_LOW | PRICE_HIGH | DISCOUNT | TIMED_FIRST

  // ✅ pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const [animKey, setAnimKey] = useState(0);

  // refresh timers if any LIVE offer exists
  const hasLiveTimedOffer = useMemo(() => {
    return items.some((p) => isLiveTimed(p));
  }, [items]);

  const fetchWishlistIds = async () => {
    const res = await getWishlist();
    const raw = res?.data?.items || [];

    const ids = raw
      .map((x) => x?.product?._id || x?.product)
      .filter(Boolean)
      .map(String);

    return { ids, raw };
  };

  const fetchCardProductsByIds = async (ids, rawOrder = []) => {
    if (!ids.length) return [];

    const res = await listProducts({
      ids: ids.join(","),
      page: 1,
      limit: Math.max(ids.length, 50),
      sort: "",
    });

    const products = res?.data?.products || [];

    // keep wishlist order stable based on raw
    const order = rawOrder
      .map((x) => String(x?.product?._id || x?.product || ""))
      .filter(Boolean);

    const map = new Map(products.map((p) => [String(p?._id), p]));
    const ordered = order.map((id) => map.get(id)).filter(Boolean);

    // ✅ attach "addedAt" for sorting by added newest (from wishlist raw)
    const addedAtMap = new Map(
      rawOrder
        .map((x) => {
          const id = String(x?.product?._id || x?.product || "");
          const at =
            x?.createdAt || x?.addedAt || x?.updatedAt || x?._id || null;
          return id ? [id, at] : null;
        })
        .filter(Boolean),
    );

    return ordered.map((p) => ({
      ...p,
      __wishAddedAt: addedAtMap.get(String(p?._id)) || null,
    }));
  };

  const loadWishlist = async () => {
    const { ids, raw } = await fetchWishlistIds();
    const prods = await fetchCardProductsByIds(ids, raw);
    setItems(prods);
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        await loadWishlist();
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refresh every 60s if live timed offers exist
  useEffect(() => {
    if (!hasLiveTimedOffer) return;

    const id = setInterval(async () => {
      try {
        await loadWishlist();
      } catch {}
    }, 60000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLiveTimedOffer]);

  const handleToggleWishlist = async (productId) => {
    if (!productId) return;

    if (!user) {
      toast.info("Please login to use wishlist");
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    const wasWishlisted = isWishlisted(productId);

    if (wasWishlisted) {
      setItems((prev) =>
        prev.filter((p) => String(p?._id) !== String(productId)),
      );
    }

    try {
      await toggleWishlist(productId);
      await new Promise((r) => setTimeout(r, 150));
      await loadWishlist();
    } catch {
      toast.error("Wishlist update failed");
      try {
        await loadWishlist();
      } catch {}
    }
  };

  // ✅ reset page when controls change
  useEffect(() => {
    setPage(1);
  }, [q, filterBy, sortBy, pageSize]);

  // ✅ filter + sort + paginate
  const visibleItems = useMemo(() => {
    const arr = Array.isArray(items) ? [...items] : [];

    // filter
    const filtered = arr.filter((p) => {
      const stock = Number(p?.bundleStock ?? p?.stock ?? 0);
      const inStock = stock > 0;
      const discounted = getDiscountPercent(p) > 0;
      const timed = isLiveTimed(p);

      if (filterBy === "INSTOCK") return inStock;
      if (filterBy === "DISCOUNTED") return discounted;
      if (filterBy === "TIMED") return timed;
      return true;
    });

    // search
    const qq = normalize(q);
    const searched = filtered.filter((p) => {
      if (!qq) return true;
      const title = normalize(p?.title);
      return title.includes(qq);
    });

    // sort
    const toAddedTime = (p) => {
      const t = new Date(p?.__wishAddedAt || 0).getTime();
      return Number.isFinite(t) ? t : 0;
    };

    searched.sort((a, b) => {
      if (sortBy === "ADDED_NEWEST") return toAddedTime(b) - toAddedTime(a);

      if (sortBy === "PRICE_LOW") return getFinalPrice(a) - getFinalPrice(b);
      if (sortBy === "PRICE_HIGH") return getFinalPrice(b) - getFinalPrice(a);

      if (sortBy === "DISCOUNT")
        return getDiscountPercent(b) - getDiscountPercent(a);

      if (sortBy === "TIMED_FIRST") {
        const ta = isLiveTimed(a) ? 0 : 1;
        const tb = isLiveTimed(b) ? 0 : 1;
        const t = ta - tb;
        if (t !== 0) return t;
        // tie-breaker: higher discount first, then newest added
        const d = getDiscountPercent(b) - getDiscountPercent(a);
        if (d !== 0) return d;
        return toAddedTime(b) - toAddedTime(a);
      }

      return toAddedTime(b) - toAddedTime(a);
    });

    return searched;
  }, [items, q, filterBy, sortBy]);

  const totalPages = useMemo(() => {
    const n = Math.ceil((visibleItems.length || 0) / Number(pageSize || 1));
    return Math.max(1, n);
  }, [visibleItems.length, pageSize]);

  const safePage = useMemo(
    () => Math.min(Math.max(1, page), totalPages),
    [page, totalPages],
  );

  useEffect(() => {
    // re-trigger grid animation on any change that updates visible list
    setAnimKey((k) => k + 1);
  }, [safePage, pageSize, q, filterBy, sortBy]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return visibleItems.slice(start, end);
  }, [visibleItems, safePage, pageSize]);

  const pageStart = (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, visibleItems.length);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-10">
        <div className="h-7 w-40 bg-slate-900/60 rounded animate-pulse" />
        <div className="mt-2 h-4 w-72 bg-slate-900/60 rounded animate-pulse" />

        <div className="mt-8 grid gap-8 grid-cols-[repeat(auto-fit,minmax(320px,1fr))] justify-items-start">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-10">
      {/* Header + Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Wishlist</h1>
          <p className="mt-1 text-sm text-slate-400">
            Total:{" "}
            <span className="text-slate-200 font-bold">{items.length}</span>
            {items.length !== visibleItems.length && (
              <>
                <span className="text-slate-600"> • </span>
                Showing:{" "}
                <span className="text-slate-200 font-bold">
                  {visibleItems.length}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          {/* search */}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by product name…"
            className="w-full sm:w-[320px] rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500/60"
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {/* sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-200 outline-none focus:border-indigo-500/60"
            >
              <option value="ADDED_NEWEST">Added: Newest</option>
              <option value="PRICE_LOW">Price: Low → High</option>
              <option value="PRICE_HIGH">Price: High → Low</option>
              <option value="DISCOUNT">Discount: High → Low</option>
              <option value="TIMED_FIRST">Timed offers first</option>
            </select>

            {/* page size */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-200 outline-none focus:border-indigo-500/60"
            >
              <option value={8}>8 / page</option>
              <option value={12}>12 / page</option>
              <option value={16}>16 / page</option>
              <option value={24}>24 / page</option>
            </select>
          </div>

          {/* filters */}
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {[
              ["ALL", "All"],
              ["INSTOCK", "In Stock"],
              ["DISCOUNTED", "Discounted"],
              ["TIMED", "Timed"],
            ].map(([key, label]) => {
              const active = filterBy === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilterBy(key)}
                  className={[
                    "rounded-full border px-3 py-1",
                    "text-[10px] font-black uppercase tracking-widest",
                    active
                      ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200"
                      : "border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-950/60",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empty */}
      {items.length === 0 ? (
        <p className="mt-4 text-slate-400">No items in wishlist.</p>
      ) : visibleItems.length === 0 ? (
        <p className="mt-4 text-slate-400">
          No items match your filters/search.
        </p>
      ) : (
        <>
          {/* Pagination bar */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Showing{" "}
              <span className="text-slate-200">
                {pageStart}-{pageEnd}
              </span>{" "}
              of <span className="text-slate-200">{visibleItems.length}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={safePage <= 1}
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-widest transition",
                  safePage <= 1
                    ? "border-slate-800 bg-slate-950/30 text-slate-600 cursor-not-allowed"
                    : "border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-950/80",
                ].join(" ")}
              >
                First
              </button>

              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-widest transition",
                  safePage <= 1
                    ? "border-slate-800 bg-slate-950/30 text-slate-600 cursor-not-allowed"
                    : "border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-950/80",
                ].join(" ")}
              >
                Prev
              </button>

              <div className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/60 text-xs font-black text-slate-200">
                {safePage} / {totalPages}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-widest transition",
                  safePage >= totalPages
                    ? "border-slate-800 bg-slate-950/30 text-slate-600 cursor-not-allowed"
                    : "border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-950/80",
                ].join(" ")}
              >
                Next
              </button>

              <button
                onClick={() => setPage(totalPages)}
                disabled={safePage >= totalPages}
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-widest transition",
                  safePage >= totalPages
                    ? "border-slate-800 bg-slate-950/30 text-slate-600 cursor-not-allowed"
                    : "border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-950/80",
                ].join(" ")}
              >
                Last
              </button>
            </div>
          </div>

          {/* Grid */}
          <div
            key={animKey}
            className="mt-6 grid gap-8 grid-cols-[repeat(auto-fit,minmax(320px,1fr))] justify-items-start"
          >
            {pagedItems.map((p, i) => (
              <div
                key={p?._id}
                style={animDelay(i)}
                className="
        w-full max-w-[380px]
        opacity-0 translate-y-2
        animate-[wishIn_420ms_ease-out_forwards]
      "
              >
                <ProductCard
                  product={p}
                  isWishlisted={isWishlisted(p?._id)}
                  onToggleWishlist={handleToggleWishlist}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
