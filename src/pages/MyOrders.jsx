import { useEffect, useMemo, useState } from "react";
import { myOrders } from "../api/orders";
import { Link } from "react-router-dom";

function Collage({ urls = [] }) {
  const imgs = useMemo(() => (urls || []).filter(Boolean).slice(0, 3), [urls]);
  const [active, setActive] = useState(-1);

  if (imgs.length === 0) {
    return (
      <div className="h-16 w-16 rounded-2xl border border-slate-800 bg-slate-950/40 grid place-items-center text-[10px] font-bold text-slate-500">
        NO IMG
      </div>
    );
  }

  if (imgs.length === 1) {
    return (
      <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/30 group">
        <img
          src={imgs[0]}
          alt=""
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 to-transparent pointer-events-none" />
        <div className="absolute inset-0 ring-0 group-hover:ring-2 group-hover:ring-indigo-500/40 transition" />
      </div>
    );
  }

  return (
    <div className="relative h-16 w-24">
      {imgs.map((u, idx) => {
        const left = idx * 14;
        const isActive = active === idx;
        const isAnyHover = active !== -1;

        return (
          <div
            key={`${idx}-${u}`}
            className={[
              "absolute top-0 h-16 w-16 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/30",
              "shadow-[0_0_20px_rgba(0,0,0,0.25)] transition-all duration-150 cursor-pointer",
              isActive ? "scale-[1.06] ring-2 ring-indigo-500/40" : "scale-100",
              isAnyHover && !isActive ? "opacity-70" : "opacity-100",
            ].join(" ")}
            style={{ left, zIndex: isActive ? 50 : 10 + idx }}
            onMouseEnter={() => setActive(idx)}
            onMouseLeave={() => setActive(-1)}
          >
            <img src={u} alt="" className="h-full w-full object-contain" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 to-transparent pointer-events-none" />
          </div>
        );
      })}
    </div>
  );
}

const StatusPill = ({ status = "" }) => {
  const s = String(status || "").toUpperCase();

  const cls =
    s === "DELIVERED"
      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
      : s === "CANCELLED"
        ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
        : "bg-amber-500/10 text-amber-300 border-amber-500/20";

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border",
        "px-2.5 py-0.5", // ✅ smaller padding
        "text-[10px] font-black uppercase tracking-widest", // ✅ small text
        cls,
      ].join(" ")}
      title={s || "UNKNOWN"}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {s || "UNKNOWN"}
    </span>
  );
};

const RRPill = ({ rr = null }) => {
  const status = String(rr?.status || "NONE").toUpperCase();
  const type = String(rr?.type || "").toUpperCase();

  if (!rr || status === "NONE") return null;

  const label =
    status === "REQUESTED"
      ? `${type || "RR"} REQUESTED`
      : status === "APPROVED"
        ? `${type || "RR"} APPROVED`
        : status === "REJECTED"
          ? `${type || "RR"} REJECTED`
          : `${type || "RR"} ${status}`;

  const cls =
    status === "REQUESTED"
      ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
      : status === "APPROVED"
        ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
        : status === "REJECTED"
          ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
          : "bg-slate-800 text-slate-300 border-slate-700";

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5",
        "text-[10px] font-black uppercase tracking-widest",
        cls,
      ].join(" ")}
      title={label}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
};

const fmtINR = (n) => `₹${Number(n || 0).toFixed(0)}`;

function RowSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 animate-pulse">
      <div className="flex gap-4 items-center">
        <div className="h-16 w-24 rounded-2xl bg-slate-900/60 border border-slate-800" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 bg-slate-900/60 rounded" />
          <div className="h-3 w-72 bg-slate-900/60 rounded" />
          <div className="h-3 w-56 bg-slate-900/60 rounded" />
        </div>
        <div className="h-10 w-24 bg-slate-900/60 rounded-2xl border border-slate-800" />
      </div>
    </div>
  );
}

