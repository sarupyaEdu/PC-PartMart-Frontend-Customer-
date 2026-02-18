import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { listProducts } from "../api/products";
import { listCategories } from "../api/categories";
import { listBrands } from "../api/brands";
import CaseIcon from "../assets/pc-case.png";
import arrowLeft from "../assets/left-arrow.png";
import arrowRight from "../assets/right-arrow.png";
import ProductCard from "../components/ProductCard";
import AdCarousel from "../components/AdCarousel";

import {
  Cpu,
  HardDrive,
  Layout,
  Monitor,
  MousePointer2,
  Truck,
  Shield,
  Zap,
  Gpu,
  Keyboard,
  Fan,
} from "lucide-react";

// You can keep these static (like the ZIP) or later make them dynamic
const HERO_ITEMS = [
  {
    id: "h1",
    title: "Next Gen performance is here",
    subtitle: "Shop the latest GPUs and CPUs for your dream build.",
    image:
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&q=80&w=1600",
    cta: "Explore GPUs",
    color: "from-blue-600/20 to-purple-600/20",
    to: "/products?category=gpu,cpu,bundles&tags=gpu,cpu&tagMode=any",
  },
  {
    id: "h2",
    title: "Elite Gaming Gear",
    subtitle: "Precision peripherals designed for champions.",
    image:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1600",
    cta: "Shop Now",
    color: "from-red-600/20 to-orange-600/20",
    to: "/products?category=mouse,keyboards",
  },
];

const SIDE_HERO_1 = [
  {
    id: "sh1-1",
    title: "Storage Upgrade",
    subtitle: "Fast NVMe SSDs. Big performance boost.",
    image:
      "https://www.cervoz.com/uploads/photos/shares/Press%20Center/News/2023_News/0712_M.2%202242%20PCIe%20Gen3x2%20SSD/M.2%202242%20PCIe%20Gen3x2_1.png",
    cta: "Get Fast",
    color: "from-blue-900/40 to-black/80",
    to: "/products?category=ssd",
  },
  {
    id: "sh1-2",
    title: "High-speed Memory",
    subtitle: "DDR4/DDR5 kits for gaming + productivity.",
    image:
      "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&q=80&w=800",
    cta: "Browse RAM",
    color: "from-purple-900/40 to-black/80",
    to: "/products?category=ram",
  },
];

const SIDE_HERO_2 = [
  {
    id: "sh2-1",
    title: "Clean Cable Builds",
    subtitle: "Premium cables for the cleanest setups.",
    image:
      "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=800",
    cta: "Browse Styles",
    color: "from-emerald-900/40 to-black/80",
    to: "/products?category=psu-cables",
  },
  {
    id: "sh2-2",
    title: "Arctic Cooling",
    subtitle: "Air + AIO coolers for peak performance.",
    image:
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&q=80&w=800",
    cta: "Chill Out",
    color: "from-cyan-900/40 to-black/80",
    to: "/products?category=cpu-cooler",
  },
];

const COMPONENT_PROMOS = [
  {
    id: "cp1",
    title: "CPU + GPU Deals",
    subtitle: "Save more on high-performance parts.",
    image:
      "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=800",
    cta: "View Offers",
    color: "from-red-600/40 to-black/60",
    to: "/products?sort=discount-desc",
  },
];

const PERIPHERAL_PROMOS = [
  {
    id: "pp1",
    title: "Mechanical Keyboards",
    subtitle: "Find your perfect switch and feel.",
    image:
      "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&q=80&w=800",
    cta: "Customize",
    color: "from-purple-600/40 to-black/60",
    to: "/products?category=keyboards",
  },
];

// icon helper for your categories (best-effort)
const pickIcon = (name = "") => {
  const n = String(name).toLowerCase();

  // ✅ 1) more specific first
  if (
    n.includes("cpu-cooler") ||
    n.includes("cpu cooler") ||
    n.includes("cooler")
  )
    return <Fan className="w-8 h-8" />;

  // ✅ 2) then cpu
  if (n.includes("cpu") || n.includes("processor"))
    return <Cpu className="w-8 h-8" />;

  if (n.includes("gpu") || n.includes("graphic"))
    return <Gpu className="w-8 h-8" />;

  if (n.includes("ram") || n.includes("memory"))
    return <HardDrive className="w-8 h-8" />;

  if (n.includes("ssd") || n.includes("storage") || n.includes("hdd"))
    return <HardDrive className="w-8 h-8" />;

  if (n.includes("monitor") || n.includes("display"))
    return <Monitor className="w-8 h-8" />;

  if (n.includes("keyboard") || n.includes("keyboards"))
    return <Keyboard className="w-8 h-8" />;

  if (n.includes("case") || n.includes("cabinet"))
    return (
      <img src={CaseIcon} alt="Cabinet" className="w-8 h-8 object-contain" />
    );

  return <MousePointer2 className="w-8 h-8" />;
};

