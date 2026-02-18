import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getOrder,
  requestRR,
  cancelOrder,
  cancelRR,
  cancelItems,
} from "../api/orders";
import { toast } from "react-toastify";
import { canReviewProduct, getMyReview, deleteMyReview } from "../api/reviews";

const fmt = (n) => `₹${Number(n || 0).toFixed(0)}`;

const pctOff = (strike, paid) => {
  const s = Number(strike || 0);
  const p = Number(paid || 0);
  if (!s || !p || s <= p) return 0;
  return Math.round(((s - p) / s) * 100);
};

const animDelay = (i) => ({ animationDelay: `${i * 70}ms` });

export default function OrderDetails() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);

  // RR
  const [reason, setReason] = useState("");
  const [type, setType] = useState("RETURN");
  const [rrMode, setRrMode] = useState(false);

  // Cancel
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [partialCancelMode, setPartialCancelMode] = useState(false);

  // Common UI
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Selection + qty map
  const [selected, setSelected] = useState({});
  const [qtyMap, setQtyMap] = useState({});

  // review eligibility map: { [productId]: { canReview: boolean, reason: string } }
  const [reviewElig, setReviewElig] = useState({});
  const [reviewEligLoading, setReviewEligLoading] = useState({});

  // { [productId]: reviewObject | null }
  const [myReviewMap, setMyReviewMap] = useState({});
  const [reviewActionLoading, setReviewActionLoading] = useState({});

  const [animKey, setAnimKey] = useState(0);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const pidOf = (it) =>
    String(it?.productId?._id || it?.productId || it?._id || "");

  const load = async ({ silent = false } = {}) => {
    setErr("");
    try {
      const res = await getOrder(id);
      setOrder(res.data?.order || res.data);
      setLoadedOnce(true);
      setAnimKey((k) => k + 1);
    } catch (e) {
      const message = e?.response?.data?.message || "Failed to load order";
      setErr(message);
      if (!silent) toast.error(`❌ ${message}`, { toastId: `load-${id}` });
    }
  };
  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!order?._id) return;
    if (String(order?.status || "").toUpperCase() !== "DELIVERED") return;

    const items = Array.isArray(order?.items) ? order.items : [];
    const ids = items.map((it) => pidOf(it)).filter(Boolean);
    const uniq = Array.from(new Set(ids));

    let alive = true;

    (async () => {
      try {
        setReviewEligLoading((prev) => {
          const next = { ...prev };
          uniq.forEach((pid) => (next[pid] = true));
          return next;
        });

        const results = await Promise.allSettled(
          uniq.map(async (pid) => {
            const [eligRes, myRes] = await Promise.allSettled([
              canReviewProduct(pid),
              getMyReview(pid),
            ]);

            const elig =
              eligRes.status === "fulfilled"
                ? {
                    canReview: !!eligRes.value.data?.canReview,
                    reason: eligRes.value.data?.reason || "",
                  }
                : { canReview: false, reason: "" };

            // if 404 => no review yet
            let myReview = null;

            if (myRes.status === "fulfilled") {
              myReview = myRes.value.data?.review || null;
            } else {
              // If 404 → user has no review (this is normal)
              if (myRes.reason?.response?.status === 404) {
                myReview = null;
              } else {
                // some other unexpected error
                console.error("Review fetch error:", myRes.reason);
              }
            }

            return { pid, elig, myReview };
          }),
        );

        if (!alive) return;

        setReviewElig((prev) => {
          const next = { ...prev };
          results.forEach((r) => {
            if (r.status === "fulfilled") next[r.value.pid] = r.value.elig;
          });
          return next;
        });

        setMyReviewMap((prev) => {
          const next = { ...prev };
          results.forEach((r) => {
            if (r.status === "fulfilled") next[r.value.pid] = r.value.myReview;
          });
          return next;
        });
      } finally {
        if (!alive) return;
        setReviewEligLoading((prev) => {
          const next = { ...prev };
          uniq.forEach((pid) => (next[pid] = false));
          return next;
        });
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?._id, order?.status]);

  const resetSelectionAndQty = () => {
    const initSelected = {};
    const initQty = {};
    for (const it of order?.items || []) {
      const pid = pidOf(it);
      initSelected[pid] = false;
      initQty[pid] = 1;
    }
    setSelected(initSelected);
    setQtyMap(initQty);
  };

  useEffect(() => {
    if (!order?.items?.length) return;
    resetSelectionAndQty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?._id]);

  // ---- Status helpers ----
  const status = useMemo(
    () => String(order?.status || "").toUpperCase(),
    [order],
  );
  const isCancelled = status === "CANCELLED";
  const canRR = status === "DELIVERED";
  const canCancel = ["PLACED", "CONFIRMED"].includes(status);

  const rrStatus = useMemo(
    () => String(order?.returnRequest?.status || "NONE").toUpperCase(),
    [order],
  );

  const rrType = useMemo(
    () => String(order?.returnRequest?.type || "NONE").toUpperCase(),
    [order],
  );

  const canCancelRR = canRR && rrStatus === "REQUESTED";

  // ---- RR window: only within 7 days from delivered ----
  const deliveredAt = useMemo(() => {
    // use whichever you store in backend (keep multiple fallbacks)
    const v =
      order?.deliveredAt ||
      order?.deliveredOn ||
      order?.deliveredDate ||
      order?.statusTimeline?.deliveredAt ||
      order?.updatedAt; // fallback if you don't store deliveredAt yet
    return v ? new Date(v) : null;
  }, [order]);

  const rrExpiresAt = useMemo(() => {
    if (!deliveredAt) return null;
    const d = new Date(deliveredAt.getTime());
    d.setDate(d.getDate() + 7); // +7 days
    return d;
  }, [deliveredAt]);

  const isWithinRrWindow = useMemo(() => {
    if (!deliveredAt || !rrExpiresAt) return false;
    return Date.now() <= rrExpiresAt.getTime();
  }, [deliveredAt, rrExpiresAt]);

  // ✅ final RR permission
  const canRRNow = canRR && isWithinRrWindow;
  const canCancelRRNow = canRRNow && rrStatus === "REQUESTED";

  useEffect(() => {
    if (!canRR || !isWithinRrWindow) setRrMode(false);
  }, [canRR, isWithinRrWindow]);

  // ---- Payment helpers ----
  const orderStatusUpper = useMemo(
    () => String(order?.status || "").toUpperCase(),
    [order],
  );

  const payStatus = useMemo(
    () => String(order?.payment?.status || "").toUpperCase(),
    [order],
  );

  const payMethod = useMemo(
    () => String(order?.payment?.method || "").toUpperCase(),
    [order],
  );

  const isOnlinePay = useMemo(() => payMethod === "RAZORPAY", [payMethod]);

  const replacementId = useMemo(() => {
    const v = order?.replacementOrderId;
    return v?._id || v || "";
  }, [order]);

  const parentId = useMemo(() => {
    const v = order?.parentOrderId;
    return v?._id || v || "";
  }, [order]);

  const getPaidQty = (it) => Math.max(0, Number(it?.qty ?? 0)); // original qty user paid for
  const getMoneyZeroQty = (it) => {
    // qty that should reduce paid display (only money-refund events)
    // cancellation + return reduce paid; replacement does NOT
    const cancelledQty = Number(it?.cancelledQty || 0);
    const returnedQty = Number(it?.returnedQty || 0);
    return Math.max(0, cancelledQty + returnedQty);
  };

  // ---- Qty helpers (single source of truth) ----
  const getActiveQty = (it) => {
    const qty = Number(it?.qty ?? 0);
    const cancelledQty = Number(it?.cancelledQty || 0);
    const returnedQty = Number(it?.returnedQty || 0);
    const replacedQty = Number(it?.replacedQty || 0);
    return Math.max(0, qty - cancelledQty - returnedQty - replacedQty);
  };

  // ✅ qty that still counts as "money paid" (replacement does NOT reduce it)
  const getMoneyActiveQty = (it) => {
    const qty = Number(it?.qty ?? 0);
    const cancelledQty = Number(it?.cancelledQty || 0);
    const returnedQty = Number(it?.returnedQty || 0);
    return Math.max(0, qty - cancelledQty - returnedQty);
  };

  const getRefundedQty = (it) => {
    // refund-worthy qty in your UI means: cancelled + returned
    // replacement is NOT money-refund (it is exchange), so keep it separate
    const cancelledQty = Number(it?.cancelledQty || 0);
    const returnedQty = Number(it?.returnedQty || 0);
    return Math.max(0, cancelledQty + returnedQty);
  };

  // ---- Totals ----
  const originalTotal = useMemo(() => {
    if (!order) return 0;
    return (order.items || []).reduce((sum, it) => {
      const qty = Number(it?.qty ?? 1);
      const strike = Number(it?.strikeSnapshot ?? it?.priceSnapshot ?? 0);
      return sum + strike * qty;
    }, 0);
  }, [order]);

  const paidTotal = useMemo(() => {
    if (!order) return 0;
    return (order.items || []).reduce((sum, it) => {
      const qty = Number(it?.qty ?? 1);
      const unit = Number(it?.priceSnapshot ?? 0);
      return sum + unit * qty;
    }, 0);
  }, [order]);

  const totalDiscount = useMemo(() => {
    return Math.max(0, Number(originalTotal || 0) - Number(paidTotal || 0));
  }, [originalTotal, paidTotal]);

  const activeTotal = useMemo(() => {
    if (!order) return 0;
    return (order.items || []).reduce((sum, it) => {
      const unit = Number(it?.priceSnapshot ?? 0);
      const activeQty = getActiveQty(it);
      return sum + unit * activeQty;
    }, 0);
  }, [order]);

  // ✅ Money net total: cancel/return reduce, replacement does NOT
  const moneyNetTotal = useMemo(() => {
    if (!order) return 0;
    return (order.items || []).reduce((sum, it) => {
      const unit = Number(it?.priceSnapshot ?? 0);
      const moneyQty = getMoneyActiveQty(it);
      return sum + unit * moneyQty;
    }, 0);
  }, [order]);

  const refundTotal = useMemo(() => {
    // refund only based on cancelled + returned
    if (!order) return 0;
    return (order.items || []).reduce((sum, it) => {
      const unit = Number(it?.priceSnapshot ?? 0);
      const refundedQty = getRefundedQty(it);
      return sum + unit * refundedQty;
    }, 0);
  }, [order]);

  // ✅ only show refund when online pay AND not FAILED
  // ✅ show refund amount ONLY when payment is PAID (online)
  const canShowRefund = useMemo(() => {
    if (!order) return false;
    if (payStatus !== "PAID") return false; // ✅ only paid orders show refund
    return refundTotal > 0; // ✅ only if refund exists
  }, [order, payStatus, refundTotal]);

  // ✅ refund note based on method
  const refundNote = useMemo(() => {
    if (!canShowRefund) return "";

    if (payMethod === "RAZORPAY") {
      return "Refund will be processed to the same card / payment method you used to pay within 7 working days.";
    }

    if (payMethod === "COD") {
      return "Money will be handed in person when you return the product.";
    }

    return "";
  }, [canShowRefund, payMethod]);

  const paymentStatusLabel = useMemo(() => {
    if (!order) return "N/A";
    if (payStatus === "REFUNDED") return "REFUNDED";
    if (payStatus === "PAID") return "PAID";
    if (payStatus === "FAILED") return "FAILED";
    return order.payment?.status || "N/A";
  }, [order, payStatus]);

  const payableDisplay = useMemo(() => {
    if (!order) return 0;
    if (orderStatusUpper === "CANCELLED") return 0;
    if (orderStatusUpper === "DELIVERED") return 0; // ✅ extra safety
    if (payStatus === "PAID") return 0;

    return (order.items || []).reduce((sum, it) => {
      const unit = Number(it?.priceSnapshot ?? 0);
      const activeQty = getActiveQty(it);
      return sum + unit * activeQty;
    }, 0);
  }, [order, orderStatusUpper, payStatus]);

  const displayStatus = useMemo(() => {
    if (!order) return "";
    if (rrStatus === "REQUESTED") {
      return rrType === "RETURN" ? "RETURN REQUESTED" : "REPLACEMENT REQUESTED";
    }
    if (rrStatus === "APPROVED") {
      return rrType === "RETURN"
        ? "ADMIN APPROVED RETURN"
        : "ADMIN APPROVED REPLACEMENT";
    }
    if (rrStatus === "REJECTED") {
      return rrType === "RETURN"
        ? "RETURN REQUEST REJECTED"
        : "REPLACEMENT REQUEST REJECTED";
    }
    return order.status;
  }, [order, rrStatus, rrType]);

  const addr = useMemo(() => order?.shippingAddress || {}, [order]);

  const selectedForCancelCount = useMemo(() => {
    if (!canCancel) return 0;
    return (order?.items || []).reduce((count, it) => {
      const pid = pidOf(it);

      const qty = Number(it?.qty ?? 1);
      const cancelledQty = Number(it?.cancelledQty || 0);
      const eligibleCancelQty = Math.max(0, qty - cancelledQty);

      // if item completely inactive (due to cancel/return/replace) don't count it
      const activeQty = getActiveQty(it);
      if (activeQty === 0) return count;

      const picked = !!selected[pid];
      const pickedQty = Number(qtyMap[pid] || 1);

      if (picked && eligibleCancelQty > 0 && pickedQty > 0) return count + 1;
      return count;
    }, 0);
  }, [canCancel, order, selected, qtyMap]);

  if (!order) {
    return (
      <div className="text-slate-200">
        Loading...
        {err && <div className="mt-3 text-sm text-rose-300">{err}</div>}
      </div>
    );
  }

  // ---- Actions ----
  const togglePartialCancelMode = () => {
    setMsg("");
    setErr("");
    setPartialCancelMode((prev) => {
      const next = !prev;
      setRrMode(false);
      setReason("");
      setType("RETURN");
      resetSelectionAndQty();
      return next;
    });
  };

  const toggleRrMode = () => {
    setMsg("");
    setErr("");
    setRrMode((prev) => {
      const next = !prev;
      setPartialCancelMode(false);
      if (!next) {
        setReason("");
        setType("RETURN");
      }
      resetSelectionAndQty();
      return next;
    });
  };

  const doCancel = async () => {
    setMsg("");
    setErr("");
    if (!canCancel) return;

    const ok = window.confirm("Are you sure you want to cancel this order?");
    if (!ok) return;

    const tid = `cancel-${id}`;
    toast.loading("Cancelling order…", { toastId: tid });

    try {
      setCancelLoading(true);
      await cancelOrder(id, { reason: cancelReason });

      setMsg("Order cancelled successfully.");
      setCancelReason("");

      toast.update(tid, {
        render: "✅ Order cancelled successfully.",
        type: "success",
        isLoading: false,
        autoClose: 1600,
      });

      await load({ silent: true });
    } catch (e) {
      const message = e?.response?.data?.message || "Cancel failed";
      setErr(message);

      toast.update(tid, {
        render: `❌ ${message}`,
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const doPartialCancel = async () => {
    setMsg("");
    setErr("");
    if (!canCancel) return;

    const items = (order.items || [])
      .map((it) => {
        const pid = pidOf(it);
        if (!selected[pid]) return null;

        const qty = Number(it?.qty ?? 1);
        const cancelledQty = Number(it?.cancelledQty || 0);

        // can't cancel if already fully inactive (return/replace/cancel)
        const activeQty = getActiveQty(it);
        if (activeQty === 0) return null;

        const eligibleCancelQty = Math.max(0, qty - cancelledQty);
        const q = Math.min(Number(qtyMap[pid] || 1), eligibleCancelQty);
        if (q <= 0) return null;

        return { productId: pid, qty: q };
      })
      .filter(Boolean);

    if (!items.length) {
      const message = "Select at least 1 item and quantity to cancel.";
      setErr(message);
      toast.error(`❌ ${message}`, { toastId: `pc-err-${id}` });
      return;
    }

    const tid = `partial-cancel-${id}`;
    toast.loading("Cancelling selected items…", { toastId: tid });

    try {
      await cancelItems(id, { items, reason: cancelReason });

      setMsg("Selected items cancelled.");
      setCancelReason("");
      setPartialCancelMode(false);

      toast.update(tid, {
        render: "✅ Selected items cancelled.",
        type: "success",
        isLoading: false,
        autoClose: 1600,
      });

      await load({ silent: true });
    } catch (e) {
      const message = e?.response?.data?.message || "Partial cancel failed";
      setErr(message);

      toast.update(tid, {
        render: `❌ ${message}`,
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
    }
  };

  const submitRR = async () => {
    setMsg("");
    setErr("");

    const items = (order.items || [])
      .map((it) => {
        const pid = pidOf(it);
        if (!selected[pid]) return null;

        const eligibleRRQty = Math.max(0, getActiveQty(it)); // ✅ same eligibility
        const q = Math.min(Number(qtyMap[pid] || 1), eligibleRRQty);
        if (q <= 0) return null;

        return { productId: pid, qty: q };
      })
      .filter(Boolean);

    if (!items.length) {
      const message =
        "Select at least 1 item and quantity for Return/Replacement.";
      setErr(message);
      toast.error(`❌ ${message}`, { toastId: `rr-err-${id}` });
      return;
    }

    if (!reason.trim()) {
      const message = "Please enter a reason for Return/Replacement.";
      setErr(message);
      toast.error(`❌ ${message}`, { toastId: `rr-reason-${id}` });
      return;
    }

    const tid = `rr-${id}`;
    toast.loading("Submitting return/replacement request…", { toastId: tid });

    try {
      await requestRR(id, { type, reason, items });

      setMsg("Return/Replacement request submitted.");
      setReason("");
      setRrMode(false);

      toast.update(tid, {
        render: "✅ Return/Replacement request submitted.",
        type: "success",
        isLoading: false,
        autoClose: 1600,
      });

      await load({ silent: true });
    } catch (e) {
      const message = e?.response?.data?.message || "RR request failed";
      setErr(message);

      toast.update(tid, {
        render: `❌ ${message}`,
        type: "error",
        isLoading: false,
        autoClose: 2200,
      });
    }
  };

  const cancelRRRequest = async () => {
    setMsg("");
    setErr("");

    const ok = window.confirm("Cancel your return/replacement request?");
    if (!ok) return;

    const tid = `cancel-rr-${id}`;
    toast.loading("Cancelling RR request…", { toastId: tid });

    try {
      await cancelRR(id);

      setMsg("Return/Replacement request cancelled.");

      toast.update(tid, {
        render: "✅ Return/Replacement request cancelled.",
        type: "success",
        isLoading: false,
        autoClose: 1600,
      });

      await load({ silent: true });
    } catch (e) {
      const message =
        e?.response?.data?.message || "Failed to cancel RR request";
      setErr(message);

      toast.update(tid, {
        render: `❌ ${message}`,
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
    }
  };

  const handleDeleteReview = async (productId) => {
    const ok = window.confirm("Delete your review? This cannot be undone.");
    if (!ok) return;

    const tid = `del-review-${productId}`;
    toast.loading("Deleting review…", { toastId: tid });

    try {
      setReviewActionLoading((p) => ({ ...p, [productId]: true }));
      await deleteMyReview(productId);

      // update UI instantly
      setMyReviewMap((m) => ({ ...m, [productId]: null }));

      // also refresh eligibility: now user should be able to write again
      const elig = await canReviewProduct(productId);
      setReviewElig((e) => ({
        ...e,
        [productId]: {
          canReview: !!elig.data?.canReview,
          reason: elig.data?.reason || "",
        },
      }));

      toast.update(tid, {
        render: "✅ Review deleted",
        type: "success",
        isLoading: false,
        autoClose: 1400,
      });
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to delete review";
      toast.update(tid, {
        render: `❌ ${msg}`,
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
    } finally {
      setReviewActionLoading((p) => ({ ...p, [productId]: false }));
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)] opacity-0 translate-y-2 animate-[pageIn_450ms_ease-out_forwards]">
      <style>{`
      @keyframes pageIn {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes itemIn {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes popIn {
        from { opacity: 0; transform: translateY(-6px) scale(0.98); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
    `}</style>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Order Details
          </h2>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-400">Status:</span>

            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                rrStatus === "REQUESTED"
                  ? "bg-amber-500/10 text-amber-300"
                  : rrStatus === "APPROVED"
                    ? "bg-indigo-500/10 text-indigo-300"
                    : rrStatus === "REJECTED"
                      ? "bg-rose-500/10 text-rose-300"
                      : "bg-emerald-500/10 text-emerald-300"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
              {displayStatus}
            </span>

            <span className="text-slate-500">•</span>
            <span className="text-slate-400">
              Placed:{" "}
              <span className="font-semibold text-slate-200">
                {new Date(order.createdAt).toLocaleString()}
              </span>
            </span>
          </div>
        </div>

        <div className="text-sm text-slate-400">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
            <div className="text-xs uppercase tracking-widest text-slate-500">
              Order ID
            </div>

            <div className="mt-1 font-mono text-base font-bold text-slate-200">
              {String(order._id).slice(-6).toUpperCase()}
              {replacementId && (
                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
                  <div className="text-xs uppercase tracking-widest text-slate-500">
                    Replacement Order
                  </div>
                  <Link
                    to={`/orders/${replacementId}`}
                    className="mt-1 inline-block font-mono text-sm font-bold text-indigo-300 hover:text-indigo-200"
                  >
                    View • {String(replacementId).slice(-6).toUpperCase()}
                  </Link>
                </div>
              )}

              {/* If THIS order is a replacement, also show parent link */}
              {order?.isReplacement && parentId && (
                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
                  <div className="text-xs uppercase tracking-widest text-slate-500">
                    Original Order
                  </div>
                  <Link
                    to={`/orders/${parentId}`}
                    className="mt-1 inline-block font-mono text-sm font-bold text-indigo-300 hover:text-indigo-200"
                  >
                    View • {String(parentId).slice(-6).toUpperCase()}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {msg && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 opacity-0 animate-[popIn_260ms_ease-out_forwards]">
          {msg}
        </div>
      )}

      {err && (
        <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 opacity-0 animate-[popIn_260ms_ease-out_forwards]">
          {err}
        </div>
      )}

      {/* Payment Details */}
      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-white">
            Payment Details
          </h3>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
              payStatus === "PAID"
                ? "bg-emerald-500/10 text-emerald-300"
                : payStatus === "REFUNDED"
                  ? "bg-indigo-500/10 text-indigo-300"
                  : payStatus === "FAILED"
                    ? "bg-rose-500/10 text-rose-300"
                    : payStatus === "PENDING"
                      ? "bg-amber-500/10 text-amber-300"
                      : "bg-slate-800 text-slate-300"
            }`}
          >
            {paymentStatusLabel}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-center">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-xs uppercase tracking-widest text-slate-500">
              Method
            </div>
            <div className="mt-1 font-semibold text-slate-200">
              {order.payment?.method || "N/A"}
            </div>
          </div>

          {/* ✅ Transaction ID (Payment ID) */}
          {!!order?.payment?.txnId && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs uppercase tracking-widest text-slate-500">
                Transaction ID
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-indigo-300 break-all">
                {order.payment.txnId}
              </div>
            </div>
          )}

          {/* ✅ Razorpay Order ID (optional but useful) */}
          {!!order?.razorpay?.orderId && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs uppercase tracking-widest text-slate-500">
                Razorpay Order ID
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-slate-200 break-all">
                {order.razorpay.orderId}
              </div>
            </div>
          )}
        </div>

        {canShowRefund && (
          <div className="mt-4">
            <div className="text-xs text-indigo-200">
              Refund Amount:{" "}
              <span className="font-bold">{fmt(refundTotal)}</span>
            </div>

            {!!refundNote && (
              <div className="mt-2 text-xs text-slate-400">
                Note: {refundNote}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Address */}
      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
        <h3 className="text-sm font-black uppercase tracking-widest text-white">
          Delivery Address
        </h3>

        <div className="mt-3 text-sm leading-6 text-slate-300">
          {addr?.name || addr?.addressLine1 || addr?.city || addr?.phone ? (
            <>
              {addr?.name && (
                <div className="font-bold text-slate-100">{addr.name}</div>
              )}
              {addr?.addressLine1 && <div>{addr.addressLine1}</div>}
              {(addr?.city || addr?.state || addr?.pincode) && (
                <div>
                  {[addr?.city, addr?.state].filter(Boolean).join(", ")}
                  {addr?.pincode ? ` - ${addr.pincode}` : ""}
                </div>
              )}
              {addr?.phone && (
                <div className="text-slate-400">
                  Phone:{" "}
                  <span className="font-semibold text-slate-200">
                    {addr.phone}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="text-slate-400">Address not found.</div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-white">
            Items
          </h3>

          {(partialCancelMode || rrMode) && (
            <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">
              {partialCancelMode
                ? "Partial Cancel Mode"
                : "Return/Replace Mode"}
            </span>
          )}
        </div>

        <div key={animKey} className="mt-4 space-y-3">
          {(order.items || []).map((it, i) => {
            const pid = pidOf(it);
            const title = it?.titleSnapshot || "Item";
            const qty = Number(it?.qty ?? 1);

            const unit = Number(it?.priceSnapshot ?? 0);
            const strike = Number(it?.strikeSnapshot ?? 0);
            const off = pctOff(strike, unit);

            const cancelledQty = Number(it?.cancelledQty || 0);
            const returnedQty = Number(it?.returnedQty || 0);
            const replacedQty = Number(it?.replacedQty || 0);

            const activeQty = getActiveQty(it);
            const paidQty = getPaidQty(it);
            const paidLineTotal = unit * paidQty;
            const moneyZeroQty = getMoneyZeroQty(it);
            const lineTotal = unit * activeQty;
            const lineStrikeTotal = strike * activeQty;
            const lineDisc = Math.max(0, lineStrikeTotal - lineTotal);

            const isFullyInactiveItem =
              activeQty === 0 &&
              (cancelledQty > 0 || returnedQty > 0 || replacedQty > 0);

            const isPartiallyCancelledItem = cancelledQty > 0 && activeQty > 0;
            const isPartiallyReturnedItem = returnedQty > 0 && activeQty > 0;
            const isPartiallyReplacedItem = replacedQty > 0 && activeQty > 0;

            const eligibleCancelQty = Math.max(0, qty - cancelledQty);
            const eligibleRRQty = Math.max(0, activeQty);

            const eligible = partialCancelMode
              ? eligibleCancelQty
              : rrMode
                ? eligibleRRQty
                : 0;

            const hidePickArea = activeQty === 0;

            const showPickUI =
              !hidePickArea &&
              ((canCancel && !isCancelled && partialCancelMode) ||
                (canRRNow && !isCancelled && rrStatus === "NONE" && rrMode));

            const showEligibleText =
              !hidePickArea &&
              ((canCancel && partialCancelMode) ||
                (canRRNow && rrStatus === "NONE" && rrMode));

            const refundItemAmount = unit * getRefundedQty(it);

            const typeSnap = String(it?.typeSnapshot || "SINGLE").toUpperCase();
            const isBundle = typeSnap === "BUNDLE";

            // ✅ Safe slug fallback (VERY IMPORTANT)
            const bundleSlug =
              it?.slugSnapshot ||
              it?.productSlugSnapshot ||
              it?.productId?.slug ||
              "";

            return (
              <div
                key={pid}
                style={loadedOnce ? animDelay(i) : undefined}
                className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 opacity-0 translate-y-2 animate-[itemIn_420ms_ease-out_forwards]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className={`truncate text-base font-bold ${
                          isFullyInactiveItem
                            ? "line-through text-slate-500"
                            : "text-slate-100"
                        }`}
                      >
                        {title}
                      </div>

                      {isBundle && (
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200">
                          BUNDLE
                        </span>
                      )}

                      {off > 0 && (
                        <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">
                          {off}% OFF
                        </span>
                      )}

                      {isPartiallyCancelledItem && (
                        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
                          Partially cancelled
                        </span>
                      )}

                      {isPartiallyReturnedItem && (
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                          Partially returned
                        </span>
                      )}

                      {isPartiallyReplacedItem && (
                        <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-300">
                          Partially replaced
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-sm text-slate-300">
                      Qty:{" "}
                      <span className="font-semibold text-slate-100">
                        {qty}
                      </span>
                      {(cancelledQty > 0 ||
                        returnedQty > 0 ||
                        replacedQty > 0) && (
                        <span className="ml-2 text-xs text-slate-500">
                          (Cancelled: {cancelledQty}, Returned: {returnedQty},
                          Replaced: {replacedQty}, Active: {activeQty})
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-sm text-slate-400">
                      Unit:{" "}
                      <span className="font-semibold text-slate-200">
                        {fmt(unit)}
                      </span>
                      {strike > unit && (
                        <span className="ml-2 text-xs text-slate-500 line-through">
                          {fmt(strike)}
                        </span>
                      )}
                    </div>

                    {/* hide per-item refund if FAILED */}
                    {canShowRefund && refundItemAmount > 0 && (
                      <div className="mt-2 text-xs font-semibold text-indigo-300">
                        Refund: {fmt(refundItemAmount)}
                      </div>
                    )}

                    {/* ✅ Write Review (only after delivered) */}
                    {/* ✅ Review Buttons */}
                    {status === "DELIVERED" && activeQty > 0 && (
                      <div className="mt-3 space-y-2">
                        {/* SINGLE PRODUCT */}
                        {!isBundle ? (
                          <div className="flex flex-wrap gap-2">
                            {reviewEligLoading[pid] ? (
                              <div className="text-xs text-slate-500">
                                Checking review...
                              </div>
                            ) : myReviewMap[pid]?._id ? (
                              <>
                                <Link
                                  to={`/my-review/${pid}`}
                                  className="inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-2 text-xs font-bold text-slate-200 hover:border-indigo-500/40"
                                >
                                  View Review
                                </Link>

                                <Link
                                  to={`/review/${pid}?mode=edit`}
                                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                                >
                                  Edit Review
                                </Link>

                                <button
                                  onClick={() => handleDeleteReview(pid)}
                                  disabled={!!reviewActionLoading[pid]}
                                  className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-60"
                                >
                                  {reviewActionLoading[pid]
                                    ? "Deleting..."
                                    : "Delete Review"}
                                </button>
                              </>
                            ) : reviewElig[pid]?.canReview ? (
                              <Link
                                to={`/review/${pid}`}
                                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                              >
                                Write Review
                              </Link>
                            ) : null}
                          </div>
                        ) : (
                          /* ✅ BUNDLE PRODUCT: redirect to bundle reviews page */
                          <div className="mt-3">
                            <Link
                              to={
                                bundleSlug
                                  ? `/product/${bundleSlug}/reviews`
                                  : "#"
                              }
                              onClick={(e) => {
                                if (!bundleSlug) {
                                  e.preventDefault();
                                  toast.error(
                                    "Bundle slug missing in order snapshot.",
                                  );
                                }
                              }}
                              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                            >
                              View / Write Reviews
                            </Link>

                            <p className="mt-2 text-xs text-slate-500">
                              Bundle reviews are managed per item inside this
                              combo page.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    {showPickUI && (
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                          <input
                            type="checkbox"
                            checked={!!selected[pid]}
                            disabled={eligible <= 0}
                            onChange={(e) =>
                              setSelected((s) => ({
                                ...s,
                                [pid]: e.target.checked,
                              }))
                            }
                            className="h-4 w-4 accent-indigo-500"
                          />
                          Select
                        </label>

                        <input
                          type="number"
                          min={1}
                          max={eligible}
                          value={qtyMap[pid] || 1}
                          disabled={!selected[pid] || eligible <= 0}
                          onChange={(e) => {
                            const raw = Number(e.target.value || 1);
                            const clamped = Math.min(
                              Math.max(1, raw),
                              eligible,
                            );
                            setQtyMap((m) => ({ ...m, [pid]: clamped }));
                          }}
                          className="w-20 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-right text-sm font-bold text-slate-100 outline-none focus:border-indigo-500/70"
                        />
                      </div>
                    )}

                    {showEligibleText && (
                      <span className="text-xs text-slate-500">
                        Eligible:{" "}
                        <span className="font-semibold text-slate-300">
                          {eligible}
                        </span>
                      </span>
                    )}

                    <div className="text-right">
                      <div className="text-xs uppercase tracking-widest text-slate-500">
                        {replacedQty > 0 &&
                        activeQty === 0 &&
                        moneyZeroQty === 0
                          ? "Paid amount"
                          : "Line total"}
                      </div>

                      {(() => {
                        const showPaidBecauseReplaced =
                          replacedQty > 0 &&
                          activeQty === 0 &&
                          moneyZeroQty === 0;

                        const showZeroBecauseRefunded =
                          activeQty === 0 && moneyZeroQty > 0;

                        const displayLineTotal = showPaidBecauseReplaced
                          ? paidLineTotal
                          : showZeroBecauseRefunded
                            ? 0
                            : lineTotal;

                        return (
                          <>
                            <div className="mt-1 text-lg font-black text-white">
                              {fmt(displayLineTotal)}
                            </div>

                            {!showPaidBecauseReplaced &&
                              strike > unit &&
                              activeQty > 0 && (
                                <div className="mt-1 text-xs text-slate-500">
                                  <span className="line-through">
                                    {fmt(lineStrikeTotal)}
                                  </span>
                                  <span className="ml-2 text-emerald-300 font-bold">
                                    -{fmt(lineDisc)}
                                  </span>
                                </div>
                              )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
          <div className="flex justify-between text-sm text-slate-300">
            <span className="text-slate-400">Original Total</span>
            <span className="font-bold text-slate-100">
              {fmt(originalTotal)}
            </span>
          </div>

          <div className="flex justify-between text-sm text-emerald-300">
            <span>You Saved</span>
            <span className="font-bold">-{fmt(totalDiscount)}</span>
          </div>

          {canShowRefund && (
            <div className="flex justify-between text-sm text-indigo-300">
              <span>Refund Amount</span>
              <span className="font-bold">{fmt(refundTotal)}</span>
            </div>
          )}

          {canShowRefund && !!refundNote && (
            <div className="text-xs text-slate-500">Note: {refundNote}</div>
          )}

          <div className="flex justify-between text-sm text-slate-300">
            <span className="text-slate-400">
              {payStatus === "PAID"
                ? "Net Paid (after cancel/return/replacement)"
                : "Net Payable"}
            </span>
            <span className="font-bold text-slate-100">
              {fmt(payStatus === "PAID" ? moneyNetTotal : activeTotal)}
            </span>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-800 flex justify-between items-baseline">
            <span className="text-sm font-black uppercase tracking-widest text-slate-300">
              Payable Total
            </span>
            <span className="text-xl font-black text-white">
              {fmt(payableDisplay)}
            </span>
          </div>

          {isOnlinePay && payStatus === "PAID" && (
            <div className="text-xs text-slate-500">
              You already paid online. Any cancelled/returned amount is shown as
              refund. Replacements are shown separately (no refund).
            </div>
          )}
        </div>
      </div>

      {/* Actions: Cancel */}
      {canCancel && !isCancelled && (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
          <h3 className="text-sm font-black uppercase tracking-widest text-white">
            Cancel Order
          </h3>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Cancel reason (optional)"
              className="flex-1 rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500/70"
              disabled={cancelLoading}
            />

            {!partialCancelMode && (
              <button
                disabled={cancelLoading || rrMode}
                onClick={togglePartialCancelMode}
                className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 disabled:opacity-60"
              >
                Cancel partial items
              </button>
            )}

            {partialCancelMode && (
              <>
                <button
                  disabled={cancelLoading}
                  onClick={togglePartialCancelMode}
                  className="rounded-2xl border border-slate-700 bg-slate-950/40 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900 disabled:opacity-60"
                >
                  Close
                </button>

                <button
                  disabled={cancelLoading || selectedForCancelCount === 0}
                  onClick={doPartialCancel}
                  className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 disabled:opacity-60"
                >
                  Cancel selected items
                </button>
              </>
            )}

            <button
              disabled={cancelLoading || rrMode}
              onClick={doCancel}
              className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-rose-500/10 hover:bg-rose-500 disabled:opacity-60"
            >
              {cancelLoading ? "Cancelling..." : "Cancel Order"}
            </button>
          </div>
        </div>
      )}

      {/* Actions: Return/Replacement */}
      {/* Actions: Return/Replacement */}
      {canRR && !isCancelled && (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
          <h3 className="text-sm font-black uppercase tracking-widest text-white">
            Return / Replacement
          </h3>

          {/* show message when delivered but window expired */}
          {!isWithinRrWindow && (
            <div className="mt-3 text-sm text-slate-400">
              Return/Replacement window closed (7 days after delivery).
            </div>
          )}

          {/* only allow RR UI within window */}
          {isWithinRrWindow && (
            <>
              {rrStatus !== "NONE" && (
                <div className="mt-3 text-sm text-slate-300">
                  RR Status:{" "}
                  <span className="font-bold text-slate-100">{rrStatus}</span>{" "}
                  {rrType !== "NONE" ? (
                    <span className="text-slate-500">({rrType})</span>
                  ) : null}
                  {canCancelRRNow && (
                    <div className="mt-4">
                      <button
                        onClick={cancelRRRequest}
                        className="rounded-2xl border border-slate-700 bg-slate-950/40 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900"
                      >
                        Cancel RR Request
                      </button>
                    </div>
                  )}
                </div>
              )}

              {rrStatus === "NONE" && (
                <div className="mt-4">
                  {!rrMode && (
                    <button
                      disabled={partialCancelMode}
                      onClick={toggleRrMode}
                      className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-rose-500/10 hover:bg-rose-500 disabled:opacity-60"
                    >
                      Return / Replacement
                    </button>
                  )}

                  {rrMode && (
                    <>
                      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
                        <select
                          value={type}
                          onChange={(e) => setType(e.target.value)}
                          className="rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-sm font-bold text-slate-100 outline-none focus:border-indigo-500/70 md:w-56"
                        >
                          <option value="RETURN">RETURN</option>
                          <option value="REPLACEMENT">REPLACEMENT</option>
                        </select>

                        <input
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Reason (e.g., damaged, wrong item)"
                          className="flex-1 rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500/70"
                        />

                        <button
                          onClick={toggleRrMode}
                          className="rounded-2xl border border-slate-700 bg-slate-950/40 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900"
                        >
                          Close
                        </button>

                        <button
                          disabled={!reason.trim()}
                          onClick={submitRR}
                          className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-rose-500/10 hover:bg-rose-500 disabled:opacity-60"
                        >
                          Request
                        </button>
                      </div>

                      <p className="mt-3 text-xs text-slate-500">
                        Select eligible items from the list above and choose
                        quantity.
                      </p>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
