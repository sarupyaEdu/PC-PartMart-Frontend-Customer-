import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getTicket, addTicketMessage } from "../api/support";
import { toast } from "react-toastify";
import { ArrowLeft, Send, Ticket } from "lucide-react";

const pillCls = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "open")
    return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
  if (s === "pending")
    return "bg-amber-500/10 text-amber-300 border-amber-500/20";
  if (s === "closed") return "bg-slate-700 text-slate-300 border-slate-600";
  return "bg-slate-800 text-slate-300 border-slate-700";
};

const fmtShort = (id) =>
  String(id || "")
    .slice(-6)
    .toUpperCase();

const animDelay = (i, step = 70) => ({ animationDelay: `${i * step}ms` });

export default function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async ({ silent = false } = {}) => {
    setErr("");
    try {
      const res = await getTicket(id);
      setTicket(res.data?.ticket || res.data);
    } catch (e) {
      const m = e?.response?.data?.message || "Failed to load ticket";
      setErr(m);
      if (!silent) toast.error(`❌ ${m}`, { toastId: `ticket-load-${id}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setTicket(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const status = useMemo(
    () => String(ticket?.status || "").toLowerCase(),
    [ticket],
  );
  const isClosed = status === "closed";

  const sendReply = async () => {
    if (!replyText.trim()) return;
    if (!ticket?._id) return;

    setBusy(true);
    try {
      await addTicketMessage(ticket._id, { text: replyText.trim() });
      setReplyText("");
      toast.success("✅ Reply sent", { toastId: `ticket-reply-${ticket._id}` });
      await load({ silent: true });
    } catch (e) {
      const m = e?.response?.data?.message || "Failed to send reply";
      toast.error(`❌ ${m}`, { toastId: `ticket-reply-err-${ticket?._id}` });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white grid place-items-center p-6">
        <div className="flex flex-col items-center gap-4 opacity-0 animate-[fadeUp_450ms_ease-out_forwards]">
          <div className="h-12 w-12 rounded-full border-4 border-slate-700 border-t-cyan-400 animate-spin" />
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">
            Loading ticket...
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="text-xl font-black">Ticket not found</div>
          {err && <div className="mt-2 text-sm text-rose-300">{err}</div>}
          <button
            onClick={() => navigate(-1)}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm font-black text-slate-200 hover:bg-slate-950/70"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>
        </div>
      </div>
    );
  }

  const orderId = ticket?.orderId?._id || ticket?.orderId || "";
  const orderItemTitle =
    ticket?.orderItemTitleSnapshot || ticket?.orderItemId?.title || "";
  const lastMsgAt =
    ticket?.lastMessageAt ||
    (ticket?.messages?.length
      ? ticket.messages[ticket.messages.length - 1]?.at
      : null);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <style>{`
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes popIn {
    from { opacity: 0; transform: scale(.985); }
    to { opacity: 1; transform: scale(1); }
  }
`}</style>

      {/* Top bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between opacity-0 animate-[fadeUp_500ms_ease-out_forwards]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm font-black text-slate-200 hover:bg-slate-900/60"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div>
            <div className="text-2xl font-black flex items-center gap-2">
              <Ticket className="h-5 w-5 text-cyan-300" />
              Ticket #{fmtShort(ticket?._id)}
            </div>
            <div className="mt-1 text-sm text-slate-400">
              Created:{" "}
              {ticket?.createdAt
                ? new Date(ticket.createdAt).toLocaleString()
                : "—"}
              {lastMsgAt ? (
                <span className="ml-2 text-slate-600">•</span>
              ) : null}
              {lastMsgAt ? (
                <span className="ml-2">
                  Last activity:{" "}
                  <span className="text-slate-300 font-semibold">
                    {new Date(lastMsgAt).toLocaleString()}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${pillCls(ticket.status)}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
            {String(ticket?.status || "unknown").toUpperCase()}
          </span>

          <span className="rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-200">
            Priority: {String(ticket?.priority || "medium").toUpperCase()}
          </span>

          <span className="rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-200">
            Category: {String(ticket?.category || "general").toUpperCase()}
          </span>
        </div>
      </div>

      {/* Alerts */}
      {err && (
        <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT: ticket meta */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/35 backdrop-blur-xl p-6 lg:col-span-1 opacity-0 animate-[popIn_500ms_ease-out_forwards] [animation-delay:80ms]">
          <h2 className="text-lg font-black">Ticket Details</h2>

          <div className="mt-4 space-y-4 text-sm">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                Subject
              </div>
              <div className="mt-2 font-bold text-slate-100">
                {ticket.subject || "—"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                Customer Snapshot
              </div>
              <div className="mt-2 text-slate-200">
                <div className="font-bold">
                  {ticket.customerName || ticket.userId?.name || "—"}
                </div>
                <div className="text-slate-400">
                  {ticket.customerEmail || ticket.userId?.email || "—"}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                Linked Order
              </div>

              {orderId ? (
                <div className="mt-2 space-y-2">
                  <Link
                    to={`/orders/${orderId}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs font-black text-indigo-200 hover:bg-indigo-500/15"
                  >
                    View Order #{fmtShort(orderId)}
                    <span className="opacity-80">→</span>
                  </Link>

                  {orderItemTitle ? (
                    <div className="text-xs text-slate-400">
                      Item:{" "}
                      <span className="font-semibold text-slate-200">
                        {orderItemTitle}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">Item: —</div>
                  )}
                </div>
              ) : (
                <div className="mt-2 text-slate-500 text-sm">
                  No order linked.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                Timestamps
              </div>
              <div className="mt-2 space-y-1 text-slate-300">
                <div>
                  Created:{" "}
                  <span className="font-semibold text-slate-100">
                    {ticket.createdAt
                      ? new Date(ticket.createdAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div>
                  Updated:{" "}
                  <span className="font-semibold text-slate-100">
                    {ticket.updatedAt
                      ? new Date(ticket.updatedAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div>
                  Last message:{" "}
                  <span className="font-semibold text-slate-100">
                    {ticket.lastMessageAt
                      ? new Date(ticket.lastMessageAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: conversation */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/35 backdrop-blur-xl p-6 lg:col-span-2 opacity-0 animate-[popIn_500ms_ease-out_forwards] [animation-delay:140ms]">
          <h2 className="text-lg font-black">Conversation</h2>

          <div className="mt-4 space-y-3">
            {(ticket.messages || []).length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 text-slate-400">
                No messages yet.
              </div>
            ) : (
              (ticket.messages || []).map((m, i) => {
                const isAdmin = m.senderRole === "admin";
                return (
                  <div
                    key={i}
                    style={animDelay(i, 60)}
                    className={[
                      "opacity-0 animate-[fadeUp_420ms_ease-out_forwards]",
                      "rounded-2xl border p-4 text-sm",
                      isAdmin
                        ? "border-indigo-500/20 bg-indigo-500/10"
                        : "border-slate-800 bg-slate-950/40",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-black">
                        {isAdmin ? "Support Team" : "You"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {m?.at ? new Date(m.at).toLocaleString() : ""}
                      </div>
                    </div>
                    <div className="mt-2 text-slate-200 whitespace-pre-wrap">
                      {m.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply */}
          <div className="mt-6">
            {isClosed ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
                This ticket is closed. You can’t reply.
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  disabled={busy}
                  className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10"
                />
                <button
                  onClick={sendReply}
                  disabled={busy || !replyText.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-70"
                >
                  <Send className="h-4 w-4" />
                  {busy ? "Sending..." : "Send"}
                </button>
              </div>
            )}

            <div className="mt-3 text-xs text-slate-500">
              Replies are stored in the same ticket and visible to admin +
              customer.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
