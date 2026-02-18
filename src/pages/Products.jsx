import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import Slider from "@mui/material/Slider";
import { toast } from "react-toastify";

import { listProducts } from "../api/products";
import { listCategories } from "../api/categories";
import { listBrands } from "../api/brands";

import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import ProductCard from "../components/ProductCard";

const PRICE_MIN = 0;
const PRICE_MAX = 200000;
const PRICE_STEP = 10000;

const formatINR = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

const SortLabel = {
  "": "Featured",
  newest: "Newest",
  "best-selling": "Best Selling",
  "price-asc": "Price: Low",
  "price-desc": "Price: High",
  "discount-desc": "Discount: High",
};

const PRICE_MARKS = [
  { value: 0, label: "₹0" },
  { value: 50000, label: "₹50k" },
  { value: 100000, label: "₹1L" },
  { value: 150000, label: "₹1.5L" },
  { value: 200000, label: "₹2L" },
];

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  // -----------------------------
  // URL is the SINGLE source of truth
  // -----------------------------
  const urlSearch = searchParams.get("search") || "";
  const urlCategories = useMemo(() => {
    const raw = searchParams.get("category");
    return raw ? raw.split(",") : [];
  }, [searchParams]);

  const urlBrands = useMemo(() => {
    const raw = searchParams.get("brand");
    return raw ? raw.split(",") : [];
  }, [searchParams]);

  const urlTags = useMemo(() => {
    const raw = searchParams.get("tags");
    return raw ? raw.split(",") : [];
  }, [searchParams]);

  const urlTagMode = searchParams.get("tagMode") || "any";

  const urlAvailability = searchParams.get("availability") || "";
  const urlSort = searchParams.get("sort") || "";
  const urlHasOffer = searchParams.get("hasOffer") || ""; // "true"

  const urlPage = Math.max(1, Number(searchParams.get("page") || 1));
  const urlLimit = Math.max(1, Number(searchParams.get("limit") || 12));

  const minParam = searchParams.get("minPrice");
  const maxParam = searchParams.get("maxPrice");

  const urlMinPrice =
    minParam !== null && !Number.isNaN(Number(minParam))
      ? Number(minParam)
      : PRICE_MIN;

  const urlMaxPrice =
    maxParam !== null && !Number.isNaN(Number(maxParam))
      ? Number(maxParam)
      : PRICE_MAX;

  const [priceRangeUI, setPriceRangeUI] = useState([urlMinPrice, urlMaxPrice]);

  useEffect(
    () => setPriceRangeUI([urlMinPrice, urlMaxPrice]),
    [urlMinPrice, urlMaxPrice],
  );

  // -----------------------------
  // data
  // -----------------------------
  const [items, setItems] = useState([]);
  // detect if any product has LIVE timed offer
  const hasLiveTimedOffer = useMemo(() => {
    return items.some(
      (p) => p?.timed === true || p?.timedOffer?.uiStatus === "LIVE",
    );
  }, [items]);

  const [cats, setCats] = useState([]);
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [cRes, bRes] = await Promise.all([
          listCategories(),
          listBrands(),
        ]);
        if (!alive) return;
        setCats(cRes.data?.categories || []);
        setBrands(bRes.data?.brands || []);
      } catch {}
    })();

    return () => {
      alive = false;
    };
  }, []);

  const [meta, setMeta] = useState({
    total: 0,
    page: urlPage,
    limit: urlLimit,
    pages: 1,
    hasPrev: false,
    hasNext: false,
  });

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // mobile filters
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // ✅ measure actual navbar height (works even if --nav-h is not set)
  const [navH, setNavH] = useState(72); // fallback

  useEffect(() => {
    const measure = () => {
      const nav =
        document.querySelector("nav") || document.querySelector("header");
      const h = nav?.getBoundingClientRect?.().height;
      setNavH(h && h > 0 ? Math.ceil(h) : 72);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const toggleCategory = (slug) => {
    const set = new Set(urlCategories);

    if (set.has(slug)) set.delete(slug);
    else set.add(slug);

    setParams({ category: Array.from(set).join(",") }, { resetPage: true });
  };

  const toggleBrand = (slug) => {
    const set = new Set(urlBrands);

    if (set.has(slug)) set.delete(slug);
    else set.add(slug);

    setParams({ brand: Array.from(set).join(",") }, { resetPage: true });
  };

  // -----------------------------
  // helpers: update URL params safely
  // -----------------------------
  const setParams = (patch, { resetPage = false } = {}) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") next.delete(k);
      else next.set(k, String(v));
    });

    if (resetPage) next.set("page", "1");

    setSearchParams(next, { replace: true });
  };

  // --- Featured sorting helpers (REPLACE YOUR CURRENT ONES) ---
  const isBundleProduct = (p) =>
    String(p?.type || "").toUpperCase() === "BUNDLE";

  const hasLiveOffer = (p) =>
    p?.timedOffer?.uiStatus === "LIVE" ||
    p?.timedOffer?.effectiveActive === true;

  const getGroup = (p) => {
    const bundle = isBundleProduct(p);
    const offer = hasLiveOffer(p);

    // 0: bundle + offer
    // 1: offer (normal)
    // 2: bundle (no offer)
    // 3: normal
    if (bundle && offer) return 0;
    if (!bundle && offer) return 1;
    if (bundle && !offer) return 2;
    return 3;
  };

  const toTime = (d) => {
    const t = new Date(d || 0).getTime();
    return Number.isFinite(t) ? t : 0;
  };

  const sortFeatured = (arr = []) => {
    return [...arr].sort((a, b) => {
      const ga = getGroup(a);
      const gb = getGroup(b);
      if (ga !== gb) return ga - gb;

      // within same group: newest first
      const ta = toTime(a?.createdAt);
      const tb = toTime(b?.createdAt);
      if (ta !== tb) return tb - ta;

      // final fallback: stable by id
      return String(a?._id || "").localeCompare(String(b?._id || ""));
    });
  };

  //const sp = searchParams.toString();

  // -----------------------------
  // Wishlist toggle
  // -----------------------------
  const handleToggleWishlist = async (productId) => {
    if (!productId) return;

    if (!user) {
      toast.info("Please login to use wishlist");
      navigate("/login", {
        state: { from: location.pathname + location.search },
      });
      return;
    }

    try {
      await toggleWishlist(productId);
    } catch {
      toast.error("Wishlist update failed");
    }
  };

  // -----------------------------
  // Fetch products + categories whenever URL changes (truth)
  // -----------------------------
  useEffect(() => {
    //if (!sp) return;

    let alive = true;

    (async () => {
      setErr("");
      setLoading(true);
      try {
        const qs = {
          page: urlPage,
          limit: urlLimit,
          search: urlSearch || undefined,
          category: urlCategories.length ? urlCategories.join(",") : undefined,
          brand: urlBrands.length ? urlBrands.join(",") : undefined,
          tags: urlTags.length ? urlTags.join(",") : undefined,
          tagMode: urlTags.length ? urlTagMode : undefined,
          availability: urlAvailability || undefined,
          sort: urlSort || undefined,
          hasOffer: urlHasOffer || undefined,
          minPrice: urlMinPrice,
          maxPrice: urlMaxPrice,
        };
        console.log("PRODUCTS QS =>", qs);

        const res = await listProducts(qs);

        const products = res.data?.products || [];
        console.log(
          products.map((p) => ({
            title: p.title,
            type: p.type,
            timed: p?.timed,
            timedOffer: p?.timedOffer?.effectiveActive,
          })),
        );

        if (!alive) return;

        setItems(products);
        setMeta(
          res.data?.meta || {
            total: products.length,
            page: urlPage,
            limit: urlLimit,
            pages: 1,
            hasPrev: urlPage > 1,
            hasNext: false,
          },
        );
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || "Failed to load products");
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [
    // sp,
    urlPage,
    urlLimit,
    urlSearch,
    urlCategories,
    urlBrands,
    urlTags,
    urlTagMode,
    urlAvailability,
    urlSort,
    urlHasOffer,
    urlMinPrice,
    urlMaxPrice,
  ]);

  useEffect(() => {
    if (!hasLiveTimedOffer) return;

    const id = setInterval(async () => {
      try {
        const qs = {
          page: urlPage,
          limit: urlLimit,
          search: urlSearch || undefined,
          category: urlCategories.length ? urlCategories.join(",") : undefined,
          tags: urlTags.length ? urlTags.join(",") : undefined,
          tagMode: urlTags.length ? urlTagMode : undefined,
          hasOffer: urlHasOffer || undefined,
          brand: urlBrands.length ? urlBrands.join(",") : undefined,
          availability: urlAvailability || undefined,
          sort: urlSort || undefined,
          minPrice: urlMinPrice,
          maxPrice: urlMaxPrice,
        };

        const res = await listProducts(qs);
        const products = res.data?.products || [];
        setItems(urlSort ? products : sortFeatured(products));
        setMeta(res.data?.meta || meta);
      } catch {}
    }, 60000);

    return () => clearInterval(id);
  }, [
    hasLiveTimedOffer,
    urlPage,
    urlLimit,
    urlSearch,
    urlCategories,
    urlBrands,
    urlTags,
    urlTagMode,
    urlHasOffer,
    urlAvailability,
    urlSort,
    urlMinPrice,
    urlMaxPrice,
  ]);

  // -----------------------------
  // Handle mobile filter body scroll lock
  // -----------------------------
  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [mobileFiltersOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileFiltersOpen(false);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const pagesArray = useMemo(() => {
    const totalPages = meta.pages || 1;
    const current = meta.page || urlPage;

    const maxBtns = 7;
    let start = Math.max(1, current - Math.floor(maxBtns / 2));
    let end = start + maxBtns - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxBtns + 1);
    }

    const arr = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [meta.pages, meta.page, urlPage]);

  const activeCategoryName = useMemo(() => {
    if (!urlCategories.length) return "All Products";

    return urlCategories
      .map((slug) => cats.find((c) => c.slug === slug)?.name || slug)
      .join(", ");
  }, [urlCategories, cats]);

  const muiSliderSx = {
    color: "#6366f1",
    "& .MuiSlider-rail": {
      opacity: 1,
      backgroundColor: "rgba(148,163,184,0.15)",
      height: 6,
      borderRadius: 999,
    },
    "& .MuiSlider-track": {
      height: 6,
      borderRadius: 999,
      backgroundImage: "linear-gradient(90deg, #6366f1, #a78bfa)",
    },
    "& .MuiSlider-thumb": {
      width: 18,
      height: 18,
      backgroundColor: "#0b1220",
      border: "2px solid #6366f1",
      boxShadow: "0 10px 30px rgba(99,102,241,0.25)",
      "&:hover, &.Mui-focusVisible": {
        boxShadow: "0 10px 30px rgba(99,102,241,0.35)",
      },
      "&:before": { boxShadow: "none" },
    },
    "& .MuiSlider-mark": {
      width: 6,
      height: 6,
      borderRadius: 999,
      backgroundColor: "rgba(148,163,184,0.35)",
    },
    "& .MuiSlider-markActive": {
      backgroundColor: "rgba(99,102,241,0.9)",
    },
    "& .MuiSlider-markLabel": {
      color: "rgba(148,163,184,0.75)",
      fontSize: 10,
      fontWeight: 800,
      marginTop: 8,
    },
    "& .MuiSlider-valueLabel": {
      backgroundColor: "#0f172a",
      border: "1px solid rgba(148,163,184,0.18)",
      borderRadius: 10,
      padding: "4px 8px",
      fontWeight: 800,
      fontSize: 11,
    },
  };

  const resetAll = () => {
    setPriceRangeUI([PRICE_MIN, PRICE_MAX]);
    setMobileFiltersOpen(false);

    const next = new URLSearchParams();
    const s = searchParams.get("search");
    if (s) next.set("search", s);

    setSearchParams(next, { replace: true });
  };

  const Sidebar = (
    <div className="space-y-8 lg:sticky lg:top-24">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Sort
          </label>
          <select
            value={urlSort}
            onChange={(e) =>
              setParams({ sort: e.target.value }, { resetPage: true })
            }
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
          >
            <option value="">Featured</option>
            <option value="newest">Newest</option>
            <option value="best-selling">Best Selling</option>
            <option value="price-asc">Price: Low</option>
            <option value="price-desc">Price: High</option>
            <option value="discount-desc">Discount: High</option>
          </select>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Show
          </label>
          <select
            value={urlLimit}
            onChange={(e) =>
              setParams({ limit: Number(e.target.value) }, { resetPage: true })
            }
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
          >
            <option value={12}>12 items</option>
            <option value={24}>24 items</option>
            <option value={48}>48 items</option>
          </select>
        </div>
      </div>

      {/* Availability */}
      <div className="space-y-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Availability
        </label>

        <div className="space-y-2">
          {[
            { key: "in", label: "In Stock" },
            { key: "out", label: "Out of Stock" },
          ].map((opt) => {
            const checked = urlAvailability === opt.key;
            return (
              <label
                key={opt.key}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="relative flex items-center">
                  <input
                    type="radio"
                    name="availability"
                    onChange={() =>
                      setParams(
                        { availability: checked ? "" : opt.key },
                        { resetPage: true },
                      )
                    }
                    className="peer appearance-none w-5 h-5 bg-slate-900 border border-slate-800 rounded-md checked:bg-indigo-600 checked:border-indigo-600 transition-all"
                  />
                  <svg
                    className="absolute w-3.5 h-3.5 text-white left-1/2 -translate-x-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span
                  className={`text-sm font-medium transition-colors ${
                    checked
                      ? "text-indigo-400"
                      : "text-slate-400 group-hover:text-slate-200"
                  }`}
                >
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Timed Offer */}
      {hasLiveTimedOffer && (
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Offer
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={urlHasOffer === "true"}
                onChange={(e) =>
                  setParams(
                    { hasOffer: e.target.checked ? "true" : "" },
                    { resetPage: true },
                  )
                }
                className="peer appearance-none w-5 h-5 bg-slate-900 border border-slate-800 rounded-md checked:bg-indigo-600 checked:border-indigo-600 transition-all"
              />
              <svg
                className="absolute w-3.5 h-3.5 text-white left-1/2 -translate-x-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <span
              className={`text-sm font-medium transition-colors ${
                urlHasOffer === "true"
                  ? "text-indigo-400"
                  : "text-slate-400 group-hover:text-slate-200"
              }`}
            >
              Has active timed offer
            </span>
          </label>
        </div>
      )}

      {/* Category */}
      {/* Category */}
      <div className="space-y-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Category
        </label>

        <div className="flex flex-wrap gap-2">
          {/* ✅ E) All button (clears category param completely) */}
          <button
            type="button"
            onClick={() => setParams({ category: "" }, { resetPage: true })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              urlCategories.length === 0
                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            All
          </button>

          {cats.map((c) => {
            const slug = String(c?.slug || "").trim();
            if (!slug) return null;

            const active = urlCategories.includes(slug);

            return (
              <button
                key={slug}
                type="button"
                onClick={() => toggleCategory(slug)} // ✅ multi-select toggle
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  active
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Brand */}
      <div className="space-y-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Brand
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setParams({ brand: "" }, { resetPage: true })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              urlBrands.length === 0
                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            All
          </button>

          {brands.map((b) => {
            const slug = String(b?.slug || "").trim();
            if (!slug) return null;

            const active = urlBrands.includes(slug);

            return (
              <button
                key={slug}
                type="button"
                onClick={() => toggleBrand(slug)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  active
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                {b.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Price Range
          </label>
          <span className="text-xs font-bold text-indigo-400">
            {formatINR(priceRangeUI[0])} — {formatINR(priceRangeUI[1])}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur-sm space-y-3">
          <Slider
            value={priceRangeUI}
            onChange={(e, newVal) => setPriceRangeUI(newVal)}
            onChangeCommitted={(e, newVal) =>
              setParams(
                { minPrice: newVal[0], maxPrice: newVal[1] },
                { resetPage: true },
              )
            }
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            marks={PRICE_MARKS}
            disableSwap
            valueLabelDisplay="auto"
            valueLabelFormat={formatINR}
            sx={muiSliderSx}
          />

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setParams(
                  { minPrice: PRICE_MIN, maxPrice: PRICE_MAX },
                  { resetPage: true },
                )
              }
              className="text-[11px] font-bold text-slate-500 hover:text-indigo-400 transition-colors uppercase tracking-widest"
            >
              Clear Price
            </button>

            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Step:{" "}
              <span className="text-slate-300">{formatINR(PRICE_STEP)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={resetAll}
        className="w-full py-3 text-xs font-bold text-slate-500 hover:text-indigo-400 transition-colors uppercase tracking-widest border border-dashed border-slate-800 rounded-xl hover:border-indigo-500/30"
      >
        Clear Filters
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 pb-20 selection:bg-indigo-500/30">
      {mobileFiltersOpen && (
        <div className="lg:hidden fixed inset-0 z-[9999]">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileFiltersOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close filters"
          />

          {/* panel */}
          <div
            className="absolute right-0 bottom-0 w-[92%] max-w-sm bg-slate-950 border-l border-slate-800 shadow-2xl"
            style={{
              top: `calc(${navH}px + env(safe-area-inset-top, 0px))`,
            }}
          >
            <div className="h-full overflow-y-auto overscroll-contain">
              {/* sticky header */}
              <div className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-white font-black tracking-tight text-lg">
                    Filters
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(false)}
                    className="p-2 rounded-xl border border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500/50 transition-all"
                    aria-label="Close filters"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 6l12 12M6 18L18 6"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* content */}
              <div className="px-5 py-5 pb-8">{Sidebar}</div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-10">
        <header className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <nav className="flex gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                <Link
                  to="/"
                  onClick={() =>
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }
                  className="hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  Home
                </Link>
                <span>/</span>
                <span className="text-slate-300">{activeCategoryName}</span>
              </nav>

              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                Hardware <span className="text-indigo-500">Archive</span>
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen((v) => !v)}
                  className="lg:hidden px-4 py-2 rounded-xl border border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500/50 transition-all active:scale-95"
                >
                  {mobileFiltersOpen ? "Close Filters" : "Open Filters"}
                </button>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500/50 transition-all active:scale-95"
                >
                  Refresh
                </button>

                <span className="text-xs font-bold text-slate-500">
                  Sort:{" "}
                  <span className="text-slate-200">
                    {SortLabel[urlSort] || urlSort}
                  </span>
                </span>
              </div>
            </div>

            <p className="text-slate-400 font-medium max-w-md">
              {loading ? (
                "Loading products..."
              ) : (
                <>
                  Showing{" "}
                  <span className="text-white font-bold">{items.length}</span>{" "}
                  of <span className="text-white font-bold">{meta.total}</span>{" "}
                  • Page{" "}
                  <span className="text-white font-bold">{meta.page}</span>/
                  <span className="text-white font-bold">{meta.pages}</span>
                </>
              )}
            </p>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-10">
          <aside className="hidden lg:block w-full lg:w-80 shrink-0">
            {Sidebar}
          </aside>

          <section className="flex-grow flex flex-col">
            {err && (
              <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">
                {err}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden backdrop-blur-sm"
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
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-slate-400">
                No products found.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                  {items.map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      isWishlisted={isWishlisted(product._id)}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  ))}
                </div>

                {meta.pages > 1 && (
                  <div className="mt-16 flex items-center justify-center gap-4">
                    <button
                      onClick={() =>
                        setParams({ page: Math.max(1, urlPage - 1) })
                      }
                      disabled={!meta.hasPrev}
                      className="p-3 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:border-indigo-500/50 disabled:opacity-30 disabled:hover:border-slate-800 transition-all active:scale-95"
                      aria-label="Previous page"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>

                    <div className="flex gap-2 flex-wrap justify-center">
                      {pagesArray.map((n) => (
                        <button
                          key={n}
                          onClick={() => setParams({ page: n })}
                          className={`w-11 h-11 rounded-xl text-sm font-bold transition-all ${
                            n === meta.page
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                              : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setParams({ page: urlPage + 1 })}
                      disabled={!meta.hasNext}
                      className="p-3 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:border-indigo-500/50 disabled:opacity-30 disabled:hover:border-slate-800 transition-all active:scale-95"
                      aria-label="Next page"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
