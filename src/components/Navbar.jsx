import { Link, NavLink, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useWishlist } from "../context/WishlistContext";
import { listCategories } from "../api/categories";
import BrandLogo from "../assets/brand-logo.png";
import { listProducts } from "../api/products";

const navItem = ({ isActive }) =>
  `hidden md:block text-sm font-bold transition-colors ${
    isActive ? "text-white" : "text-slate-400 hover:text-white"
  }`;

function useOutsideClick(handler) {
  const ref = useRef(null);

  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [handler]);

  return ref;
}

function useOutsideClickMany(handler) {
  const refs = useRef([]);

  useEffect(() => {
    const listener = (e) => {
      const clickedInside = refs.current.some(
        (el) => el && el.contains(e.target),
      );
      if (clickedInside) return;
      handler();
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [handler]);

  // callback-ref you can attach to multiple elements
  const register = useCallback((el) => {
    if (!el) return;
    if (!refs.current.includes(el)) refs.current.push(el);
  }, []);

  return register;
}

function Portal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Navbar() {
  const { cart } = useCart();
  const { user, logout } = useAuth();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();

  const cartCount = useMemo(
    () => cart.reduce((sum, x) => sum + Number(x.qty || 0), 0),
    [cart],
  );

  // User dropdown
  const [open, setOpen] = useState(false);
  const dropdownRef = useOutsideClick(() => setOpen(false));

  // Search
  const [q, setQ] = useState("");
  // ✅ Suggestions
  const [sugOpen, setSugOpen] = useState(false);
  const [sugs, setSugs] = useState([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const debouncedQ = useDebouncedValue(q, 250);

  // close suggestions on outside click
  const searchBoxRef = useOutsideClickMany(() => {
    setSugOpen(false);
    setActiveIdx(-1);
  });

  // fetch suggestions (top 8)
  useEffect(() => {
    const term = String(debouncedQ || "").trim();
    let alive = true;

    (async () => {
      if (term.length < 2) {
        setSugs([]);
        setSugOpen(false);
        setActiveIdx(-1);
        return;
      }

      setSugLoading(true);
      try {
        const res = await listProducts({
          page: 1,
          limit: 8,
          search: term,
          sort: "newest",
        });

        const arr = res?.data?.products || res?.products || [];
        const normalized = (Array.isArray(arr) ? arr : [])
          .filter((p) => (p?.isActive ?? true) === true)
          .map((p) => ({
            _id: p._id,
            title: p.title,
            slug: p.slug,
            price: p.price,
            discountPrice: p.discountPrice,
            image: p?.images?.[0]?.url || "",
          }));

        if (!alive) return;
        setSugs(normalized);
        setSugOpen(normalized.length > 0); // ✅ only open if results exist
        setActiveIdx(-1);
      } catch (e) {
        console.log("Search suggestions error:", e);
        if (!alive) return;
        setSugs([]);
        setSugOpen(false);
        setActiveIdx(-1);
      } finally {
        if (alive) setSugLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [debouncedQ]);

  const goSearch = (value) => {
    const v = String(value || "").trim();
    setSugOpen(false);
    setActiveIdx(-1);
    navigate(`/products${v ? `?search=${encodeURIComponent(v)}` : ""}`);
  };

  // ⚠️ adjust this route if your product details route is different
  const goProduct = (slug) => {
    if (!slug) return;
    setSugOpen(false);
    setActiveIdx(-1);
    setQ("");
    navigate(`/product/${encodeURIComponent(slug)}`);
  };

  const onSearchKeyDown = (e) => {
    if (!sugOpen) return;

    if (e.key === "Escape") {
      setSugOpen(false);
      setActiveIdx(-1);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const max = Math.max(0, (sugs?.length || 0) - 1);
      setActiveIdx((i) => Math.min(max, i + 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(-1, i - 1));
      return;
    }

    if (e.key === "Enter") {
      // if a suggestion is highlighted, go to product
      if (activeIdx >= 0 && sugs[activeIdx]?.slug) {
        e.preventDefault();
        goProduct(sugs[activeIdx].slug);
        return;
      }
      // else normal submit will run (your onSubmit)
    }
  };

  const onSearchSubmit = (e) => {
    e.preventDefault();
    goSearch(q);
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate("/");
  };

  // ✅ Categories dropdown (2nd row)
  const [cats, setCats] = useState([]);
  const [catOpen, setCatOpen] = useState(false);

  const closeCat = useCallback(() => setCatOpen(false), []);
  const catRef = useOutsideClick(closeCat);

  // ✅ Mobile hamburger menu
  const [mOpen, setMOpen] = useState(false);
  const closeMobile = useCallback(() => setMOpen(false), []);
  const mobileRef = useOutsideClick(closeMobile);

  useEffect(() => {
    (async () => {
      try {
        const res = await listCategories();

        const items =
          (Array.isArray(res) && res) ||
          res?.categories ||
          res?.data?.categories ||
          res?.data ||
          res?.data?.data?.categories ||
          res?.data?.data ||
          [];

        const normalized = (Array.isArray(items) ? items : [])
          .filter((c) => (c?.isActive ?? true) === true)
          .map((c) => ({
            _id: c._id,
            name: c.name,
            slug: c.slug || c._id,
          }))
          .sort((a, b) => String(a.name).localeCompare(String(b.name)));

        setCats(normalized);
      } catch (e) {
        console.log("Navbar listCategories error:", e);
        setCats([]);
      }
    })();
  }, []);

  const goCategory = (slug) => {
    setCatOpen(false);
    navigate(`/products?category=${encodeURIComponent(slug)}`);
  };

  const goBundles = () => {
    setCatOpen(false);
    navigate("/products?type=bundle&category=bundles"); // or "/bundles" if you have a separate route
  };

  // Close dropdowns on ESC
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      setCatOpen(false);
      setMOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, []);

  // ✅ exact-match helper for query links (so only the correct one becomes active)
  const linkExact = (to) => () => {
    const url = new URL(to, window.location.origin);
    const exact =
      window.location.pathname === url.pathname &&
      window.location.search === url.search;

    return `hidden md:block text-sm font-bold transition-colors ${
      exact ? "text-white" : "text-slate-400 hover:text-white"
    }`;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[9999] border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl md:sticky">
      <div className="mx-auto max-w-7xl px-4 py-4 md:px-8">
        {/* ROW 1 */}
        <div className="flex items-center gap-3">
          {/* LEFT: Brand + Home/Store */}
          <div className="flex items-center gap-6 shrink-0">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              {/* ✅ Brand logo */}
              <div className="h-9 w-9 rounded-lg overflow-hidden border border-slate-800 bg-slate-900/40">
                <img
                  src={BrandLogo}
                  alt="PC PartMart"
                  className="h-full w-full object-contain p-1"
                  draggable={false}
                  loading="lazy"
                />
              </div>

              <span className="text-xl font-black tracking-tighter text-white">
                PC<span className="text-indigo-500"> PartMart</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-4">
              {/* ✅ end makes Home exact only */}
              <NavLink to="/" end className={navItem}>
                Home
              </NavLink>

              {/* ✅ Store is path-only (/products) */}
              <NavLink to="/products" end className={navItem}>
                Store
              </NavLink>
            </div>
          </div>

          {/* CENTER: Search (desktop) */}
          <div className="hidden lg:flex flex-1 justify-center px-3">
            <form
              onSubmit={onSearchSubmit}
              className="flex w-full max-w-[620px]"
              role="search"
            >
              <div className="relative w-full" ref={searchBoxRef}>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={() => {
                    if (String(q || "").trim().length >= 2) setSugOpen(true);
                  }}
                  onKeyDown={onSearchKeyDown}
                  placeholder="Search products..."
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl
                             pl-11 pr-4 py-2.5 text-sm text-white
                             placeholder:text-slate-500
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/20
                             focus:border-indigo-500 transition-all"
                />

                {/* ✅ FIXED svg path (your earlier error was from a broken d string) */}
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {sugOpen && String(q || "").trim().length >= 2 && (
                  <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden z-[99999]">
                    {sugLoading ? (
                      <div className="p-4 text-sm text-slate-400">
                        Searching…
                      </div>
                    ) : sugs.length === 0 ? (
                      <div className="p-4 text-sm text-slate-400">
                        No matches
                      </div>
                    ) : (
                      <div className="max-h-[360px] overflow-auto">
                        {sugs.map((p, idx) => (
                          <button
                            key={p._id || p.slug || idx}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseEnter={() => setActiveIdx(idx)}
                            onClick={() => goProduct(p.slug)}
                            className={[
                              "w-full text-left px-4 py-3 flex items-center gap-3 border-b border-slate-800/60 last:border-b-0",
                              idx === activeIdx
                                ? "bg-indigo-500/10"
                                : "hover:bg-slate-900/50",
                            ].join(" ")}
                          >
                            <div className="h-10 w-10 rounded-xl overflow-hidden border border-slate-800 bg-slate-900/40 shrink-0">
                              {p.image ? (
                                <img
                                  src={p.image}
                                  alt={p.title}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : null}
                            </div>

                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-100 truncate">
                                {p.title}
                              </div>
                              <div className="text-xs text-slate-400">
                                {p.discountPrice &&
                                p.discountPrice < p.price ? (
                                  <>
                                    <span className="text-slate-200 font-bold">
                                      ₹
                                      {Number(p.discountPrice).toLocaleString(
                                        "en-IN",
                                      )}
                                    </span>{" "}
                                    <span className="line-through">
                                      ₹{Number(p.price).toLocaleString("en-IN")}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-slate-200 font-bold">
                                    ₹
                                    {Number(p.price || 0).toLocaleString(
                                      "en-IN",
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}

                        {/* view all row */}
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => goSearch(q)}
                          className="w-full px-4 py-3 text-left text-sm font-bold text-indigo-300 hover:bg-slate-900/60"
                        >
                          View all results →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* RIGHT: About/Contact/FAQ + icons + user */}
          <div className="ml-auto flex items-center gap-4 shrink-0">
            {/* ✅ Styled like Home/Store */}
            <NavLink to="/about" className={navItem}>
              About Us
            </NavLink>
            <NavLink to="/contact" className={navItem}>
              Contact Us
            </NavLink>
            <NavLink to="/faq" className={navItem}>
              FAQ
            </NavLink>

            {/* ✅ Hamburger (mobile) */}
            <button
              type="button"
              onClick={() => setMOpen(true)}
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/30 text-slate-200 hover:text-white hover:border-slate-700 transition"
              aria-label="Open menu"
              title="Menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="relative p-2 text-slate-400 hover:text-white transition-colors"
              aria-label="Wishlist"
              title="Wishlist"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
              </svg>

              {wishlistCount > 0 && (
                <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold text-white ring-2 ring-slate-950">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              to="/cart"
              className="relative p-2 text-slate-400 hover:text-white transition-colors"
              aria-label="Cart"
              title="Cart"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>

              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold text-white ring-2 ring-slate-950">
                {cartCount}
              </span>
            </Link>

            {/* Auth / User menu */}
            {user ? (
              <div className="relative z-[9999]" ref={dropdownRef}>
                <button
                  onClick={() => setOpen((v) => !v)}
                  className="h-9 w-9 rounded-full overflow-hidden border border-slate-800 shadow hover:border-slate-700 transition"
                  aria-label="User menu"
                  title={user?.name || "Account"}
                >
                  {user?.avatar?.url || user?.avatar?.imageUrl ? (
                    <img
                      src={user?.avatar?.url || user?.avatar?.imageUrl}
                      alt={user?.name || "User"}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-indigo-500 text-white font-bold text-sm">
                      {user?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                </button>

                {open && (
                  <div className="absolute right-0 mt-3 w-48 rounded-xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden z-[99999]">
                    <div className="px-4 py-3 border-b border-slate-800">
                      <p className="text-xs text-slate-400">Signed in as</p>
                      <p className="text-sm font-bold text-white truncate">
                        {user?.name || user?.email || "User"}
                      </p>
                    </div>
                    <Link
                      to="/my-profile"
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 text-sm text-slate-200 hover:bg-slate-900 transition"
                    >
                      My Profile
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 text-sm text-slate-200 hover:bg-slate-900 transition"
                    >
                      My Orders
                    </Link>
                    <Link
                      to="/support"
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 text-sm text-slate-200 hover:bg-slate-900 transition"
                    >
                      My Support
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-slate-900 transition"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/login"
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-200 hover:text-white hover:border-slate-700 transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-400 transition"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ROW 2: Categories dropdown */}
        {/* ROW 2: Categories dropdown */}
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-800/60 pt-3">
          {/* LEFT: Categories + Bundle link */}
          <div className="flex items-center gap-2">
            <div className="relative" ref={catRef}>
              {/* ✅ Only usable on full-screen (lg and above) */}
              <button
                type="button"
                onClick={() => setCatOpen((v) => !v)}
                className="hidden lg:inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm font-bold text-slate-200 hover:text-white hover:border-slate-700 transition"
                aria-haspopup="dialog"
                aria-expanded={catOpen}
              >
                Categories
                <svg
                  className={`h-4 w-4 transition-transform ${catOpen ? "rotate-180" : ""}`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* ✅ Desktop full-screen overlay categories list */}
              {/* ✅ Desktop full-screen overlay categories list */}
              {catOpen && (
                <div className="hidden lg:block">
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-[99980] bg-black/60 backdrop-blur-sm"
                    onClick={closeCat}
                  />

                  {/* Panel */}
                  <div className="fixed inset-0 z-[99990]">
                    <div className="mx-auto max-w-7xl px-4 md:px-8 pt-24">
                      <div className="rounded-3xl border border-slate-800 bg-slate-950/95 shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-6 py-4">
                          <div>
                            <div className="text-lg font-black text-white">
                              All Categories
                            </div>
                            <div className="text-xs text-slate-400">
                              Choose a category to browse products
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setCatOpen(false);
                                navigate("/products");
                              }}
                              className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-900/70 hover:text-white transition"
                            >
                              View All Products
                            </button>

                            <button
                              type="button"
                              onClick={closeCat}
                              className="rounded-xl border border-slate-800 bg-slate-900/20 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-900/50 hover:text-white transition"
                            >
                              Close
                            </button>
                          </div>
                        </div>

                        {/* Grid list */}
                        <div className="max-h-[70vh] overflow-auto px-6 py-6">
                          {cats.length ? (
                            <div className="grid grid-cols-3 gap-3">
                              {cats.map((c) => (
                                <button
                                  key={c._id || c.slug || c.name}
                                  type="button"
                                  onClick={() => goCategory(c.slug || c._id)}
                                  className="text-left rounded-2xl border border-slate-800 bg-slate-900/30 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900/70 hover:border-slate-700 hover:text-white transition"
                                >
                                  {c.name}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-slate-500">
                              No categories found
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-slate-800 px-6 py-4 flex items-center justify-between">
                          <div className="text-xs text-slate-500">
                            Tip: Use search for exact products.
                          </div>

                          <button
                            type="button"
                            onClick={goBundles}
                            className="rounded-xl border border-slate-800 bg-slate-900/20 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-900/50 hover:text-white transition"
                          >
                            Browse Bundles
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ✅ Bundle link (still visible on all sizes if you want) */}
            <button
              type="button"
              onClick={goBundles}
              className="hidden md:inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/20 px-3 py-2 text-sm font-bold text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-900/35 transition"
              title="Browse bundles"
            >
              Bundles
            </button>
          </div>

          {/* pills */}
          {/* pills */}
          <div className="hidden md:flex flex-wrap items-center gap-2">
            <Link
              to="/products?hasOffer=true"
              className="rounded-xl border border-slate-800 bg-slate-900/20 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-700 transition"
            >
              Limited Deals
            </Link>

            <Link
              to="/products?sort=discount-desc"
              className="rounded-xl border border-slate-800 bg-slate-900/20 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-700 transition"
            >
              Best Deals
            </Link>

            <Link
              to="/products?sort=newest"
              className="rounded-xl border border-slate-800 bg-slate-900/20 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-700 transition"
            >
              New Arrivals
            </Link>
          </div>
        </div>

        {/* ROW 3: Search (mobile/tablet) */}
        {/* ROW 3: Search (mobile/tablet) */}
        <div className="mt-3 lg:hidden">
          <form onSubmit={onSearchSubmit} className="w-full" role="search">
            <div className="relative w-full" ref={searchBoxRef}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => {
                  if (String(q || "").trim().length >= 2) setSugOpen(true);
                }}
                onKeyDown={onSearchKeyDown}
                placeholder="Search products..."
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl
                   pl-11 pr-4 py-2.5 text-sm text-white
                   placeholder:text-slate-500
                   focus:outline-none focus:ring-2 focus:ring-indigo-500/20
                   focus:border-indigo-500 transition-all"
              />

              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>

              {/* ✅ Suggestions dropdown (mobile too) */}
              {sugOpen && String(q || "").trim().length >= 2 && (
                <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden z-[99999]">
                  {sugLoading ? (
                    <div className="p-4 text-sm text-slate-400">Searching…</div>
                  ) : sugs.length === 0 ? (
                    <div className="p-4 text-sm text-slate-400">No matches</div>
                  ) : (
                    <div className="max-h-[320px] overflow-auto">
                      {sugs.map((p, idx) => (
                        <button
                          key={p._id || p.slug || idx}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseEnter={() => setActiveIdx(idx)}
                          onClick={() => goProduct(p.slug)}
                          className={[
                            "w-full text-left px-4 py-3 flex items-center gap-3 border-b border-slate-800/60 last:border-b-0",
                            idx === activeIdx
                              ? "bg-indigo-500/10"
                              : "hover:bg-slate-900/50",
                          ].join(" ")}
                        >
                          <div className="h-10 w-10 rounded-xl overflow-hidden border border-slate-800 bg-slate-900/40 shrink-0">
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.title}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : null}
                          </div>

                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-100 truncate">
                              {p.title}
                            </div>
                            <div className="text-xs text-slate-400">
                              {p.discountPrice && p.discountPrice < p.price ? (
                                <>
                                  <span className="text-slate-200 font-bold">
                                    ₹
                                    {Number(p.discountPrice).toLocaleString(
                                      "en-IN",
                                    )}
                                  </span>{" "}
                                  <span className="line-through">
                                    ₹{Number(p.price).toLocaleString("en-IN")}
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-200 font-bold">
                                  ₹
                                  {Number(p.price || 0).toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}

                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => goSearch(q)}
                        className="w-full px-4 py-3 text-left text-sm font-bold text-indigo-300 hover:bg-slate-900/60"
                      >
                        View all results →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* ✅ Mobile Drawer */}
        {mOpen && (
          <Portal>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-sm"
              onClick={closeMobile}
            />

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 z-[100001] w-[88vw] max-w-sm">
              <div
                ref={mobileRef}
                className="h-full border-l border-slate-800 bg-slate-950/95 shadow-2xl"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg overflow-hidden border border-slate-800 bg-slate-900/40">
                      <img
                        src={BrandLogo}
                        alt="PC PartMart"
                        className="h-full w-full object-contain p-1"
                        draggable={false}
                        loading="lazy"
                      />
                    </div>
                    <div className="font-black text-white">
                      PC<span className="text-indigo-500"> PartMart</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeMobile}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/30 text-slate-200 hover:text-white hover:border-slate-700 transition"
                    aria-label="Close menu"
                    title="Close"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Body */}
                <div className="h-[calc(100%-64px)] overflow-auto">
                  <div className="border-t border-slate-800 px-4 py-4 space-y-2">
                    {user ? (
                      <>
                        <div className="rounded-xl border border-slate-800 bg-slate-900/25 px-4 py-3">
                          <div className="text-xs text-slate-400">
                            Signed in as
                          </div>
                          <div className="text-sm font-bold text-white truncate">
                            {user?.name || user?.email || "User"}
                          </div>
                        </div>

                        <Link
                          to="/my-profile"
                          onClick={closeMobile}
                          className="block rounded-xl border border-slate-800 bg-slate-900/25 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900/60 hover:text-white transition"
                        >
                          My Profile
                        </Link>

                        <Link
                          to="/orders"
                          onClick={closeMobile}
                          className="block rounded-xl border border-slate-800 bg-slate-900/25 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900/60 hover:text-white transition"
                        >
                          My Orders
                        </Link>

                        <Link
                          to="/support"
                          onClick={closeMobile}
                          className="block rounded-xl border border-slate-800 bg-slate-900/25 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900/60 hover:text-white transition"
                        >
                          My Support
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            closeMobile();
                            handleLogout();
                          }}
                          className="w-full text-left rounded-xl border border-slate-800 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-300 hover:bg-rose-500/15 transition"
                        >
                          Logout
                        </button>
                      </>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          to="/login"
                          onClick={closeMobile}
                          className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-center text-sm font-bold text-slate-200 hover:text-white hover:border-slate-700 transition"
                        >
                          Login
                        </Link>

                        <Link
                          to="/register"
                          onClick={closeMobile}
                          className="rounded-xl bg-indigo-500 px-4 py-3 text-center text-sm font-bold text-white hover:bg-indigo-400 transition"
                        >
                          Register
                        </Link>
                      </div>
                    )}
                  </div>
                  {/* Quick links */}
                  <div className="px-4 py-4 space-y-2">
                    {[
                      { to: "/", label: "Home" },
                      { to: "/products", label: "Store" },
                      { to: "/about", label: "About Us" },
                      { to: "/contact", label: "Contact Us" },
                      { to: "/faq", label: "FAQ" },
                    ].map((x) => (
                      <Link
                        key={x.to}
                        to={x.to}
                        onClick={closeMobile}
                        className="block rounded-xl border border-slate-800 bg-slate-900/25 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900/60 hover:text-white transition"
                      >
                        {x.label}
                      </Link>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        closeMobile();
                        navigate("/products?type=bundle");
                      }}
                      className="w-full text-left rounded-xl border border-slate-800 bg-slate-900/25 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900/60 hover:text-white transition"
                    >
                      Bundles
                    </button>
                  </div>

                  {/* Deals (moved from navbar pills) */}
                  <div className="border-t border-slate-800 px-4 py-4">
                    <div className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">
                      Deals
                    </div>

                    <div className="space-y-2">
                      <Link
                        to="/products?hasOffer=true"
                        onClick={closeMobile}
                        className="block rounded-xl border border-slate-800 bg-slate-900/25 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900/60 hover:text-white transition"
                      >
                        Limited Deals
                      </Link>

                      <Link
                        to="/products?sort=discount-desc"
                        onClick={closeMobile}
                        className="block rounded-xl border border-slate-800 bg-slate-900/25 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900/60 hover:text-white transition"
                      >
                        Best Deals
                      </Link>

                      <Link
                        to="/products?sort=newest"
                        onClick={closeMobile}
                        className="block rounded-xl border border-slate-800 bg-slate-900/25 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900/60 hover:text-white transition"
                      >
                        New Arrivals
                      </Link>
                    </div>
                  </div>

                  {/* Categories (mobile full list) */}
                  <div className="border-t border-slate-800 px-4 py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Categories
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          closeMobile();
                          navigate("/products");
                        }}
                        className="text-xs font-bold text-indigo-300 hover:text-indigo-200"
                      >
                        View all
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(cats || []).length ? (
                        cats.map((c) => (
                          <button
                            key={c._id || c.slug || c.name}
                            type="button"
                            onClick={() => {
                              closeMobile();
                              navigate(
                                `/products?category=${encodeURIComponent(c.slug || c._id)}`,
                              );
                            }}
                            className="w-full text-left rounded-xl border border-slate-800 bg-slate-900/20 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900/60 hover:text-white transition"
                          >
                            {c.name}
                          </button>
                        ))
                      ) : (
                        <div className="text-sm text-slate-500">
                          No categories found
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Auth section */}
                </div>
              </div>
            </div>
          </Portal>
        )}
      </div>
    </nav>
  );
}