// const isObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(v);
function TopLoadingBar({ show }) {
  if (!show) return null;

  return (
    <div className="sticky top-[var(--nav-h)] z-50">
      <div className="h-[3px] w-full bg-transparent overflow-hidden">
        <div className="h-full w-[40%] animate-[homebar_1.1s_infinite] bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
      </div>

      <style>
        {`
          @keyframes homebar {
            0% { transform: translateX(-120%); }
            100% { transform: translateX(280%); }
          }
        `}
      </style>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden">
      <div className="h-40 bg-gray-800/60 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 bg-gray-800/60 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-gray-800/60 rounded animate-pulse" />
        <div className="h-9 w-full bg-gray-800/60 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

function SkeletonCategoryTile() {
  return (
    <div className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800">
      <div className="mx-auto mb-3 h-10 w-10 rounded-xl bg-gray-800/60 animate-pulse" />
      <div className="mx-auto h-3 w-20 rounded bg-gray-800/60 animate-pulse" />
    </div>
  );
}

function SkeletonBrandTile() {
  return (
    <div className="w-[160px] shrink-0 p-6 rounded-2xl bg-gray-900/40 border border-gray-800">
      <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-gray-800/60 animate-pulse" />
      <div className="mx-auto h-3 w-24 rounded bg-gray-800/60 animate-pulse" />
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();

  const { user } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const location = useLocation();

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

  const [topDeals, setTopDeals] = useState([]);
  const [loadingDeals, setLoadingDeals] = useState(true);

  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);

  const [allCategories, setAllCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [bestSelling, setBestSelling] = useState([]);
  const [loadingBest, setLoadingBest] = useState(true);

  const [newArrivals, setNewArrivals] = useState([]);
  const [loadingNew, setLoadingNew] = useState(true);
  const anyLoading =
    loadingCats || loadingBrands || loadingDeals || loadingBest || loadingNew;

  const brandRowRef = useRef(null);
  const autoScrollRef = useRef(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const RESUME_AFTER_MS = 5000;

  const resumeTimerRef = useRef(null);

  const stopAutoScrollTemporarily = () => {
    // stop now
    setAutoScrollEnabled(false);

    // reset previous resume timer
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);

    // resume after 10s if no further interaction
    resumeTimerRef.current = setTimeout(() => {
      setAutoScrollEnabled(true);
    }, RESUME_AFTER_MS);
  };

  const scrollBrands = (dir = 1) => {
    const el = brandRowRef.current;
    if (!el) return;

    stopAutoScrollTemporarily(); // ✅ stop + schedule resume

    const scrollAmount = el.clientWidth * 0.9;
    el.scrollBy({
      left: dir * scrollAmount,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoadingCats(true);
      setLoadingDeals(true);
      setLoadingBest(true);
      setLoadingNew(true);

      try {
        const [catRes, brandRes, dealRes, bestRes, newRes] = await Promise.all([
          listCategories(),
          listBrands({ page: 1, limit: 12, status: "active" }),

          // Most discounted
          listProducts({ page: 1, limit: 12, sort: "discount-desc" }),

          // ✅ Best Selling (matches Products page)
          listProducts({ page: 1, limit: 8, sort: "best-selling" }),

          // ✅ New Arrivals (matches Products page)
          listProducts({ page: 1, limit: 8, sort: "newest" }),
        ]);

        if (!alive) return;

        // ---- categories ----
        const cats = catRes?.data?.categories || catRes?.data || [];
        const brs = brandRes?.data?.brands || [];
        setBrands(
          Array.isArray(brs) ? brs.filter((b) => b?.isActive !== false) : [],
        );
        setAllCategories(Array.isArray(cats) ? cats : []);
        setCategories(Array.isArray(cats) ? cats.slice(0, 6) : []);

        // ---- deals ----
        const products = dealRes?.data?.products || [];
        const onlyDiscounted = products.filter((p) => {
          const price = Number(p?.price || 0);
          const dp = Number(p?.discountPrice || 0);
          return price > 0 && dp > 0 && dp < price;
        });
        // ---- best selling ----
        setBestSelling((bestRes?.data?.products || []).slice(0, 4));

        // ---- new arrivals ----
        setNewArrivals((newRes?.data?.products || []).slice(0, 4));

        setTopDeals(onlyDiscounted.slice(0, 4));
      } catch {
        if (alive) {
          setAllCategories([]);
          setCategories([]);
          setBrands([]);
          setTopDeals([]);
          setBestSelling([]);
          setNewArrivals([]);
        }
      } finally {
        if (alive) {
          setLoadingCats(false);
          setLoadingBrands(false);
          setLoadingDeals(false);
          setLoadingBest(false);
          setLoadingNew(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!autoScrollEnabled) return;

    const el = brandRowRef.current;
    if (!el) return;

    // wait until brands are rendered
    if (!brands?.length) return;

    // wait until it can actually scroll (overflow exists)
    const canScroll = el.scrollWidth > el.clientWidth + 5;
    if (!canScroll) return;

    // clear any existing interval (important in React StrictMode)
    if (autoScrollRef.current) clearInterval(autoScrollRef.current);

    autoScrollRef.current = setInterval(() => {
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 5;

      if (atEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: el.clientWidth * 0.6, behavior: "smooth" });
      }
    }, 2500);

    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [autoScrollEnabled, brands.length]); // ✅ key change

  useEffect(() => {
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  const catIdBySlugOrName = useMemo(() => {
    const m = new Map();
    (allCategories || []).forEach((c) => {
      if (c.slug) m.set(String(c.slug).toLowerCase(), c._id);
      if (c.name) m.set(String(c.name).toLowerCase(), c._id);
    });
    return m;
  }, [allCategories]);

  // const resolveCategoryId = (raw) => {
  //   if (!raw) return "";

  //   const key = String(raw).trim().toLowerCase();

  //   // already an ObjectId
  //   if (isObjectId(key)) return key;

  //   // exact match via slug or name map
  //   const direct = catIdBySlugOrName.get(key);
  //   if (direct) return direct;

  //   // fallback: partial match (gpu -> "Graphics Card", etc.)
  //   const hit = (allCategories || []).find((c) => {
  //     const s = String(c?.slug || "").toLowerCase();
  //     const n = String(c?.name || "").toLowerCase();
  //     return (
  //       s.includes(key) || n.includes(key) || key.includes(s) || key.includes(n)
  //     );
  //   });

  //   return hit?._id || "";
  // };

  const onCarouselCta = (item) => {
    if (!item?.to) return;

    try {
      const url = new URL(item.to, window.location.origin);

      // ✅ keep only the params that already exist in item.to (category/ sort etc.)
      navigate(url.pathname + url.search);
    } catch {
      navigate(item.to);
    }
  };

  const catCards = useMemo(() => categories || [], [categories]);

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      <TopLoadingBar show={anyLoading} />

      <main
        className={`flex-grow transition ${anyLoading ? "opacity-90" : "opacity-100"}`}
      >
        {/* HERO SECTION - Split Grid (1 Big, 2 Small) */}
        <section className="max-w-[1920px] mx-auto">
          <div
            className="
  grid grid-cols-1 lg:grid-cols-12
  gap-6 md:gap-4
  px-4 md:p-4
  h-auto lg:h-[600px]
"
          >
            <div
              className="
  lg:col-span-8
  h-[400px] md:h-[500px] lg:h-full
  mt-6 md:mt-0
"
            >
              <AdCarousel
                items={HERO_ITEMS}
                heightClass="h-full"
                autoPlayInterval={6500}
                onCtaClick={onCarouselCta}
              />
            </div>

            <div className="lg:col-span-4 flex flex-col gap-4 h-auto lg:h-full px-4 md:px-0 pb-4 md:pb-0">
              <div className="flex-1 min-h-[200px] md:min-h-[240px] lg:h-auto">
                <AdCarousel
                  items={SIDE_HERO_1}
                  heightClass="h-full"
                  autoPlayInterval={5000}
                  smallText
                  onCtaClick={onCarouselCta}
                />
              </div>
              <div className="flex-1 min-h-[200px] md:min-h-[240px] lg:h-auto">
                <AdCarousel
                  items={SIDE_HERO_2}
                  heightClass="h-full"
                  autoPlayInterval={8000}
                  smallText
                  onCtaClick={onCarouselCta}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-12 border-b border-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Shop by Category</h2>
              <Link
                to="/products"
                className="text-sm text-blue-400 hover:underline"
              >
                View all
              </Link>
            </div>

            {loadingCats ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCategoryTile key={i} />
                ))}
              </div>
            ) : catCards.length === 0 ? (
              <div className="text-gray-400">No categories found.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {catCards.map((cat) => (
                  <Link
                    key={cat.slug || cat._id}
                    to={`/products?category=${encodeURIComponent(cat.slug)}`}
                    className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gray-900/40 border border-gray-800 hover:border-blue-500 hover:bg-gray-900 transition-all group"
                  >
                    <div className="mb-3 text-gray-500 group-hover:text-blue-500 transition-colors">
                      {pickIcon(cat?.name)}
                    </div>
                    <span className="text-xs font-bold tracking-wide uppercase text-center">
                      {cat?.name}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="py-12 border-b border-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Shop by Brands</h2>

              <Link
                to="/products"
                className="text-sm text-blue-400 hover:underline"
              >
                View all
              </Link>
            </div>

            {loadingBrands ? (
              <div className="relative">
                <div className="overflow-x-auto py-4 px-2 [scrollbar-width:none] [-ms-overflow-style:none]">
                  <div className="flex gap-4 w-max">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <SkeletonBrandTile key={i} />
                    ))}
                  </div>
                </div>
              </div>
            ) : brands.length === 0 ? (
              <div className="text-gray-400">No brands found.</div>
            ) : (
              <div className="relative ">
                {/* LEFT ARROW */}
                <button
                  type="button"
                  onClick={() => scrollBrands(-1)}
                  className="absolute left-0 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20
      h-11 w-11 rounded-full grid place-items-center
      bg-black/60 border border-gray-800 text-white
      hover:bg-blue-600 transition-all hidden md:grid"
                  aria-label="Scroll left"
                >
                  <img
                    src={arrowLeft}
                    alt="Scroll left"
                    className="h-5 w-5 object-contain"
                  />
                </button>

                {/* RIGHT ARROW */}
                <button
                  type="button"
                  onClick={() => scrollBrands(1)}
                  className="absolute right-0 translate-x-1/2 top-1/2 -translate-y-1/2 z-20
      h-11 w-11 rounded-full grid place-items-center
      bg-black/60 border border-gray-800 text-white
      hover:bg-blue-600 transition-all hidden md:grid"
                  aria-label="Scroll right"
                >
                  <img
                    src={arrowRight}
                    alt="Scroll right"
                    className="h-5 w-5 object-contain"
                  />
                </button>

                {/* ✅ THIS is the scroll container */}
                <div
                  ref={brandRowRef}
                  onMouseEnter={() => {
                    setAutoScrollEnabled(false);
                    if (resumeTimerRef.current)
                      clearTimeout(resumeTimerRef.current);
                  }}
                  onMouseLeave={stopAutoScrollTemporarily}
                  onMouseDown={stopAutoScrollTemporarily}
                  onTouchStart={stopAutoScrollTemporarily}
                  onWheel={stopAutoScrollTemporarily}
                  className="
    overflow-x-auto overflow-y-visible
    scroll-smooth py-4 px-2
    [scrollbar-width:none] [-ms-overflow-style:none]
  "
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {/* hide scrollbar (webkit) */}
                  <style>{`div::-webkit-scrollbar{display:none;}`}</style>

                  {/* row */}
                  <div className="flex gap-4 w-max">
                    {brands.slice(0, 12).map((b) => (
                      <Link
                        key={b.slug || b._id}
                        to={`/products?brand=${encodeURIComponent(b.slug)}`}
                        className="
            group
            w-[160px] shrink-0
            flex flex-col items-center justify-center
            p-6 rounded-2xl
            bg-gray-900/40 border border-gray-800
            hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10
            hover:border-blue-500 hover:bg-gray-900
            transition-all
          "
                      >
                        {/* logo */}
                        <div
                          className="
              mb-4 h-20 w-20 rounded-2xl
              bg-white border border-gray-800
              grid place-items-center overflow-hidden
              transition-transform duration-200
              group-hover:scale-110
            "
                        >
                          {b?.logo?.url ? (
                            <img
                              src={b.logo.url}
                              alt={b.name}
                              className="h-full w-full object-contain p-2"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-xs font-black text-gray-500">
                              {String(b?.name || "B")[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-bold tracking-wide uppercase text-center">
                          {b?.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* LOWER PROMO SECTION */}
        <section className="py-12 bg-gray-950/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[320px]">
              <AdCarousel
                items={COMPONENT_PROMOS}
                heightClass="h-[280px] md:h-[320px]"
                autoPlayInterval={5500}
                smallText
                onCtaClick={onCarouselCta}
              />
              <AdCarousel
                items={PERIPHERAL_PROMOS}
                heightClass="h-[280px] md:h-[320px]"
                autoPlayInterval={7200}
                smallText
                onCtaClick={onCarouselCta}
              />
            </div>
          </div>
        </section>

        {/* Most Discounted Products (your API) */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                  Most Discounted
                </h2>
                <div className="h-1 w-20 bg-blue-600 rounded-full" />
              </div>

              <Link
                to="/products?sort=discount-desc"
                className="text-blue-400 font-bold hover:underline"
              >
                View All Products
              </Link>
            </div>

            {loadingDeals ? (
              <div className="grid grid-cols-1 min-[588px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : topDeals.length === 0 ? (
              <div className="text-gray-400">No discounted products found.</div>
            ) : (
              <div className="grid grid-cols-1 min-[588px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {topDeals.slice(0, 4).map((product, idx) => (
                  <div
                    key={product._id}
                    className={idx === 3 ? "lg:hidden xl:block" : ""}
                  >
                    <ProductCard
                      product={product}
                      isWishlisted={isWishlisted(product._id)}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        {/* Best Selling */}
        <section className="py-20 border-t border-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                  Best Selling
                </h2>
                <div className="h-1 w-20 bg-blue-600 rounded-full" />
              </div>

              <Link
                to="/products?sort=best-selling"
                className="text-blue-400 font-bold hover:underline"
              >
                View All
              </Link>
            </div>

            {loadingBest ? (
              <div className="grid grid-cols-1 min-[588px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : bestSelling.length === 0 ? (
              <div className="text-gray-400">
                No best selling products found.
              </div>
            ) : (
              <div className="grid grid-cols-1 min-[588px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {bestSelling.slice(0, 4).map((product, idx) => (
                  <div
                    key={product._id}
                    className={idx === 3 ? "lg:hidden xl:block" : ""}
                  >
                    <ProductCard
                      product={product}
                      isWishlisted={isWishlisted(product._id)}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* New Arrivals */}
        <section className="py-20 border-t border-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                  New Arrivals
                </h2>
                <div className="h-1 w-20 bg-blue-600 rounded-full" />
              </div>

              <Link
                to="/products?sort=newest"
                className="text-blue-400 font-bold hover:underline"
              >
                View All
              </Link>
            </div>

            {loadingNew ? (
              <div className="grid grid-cols-1 min-[588px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : newArrivals.length === 0 ? (
              <div className="text-gray-400">No new arrivals found.</div>
            ) : (
              <div className="grid grid-cols-1 min-[588px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {newArrivals.slice(0, 4).map((product, idx) => (
                  <div
                    key={product._id}
                    className={idx === 3 ? "lg:hidden xl:block" : ""}
                  >
                    <ProductCard
                      product={product}
                      isWishlisted={isWishlisted(product._id)}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Trust Factors */}
        <section className="py-20 border-t border-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="flex items-start gap-4">
                <div className="p-4 bg-blue-600/10 rounded-2xl">
                  <Truck className="w-8 h-8 text-blue-500" />
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-2">Fast Delivery</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Quick shipping with safe packaging for all components.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-4 bg-blue-600/10 rounded-2xl">
                  <Shield className="w-8 h-8 text-blue-500" />
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-2">Genuine Parts</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Authentic products with warranty and verified sourcing.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-4 bg-blue-600/10 rounded-2xl">
                  <Zap className="w-8 h-8 text-blue-500" />
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-2">Build Support</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Help choosing compatible parts and building your PC.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter */}
        {/* <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-600/5 -z-10" />
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-black mb-4 uppercase">
              Join the Elite
            </h2>
            <p className="text-gray-400 mb-8">
              Get restock alerts, deal drops, and member-only offers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-grow bg-gray-900 border border-gray-800 rounded-xl px-6 py-4 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
              />
              <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </section> */}
      </main>
    </div>
  );
}