// ✅ Refund calc: cancelled + returned (optional: add replacedQty if you refund it)
const calcRefund = (order) => {
  const arr = Array.isArray(order?.items) ? order.items : [];
  return arr.reduce((sum, it) => {
    const unit = Number(it?.priceSnapshot ?? 0);
    const cancelledQty = Number(it?.cancelledQty || 0);
    const returnedQty = Number(it?.returnedQty || 0);
    return sum + unit * (cancelledQty + returnedQty);
  }, 0);
};

// ✅ Show refund ONLY for UPI/CARD (never COD)
const shouldShowRefundForOrder = (order) => {
  const method = String(order?.payment?.method || "").toUpperCase();
  if (method === "COD") return false;
  return ["UPI", "CARD"].includes(method);
};

// ✅ Compute partial state counts from order items
const getPartialMeta = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];

  let anyPartialCancel = false;
  let anyPartialReturn = false;
  let anyPartialReplace = false;

  let anyFullCancel = false;
  let anyFullReturn = false;
  let anyFullReplace = false;

  for (const it of items) {
    const qty = Number(it?.qty ?? 0);
    const cancelledQty = Number(it?.cancelledQty || 0);
    const returnedQty = Number(it?.returnedQty || 0);
    const replacedQty = Number(it?.replacedQty || 0);

    // "active" left after any action
    const activeQty = Math.max(
      0,
      qty - cancelledQty - returnedQty - replacedQty,
    );

    if (cancelledQty > 0 && activeQty > 0) anyPartialCancel = true;
    if (returnedQty > 0 && activeQty > 0) anyPartialReturn = true;
    if (replacedQty > 0 && activeQty > 0) anyPartialReplace = true;

    // fully affected means active becomes 0 AND that action happened
    if (cancelledQty > 0 && activeQty === 0) anyFullCancel = true;
    if (returnedQty > 0 && activeQty === 0) anyFullReturn = true;
    if (replacedQty > 0 && activeQty === 0) anyFullReplace = true;
  }

  return {
    anyPartialCancel,
    anyPartialReturn,
    anyPartialReplace,
    anyFullCancel,
    anyFullReturn,
    anyFullReplace,
  };
};

// ✅ Small pill used for partial + full item-state indicators
const MiniPill = ({ label, tone = "slate" }) => {
  const cls =
    tone === "cancel"
      ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
      : tone === "return"
        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
        : tone === "replace"
          ? "bg-sky-500/10 text-sky-300 border-sky-500/20"
          : "bg-slate-800 text-slate-300 border-slate-700";

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1",
        "text-[10px] font-black uppercase tracking-widest",
        cls,
      ].join(" ")}
      title={label}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
};

// ✅ Shows partial pills (and optional full-action pills) for an order
const PartialPills = ({ order }) => {
  const meta = useMemo(() => getPartialMeta(order), [order]);

  // Don’t show these on CANCELLED orders if you prefer (optional)
  const status = String(order?.status || "").toUpperCase();
  if (status === "CANCELLED") return null;

  return (
    <>
      {meta.anyPartialCancel && (
        <MiniPill label="PARTIALLY CANCELLED" tone="cancel" />
      )}
      {meta.anyPartialReturn && (
        <MiniPill label="PARTIALLY RETURNED" tone="return" />
      )}
      {meta.anyPartialReplace && (
        <MiniPill label="PARTIALLY REPLACED" tone="replace" />
      )}

      {/* Optional: show when something is fully cancelled/returned/replaced */}
      {meta.anyFullCancel && !meta.anyPartialCancel && (
        <MiniPill label="CANCELLED ITEMS" tone="cancel" />
      )}
      {meta.anyFullReturn && !meta.anyPartialReturn && (
        <MiniPill label="RETURNED ITEMS" tone="return" />
      )}
      {meta.anyFullReplace && !meta.anyPartialReplace && (
        <MiniPill label="REPLACED ITEMS" tone="replace" />
      )}
    </>
  );
};

const normalize = (s) =>
  String(s || "")
    .trim()
    .toUpperCase();
const shortId = (id) =>
  String(id || "")
    .slice(-6)
    .toUpperCase();

const hasRR = (o) => normalize(o?.returnRequest?.status || "NONE") !== "NONE";

