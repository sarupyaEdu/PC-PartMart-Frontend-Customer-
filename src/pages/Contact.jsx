import { useEffect, useMemo, useState } from "react";
import { Mail, Phone, MapPin, Send, Ticket } from "lucide-react";
import { myOrders } from "../api/orders";
import { createTicket } from "../api/support";
import { Link } from "react-router-dom";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

const fmtOrderShort = (id) =>
  String(id || "")
    .slice(-6)
    .toUpperCase();

export default function Contact() {
  const [form, setForm] = useState({
    subject: "",
    category: "general",
    priority: "medium",
    message: "",
  });

  // Orders (for category=order)
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersErr, setOrdersErr] = useState("");

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(""); // ✅ orderItemId (Product _id)

  const [status, setStatus] = useState({ type: "", msg: "" });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (k) => (e) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  // Load orders only when category=order
  useEffect(() => {
    if (form.category !== "order") return;

    setOrdersLoading(true);
    setOrdersErr("");

    (async () => {
      try {
        const res = await myOrders();
        const list = res.data?.orders || res.data || [];
        setOrders(Array.isArray(list) ? list : []);
      } catch (e) {
        setOrdersErr(
          e?.response?.data?.message || "Failed to load your orders",
        );
        setOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    })();
  }, [form.category]);

  // Reset order fields when leaving order category
  useEffect(() => {
    if (form.category !== "order") {
      setSelectedOrderId("");
      setSelectedProductId("");
    }
  }, [form.category]);

  const selectedOrder = useMemo(
    () => orders.find((o) => String(o?._id) === String(selectedOrderId)),
    [orders, selectedOrderId],
  );

  const orderItems = useMemo(() => {
    const arr = Array.isArray(selectedOrder?.items) ? selectedOrder.items : [];
    return arr;
  }, [selectedOrder]);

  // Build dropdown options (productId + title snapshot)
  const itemOptions = useMemo(() => {
    return orderItems
      .map((it) => {
        const productId =
          it?.productId?._id || it?.productId?.id || it?.productId || "";
        const title =
          it?.titleSnapshot ||
          it?.productId?.title ||
          it?.productId?.name ||
          "Item";
        const qty = Number(it?.qty || 0);
        return {
          productId: String(productId || ""),
          title: String(title || ""),
          qty,
        };
      })
      .filter((x) => x.productId); // only items that have productId
  }, [orderItems]);

  const selectedItemSnapshot = useMemo(() => {
    if (!selectedProductId) return { productId: "", title: "" };
    const found = itemOptions.find((x) => x.productId === selectedProductId);
    return found || { productId: selectedProductId, title: "" };
  }, [itemOptions, selectedProductId]);

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", msg: "" });

    if (!form.message.trim()) {
      setStatus({ type: "error", msg: "Please write your message." });
      return;
    }

    if (!form.subject.trim()) {
      setStatus({ type: "error", msg: "Please enter a subject." });
      return;
    }

    // If category is order: must select order (item optional)
    if (form.category === "order" && !selectedOrderId) {
      setStatus({ type: "error", msg: "Please select an order." });
      return;
    }

    const payload = {
      subject: form.subject.trim(),
      category: form.category,
      priority: form.priority,
      message: form.message.trim(),

      // only attach order context when category=order
      orderId: form.category === "order" ? selectedOrderId : null,
      orderItemId:
        form.category === "order" && selectedProductId
          ? selectedProductId
          : null,
      orderItemTitleSnapshot:
        form.category === "order" && selectedProductId
          ? selectedItemSnapshot.title || ""
          : "",
    };

    try {
      setSubmitting(true);
      await createTicket(payload);

      setStatus({
        type: "ok",
        msg: "Ticket created! Our team will reply soon.",
      });

      setForm({
        subject: "",
        category: "general",
        priority: "medium",
        message: "",
      });
      setSelectedOrderId("");
      setSelectedProductId("");
    } catch (e2) {
      setStatus({
        type: "error",
        msg:
          e2?.response?.data?.message ||
          e2?.message ||
          "Failed to create ticket",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-var(--nav-h))] bg-gradient-to-b from-[#020617] via-[#020b1f] to-[#020617] text-white relative">
      {/* BG */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
      <div className="pointer-events-none absolute top-[10%] left-1/4 h-[520px] w-[520px] rounded-full bg-cyan-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[12%] right-1/4 h-[620px] w-[620px] rounded-full bg-purple-600/10 blur-[150px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              Contact <span className="text-cyan-400">Support</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-slate-400">
              Compatibility, orders, returns, or bulk pricing — create a support
              ticket.
            </p>
          </div>

          <Link
            to="/support"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl
               border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm font-black
               text-slate-200 hover:bg-slate-950/70 hover:text-white transition"
          >
            <Ticket className="h-4 w-4 text-cyan-300" />
            My Tickets
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Info */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/35 backdrop-blur-xl p-6 lg:col-span-1">
            <h2 className="text-lg font-black">Support Channels</h2>

            <div className="mt-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-2 text-cyan-300">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">Email</div>
                  <div className="text-sm text-slate-400">
                    support@pcpartmart.com
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-2 text-cyan-300">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">Phone</div>
                  <div className="text-sm text-slate-400">+91-XXXXXXXXXX</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-2 text-cyan-300">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">Location</div>
                  <div className="text-sm text-slate-400">Kolkata, India</div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4">
              <div className="text-xs font-black uppercase tracking-widest text-cyan-300">
                Quick Tip
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Include CPU/GPU model + motherboard + cabinet size for faster
                compatibility help.
              </p>
            </div>
          </div>

          {/* Right Form */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/35 backdrop-blur-xl p-6 lg:col-span-2">
            <h2 className="text-lg font-black">Create a Ticket</h2>

            {status.msg && (
              <div
                className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                  status.type === "ok"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-red-500/30 bg-red-500/10 text-red-200"
                }`}
              >
                {status.msg}
              </div>
            )}

            <form
              onSubmit={submit}
              className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <Field label="Subject">
                <input
                  value={form.subject}
                  onChange={onChange("subject")}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10"
                  placeholder="Order / Compatibility / Returns"
                />
              </Field>

              <Field label="Category">
                <select
                  value={form.category}
                  onChange={onChange("category")}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10"
                >
                  <option value="general">General</option>
                  <option value="order">Order</option>
                  <option value="compat">Compatibility</option>
                  <option value="returns">Returns / Refunds</option>
                  <option value="bulk">Bulk / Business</option>
                </select>
              </Field>

              <Field label="Priority">
                <select
                  value={form.priority}
                  onChange={onChange("priority")}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </Field>

              {/* Order dropdowns */}
              {form.category === "order" && (
                <>
                  <Field label="Select Order">
                    <select
                      value={selectedOrderId}
                      onChange={(e) => {
                        setSelectedOrderId(e.target.value);
                        setSelectedProductId("");
                      }}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10"
                      disabled={ordersLoading}
                    >
                      <option value="">
                        {ordersLoading
                          ? "Loading orders..."
                          : "Choose an order"}
                      </option>

                      {orders.map((o) => {
                        const short = fmtOrderShort(o?._id);
                        const date = o?.createdAt
                          ? new Date(o.createdAt).toLocaleDateString()
                          : "";
                        return (
                          <option key={o._id} value={o._id}>
                            Order #{short} {date ? `• ${date}` : ""}
                          </option>
                        );
                      })}
                    </select>

                    {ordersErr && (
                      <div className="mt-2 text-xs text-rose-300">
                        {ordersErr}
                      </div>
                    )}
                  </Field>

                  <Field label="Select Item (optional)">
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10"
                      disabled={!selectedOrderId}
                    >
                      <option value="">All items / Not sure</option>

                      {itemOptions.map((it) => (
                        <option key={it.productId} value={it.productId}>
                          {it.title} {it.qty ? `x${it.qty}` : ""}
                        </option>
                      ))}
                    </select>

                    {selectedOrderId && itemOptions.length === 0 && (
                      <div className="mt-2 text-xs text-slate-500">
                        Items missing product references in this order.
                      </div>
                    )}
                  </Field>
                </>
              )}

              <div className="sm:col-span-2">
                <Field label="Message">
                  <textarea
                    value={form.message}
                    onChange={onChange("message")}
                    rows={6}
                    className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10"
                    placeholder="Tell us what you need help with..."
                  />
                </Field>
              </div>

              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-70 transition"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "Sending..." : "Send"}
                </button>
              </div>
            </form>

            <p className="mt-4 text-xs text-slate-500">
              This creates a Support Ticket using your customer token.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