const matchesStatusFilter = (o, filter) => {
  const s = normalize(o?.status);
  if (filter === "ALL") return true;
  if (filter === "RR") return hasRR(o);
  return s === filter;
};

const matchesQuery = (o, query) => {
  const qq = normalize(query);
  if (!qq) return true;

  // Order id match (full + last6)
  const id = normalize(o?._id);
  const last6 = shortId(o?._id);

  const q2 = qq.replace("ORDER", "").replace("#", "").trim();

  // ✅ Item name match (titleSnapshot)
  const titles = Array.isArray(o?.items)
    ? o.items
        .map((it) => normalize(it?.titleSnapshot || it?.productId?.title || ""))
        .filter(Boolean)
    : [];

  const titleHit = titles.some((t) => t.includes(qq) || t.includes(q2));

  return (
    id.includes(qq) ||
    last6.includes(qq) ||
    id.includes(q2) ||
    last6.includes(q2) ||
    titleHit
  );
};

export default function MyOrders() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("NEWEST");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6); // change default if you want

  useEffect(() => {
    (async () => {
      try {
        const res = await myOrders();
        setItems(res.data?.orders || res.data || []);
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visibleItems = useMemo(() => {
    const arr = Array.isArray(items) ? [...items] : [];

    const toTime = (o) => {
      const t = new Date(o?.createdAt || 0).getTime();
      return Number.isFinite(t) ? t : 0;
    };

    const toAmount = (o) => Number(o?.totalAmount ?? 0);

    const rrRank = (o) => {
      const rrStatus = normalize(o?.returnRequest?.status || "NONE");
      if (rrStatus === "REQUESTED") return 0;
      if (rrStatus === "APPROVED") return 1;
      if (rrStatus === "REJECTED") return 2;
      return 3;
    };

    const statusRank = (o) => {
      const s = normalize(o?.status);
      if (s === "PLACED") return 0;
      if (s === "CONFIRMED") return 1;
      if (s === "SHIPPED") return 2;
      if (s === "DELIVERED") return 3;
      if (s === "CANCELLED") return 9;
      return 5;
    };

    // ✅ filter first
    const filtered = arr
      .filter((o) => matchesStatusFilter(o, statusFilter))
      .filter((o) => matchesQuery(o, q));

    // ✅ then sort
    filtered.sort((a, b) => {
      if (sortBy === "NEWEST") return toTime(b) - toTime(a);
      if (sortBy === "OLDEST") return toTime(a) - toTime(b);

      if (sortBy === "AMOUNT_HIGH") return toAmount(b) - toAmount(a);
      if (sortBy === "AMOUNT_LOW") return toAmount(a) - toAmount(b);

      if (sortBy === "STATUS") {
        const rr = rrRank(a) - rrRank(b);
        if (rr !== 0) return rr;

        const st = statusRank(a) - statusRank(b);
        if (st !== 0) return st;

        return toTime(b) - toTime(a);
      }

      return toTime(b) - toTime(a);
    });

    return filtered;
  }, [items, sortBy, statusFilter, q]);

  useEffect(() => {
    setPage(1);
  }, [sortBy, statusFilter, q]);

  const totalPages = useMemo(() => {
    const n = Math.ceil((visibleItems.length || 0) / Number(pageSize || 1));
    return Math.max(1, n);
  }, [visibleItems.length, pageSize]);

  const safePage = useMemo(() => {
    return Math.min(Math.max(1, page), totalPages);
  }, [page, totalPages]);

  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return visibleItems.slice(start, end);
  }, [visibleItems, safePage, pageSize]);

  const pageStart = (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, visibleItems.length);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            My Orders
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Track orders, view details, and manage cancellations/returns.
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-3">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Total: <span className="text-slate-200">{items.length}</span>
              <span className="text-slate-600"> • </span>
              Showing:{" "}
              <span className="text-slate-200">{pagedItems.length}</span>
              
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-200 outline-none focus:border-indigo-500/60"
              >
                <option value="NEWEST">Newest</option>
                <option value="OLDEST">Oldest</option>
                <option value="AMOUNT_HIGH">Amount: High → Low</option>
                <option value="AMOUNT_LOW">Amount: Low → High</option>
                <option value="STATUS">Status Priority</option>
              </select>

              {/* ✅ animated sort arrow */}
              <span
                className={[
                  "inline-flex h-9 w-9 items-center justify-center rounded-xl",
                  "border border-slate-800 bg-slate-950/60 text-slate-300",
                  "transition-transform duration-200",
                  sortBy === "NEWEST" || sortBy === "AMOUNT_HIGH"
                    ? "rotate-0"
                    : "",
                  sortBy === "OLDEST" || sortBy === "AMOUNT_LOW"
                    ? "rotate-180"
                    : "",
                ].join(" ")}
                title="Sort direction indicator"
              >
                ↑
              </span>
            </div>
          </div>

          {/* ✅ search */}
          <div className="w-full sm:w-[340px]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by Order ID or item name…"
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500/60"
            />
          </div>

          {/* ✅ status filter buttons */}
          <div className="flex flex-wrap justify-end gap-2">
            {[
              { key: "ALL", label: "All" },
              { key: "RR", label: "RR" },
              { key: "PLACED", label: "Placed" },
              { key: "CONFIRMED", label: "Confirmed" },
              { key: "SHIPPED", label: "Shipped" },
              { key: "DELIVERED", label: "Delivered" },
              { key: "CANCELLED", label: "Cancelled" },
            ].map((f) => {
              const active = statusFilter === f.key;

              return (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={[
                    "rounded-full border px-3 py-1",
                    "text-[10px] font-black uppercase tracking-widest",
                    active
                      ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200"
                      : "border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-950/60",
                  ].join(" ")}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {err && (
        <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {err}
        </div>
      )}

      {/* List */}
      <div className="mt-6 space-y-3">
        {!loading && visibleItems.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Showing{" "}
              <span className="text-slate-200">
                {pageStart}-{pageEnd}
              </span>{" "}
              of <span className="text-slate-200">{visibleItems.length}</span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              {/* page size */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Per page
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-200 outline-none focus:border-indigo-500/60"
                >
                  <option value={4}>4</option>
                  <option value={6}>6</option>
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                </select>
              </div>

              {/* pager */}
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
          </div>
        )}

        {loading && (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        )}

        {!loading &&
          pagedItems.map((o) => {
            const orderItems = Array.isArray(o.items) ? o.items : [];

            const itemCount = orderItems.reduce(
              (sum, x) => sum + Number(x.qty || 0),
              0,
            );

            const titles = orderItems
              .map((x) => x?.titleSnapshot)
              .filter(Boolean)
              .slice(0, 3);

            const imageUrls = orderItems
              .map(
                (x) => x?.imageSnapshot || x?.productId?.images?.[0]?.url || "",
              )
              .filter(Boolean)
              .slice(0, 3);

            const orderIdShort = String(o._id || "")
              .slice(-6)
              .toUpperCase();
            const dateText = o.createdAt
              ? new Date(o.createdAt).toLocaleString()
              : "";

            const refund = calcRefund(o);
            const showRefund = shouldShowRefundForOrder(o) && refund > 0; // ✅ COD never shows

            return (
              <div
                key={o._id}
                className="group rounded-2xl border border-slate-800 bg-slate-950/40 p-5 transition hover:bg-slate-950/60"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  {/* Left visuals */}
                  <div className="flex items-center gap-4">
                    <Collage urls={imageUrls} />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-black text-white">
                          Order #{orderIdShort}
                        </div>

                        <StatusPill status={o.status} />
                        <RRPill rr={o.returnRequest} />

                        {/* ✅ NEW: partial cancelled/returned/replaced pills */}
                        <PartialPills order={o} />
                      </div>

                      <div className="mt-2 text-sm text-slate-400">
                        {itemCount} item{itemCount !== 1 ? "s" : ""} •{" "}
                        <span className="font-bold text-slate-200">
                          {fmtINR(o.totalAmount)}
                        </span>
                        {/* ✅ refunded amount (UPI/CARD only, never COD) */}
                        {showRefund && (
                          <span className="ml-3 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-black text-indigo-200">
                            Refunded: {fmtINR(refund)}
                          </span>
                        )}
                      </div>

                      {dateText && (
                        <div className="mt-1 text-xs text-slate-500">
                          Placed: {dateText}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle: titles + tags */}
                  <div className="flex-1 min-w-0">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-4">
                      {titles.length > 0 ? (
                        <div className="space-y-1">
                          {orderItems.slice(0, 3).map((it, idx) => {
                            const t = it?.titleSnapshot || "Item";

                            const qty = Number(it?.qty ?? 0);
                            const cancelledQty = Number(it?.cancelledQty || 0);
                            const returnedQty = Number(it?.returnedQty || 0);
                            const replacedQty = Number(it?.replacedQty || 0);

                            const activeQty = Math.max(
                              0,
                              qty - cancelledQty - returnedQty - replacedQty,
                            );

                            const isPartialCancelled =
                              cancelledQty > 0 && activeQty > 0;
                            const isPartialReturned =
                              returnedQty > 0 && activeQty > 0;
                            const isPartialReplaced =
                              replacedQty > 0 && activeQty > 0;

                            const isFullyCancelled =
                              cancelledQty > 0 && activeQty === 0;
                            const isFullyReturned =
                              returnedQty > 0 && activeQty === 0;
                            const isFullyReplaced =
                              replacedQty > 0 && activeQty === 0;

                            return (
                              <div
                                key={`${idx}-${t}`}
                                className="flex items-center gap-2 text-sm text-slate-300 truncate"
                                title={t}
                              >
                                <span className="truncate">• {t}</span>

                                {/* ✅ Cancelled tag */}
                                {cancelledQty > 0 && (
                                  <span className="shrink-0 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-black border border-rose-500/20">
                                    <span
                                      className={
                                        isPartialCancelled
                                          ? "text-amber-300"
                                          : "text-rose-300"
                                      }
                                    >
                                      {isPartialCancelled
                                        ? "Partially cancelled"
                                        : "Cancelled"}
                                    </span>
                                  </span>
                                )}

                                {/* ✅ Returned tag */}
                                {returnedQty > 0 && (
                                  <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-300 border border-emerald-500/20">
                                    {isPartialReturned
                                      ? "Partially returned"
                                      : "Returned"}
                                  </span>
                                )}

                                {/* ✅ Replaced tag */}
                                {replacedQty > 0 && (
                                  <span className="shrink-0 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-black text-sky-300 border border-sky-500/20">
                                    {isPartialReplaced
                                      ? "Partially replaced"
                                      : "Replaced"}
                                  </span>
                                )}

                                {/* Optional: show qty hint (tiny) */}
                                {(cancelledQty > 0 ||
                                  returnedQty > 0 ||
                                  replacedQty > 0) && (
                                  <span className="shrink-0 text-[10px] text-slate-500">
                                    (A:{activeQty})
                                  </span>
                                )}
                              </div>
                            );
                          })}

                          {orderItems.length > 3 && (
                            <div className="text-xs text-slate-500 mt-2">
                              +{orderItems.length - 3} more item
                              {orderItems.length - 3 > 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500">No items</div>
                      )}
                    </div>
                  </div>

                  {/* Right: CTA */}
                  <div className="flex md:justify-end">
                    <Link
                      to={`/orders/${o._id}`}
                      className={[
                        "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3",
                        "text-sm font-bold text-white",
                        "bg-indigo-600 shadow-xl shadow-indigo-500/20",
                        "transition-all hover:bg-indigo-500 hover:translate-y-[-2px] active:translate-y-[0px]",
                      ].join(" ")}
                    >
                      View Details
                      <span className="opacity-80 group-hover:opacity-100 transition">
                        →
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

        {!loading && !items.length && !err && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-10 text-center">
            <div className="text-xl font-black text-white">No orders yet</div>
            <div className="mt-2 text-sm text-slate-400">
              Once you place an order, it will appear here.
            </div>

            <Link
              to="/products"
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-500/20 hover:bg-indigo-500"
            >
              Browse Store
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
