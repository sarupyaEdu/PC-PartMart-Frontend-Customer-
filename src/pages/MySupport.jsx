import { useEffect, useMemo, useState } from "react";
import { myTickets, addTicketMessage } from "../api/support";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
const animDelay = (i) => ({ animationDelay: `${i * 70}ms` });

const Badge = ({ status }) => {
  const s = String(status || "").toLowerCase();
  const cls =
    s === "open"
      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
      : s === "pending"
        ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
        : s === "closed"
          ? "bg-slate-700 text-slate-300 border-slate-600"
          : "bg-slate-700 text-slate-300 border-slate-600";

  return (
    <span className={`px-3 py-1 text-xs rounded-full border ${cls}`}>
      {String(status || "").toUpperCase()}
    </span>
  );
};

export default function MySupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // reply state (kept like your original)
  const [activeId, setActiveId] = useState(null);
  const [replyText, setReplyText] = useState("");

  const [err, setErr] = useState("");

  // ✅ filter + sort + search
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | OPEN | PENDING | CLOSED
  const [sortBy, setSortBy] = useState("UPDATED_NEWEST"); // UPDATED_NEWEST | NEWEST | OLDEST | STATUS
  const [q, setQ] = useState("");
  // ✅ pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const fetchTickets = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await myTickets();
      setTickets(res.data?.tickets || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const sendReply = async (id) => {
    if (!replyText.trim()) return;

    try {
      await addTicketMessage(id, { text: replyText.trim() });
      setReplyText("");
      await fetchTickets();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to send reply");
    }
  };

  // ✅ helpers
  const normalize = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const shortId = (id) =>
    String(id || "")
      .slice(-6)
      .toUpperCase();

  const matchesQuery = (t, query) => {
    const qq = normalize(query);
    if (!qq) return true;

    const idFull = normalize(t?._id);
    const idShort = normalize(shortId(t?._id));
    const subject = normalize(t?.subject);

    const msgs = Array.isArray(t?.messages)
      ? t.messages
          .map((m) => normalize(m?.text))
          .filter(Boolean)
          .join(" ")
      : "";

    const q2 = qq.replace("ticket", "").replace("#", "").trim();

    return (
      idFull.includes(qq) ||
      idShort.includes(qq) ||
      idFull.includes(q2) ||
      idShort.includes(q2) ||
      subject.includes(qq) ||
      subject.includes(q2) ||
      msgs.includes(qq) ||
      msgs.includes(q2)
    );
  };

  const statusRank = (t) => {
    // smaller = higher priority
    const s = normalize(t?.status);
    if (s === "open") return 0;
    if (s === "pending") return 1;
    if (s === "closed") return 9;
    return 5;
  };

  const toCreatedTime = (t) => {
    const ms = new Date(t?.createdAt || 0).getTime();
    return Number.isFinite(ms) ? ms : 0;
  };

  const toUpdatedTime = (t) => {
    // prefer updatedAt, fallback to last message time, else createdAt
    const updated = new Date(t?.updatedAt || 0).getTime();
    if (Number.isFinite(updated) && updated > 0) return updated;

    const lastMsg = Array.isArray(t?.messages)
      ? t.messages[t.messages.length - 1]
      : null;

    const lastMsgTime = new Date(lastMsg?.createdAt || 0).getTime();
    if (Number.isFinite(lastMsgTime) && lastMsgTime > 0) return lastMsgTime;

    return toCreatedTime(t);
  };

  const visibleTickets = useMemo(() => {
    const arr = Array.isArray(tickets) ? [...tickets] : [];

    // filter by status
    const filtered = arr.filter((t) => {
      const s = normalize(t?.status);
      if (statusFilter === "ALL") return true;
      if (statusFilter === "OPEN") return s === "open";
      if (statusFilter === "PENDING") return s === "pending";
      if (statusFilter === "CLOSED") return s === "closed";
      return true;
    });

    // search
    const searched = filtered.filter((t) => matchesQuery(t, q));

    // sort
    searched.sort((a, b) => {
      if (sortBy === "NEWEST") return toCreatedTime(b) - toCreatedTime(a);
      if (sortBy === "OLDEST") return toCreatedTime(a) - toCreatedTime(b);

      if (sortBy === "UPDATED_NEWEST")
        return toUpdatedTime(b) - toUpdatedTime(a);

      if (sortBy === "STATUS") {
        const st = statusRank(a) - statusRank(b);
        if (st !== 0) return st;
        return toUpdatedTime(b) - toUpdatedTime(a);
      }

      return toUpdatedTime(b) - toUpdatedTime(a);
    });

    return searched;
  }, [tickets, statusFilter, sortBy, q]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, sortBy, q]);

  const totalPages = useMemo(() => {
    const n = Math.ceil((visibleTickets.length || 0) / Number(pageSize || 1));
    return Math.max(1, n);
  }, [visibleTickets.length, pageSize]);

  const safePage = useMemo(() => {
    return Math.min(Math.max(1, page), totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  const pagedTickets = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return visibleTickets.slice(start, end);
  }, [visibleTickets, safePage, pageSize]);

  const pageStart = (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, visibleTickets.length);

  if (loading)
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4 opacity-0 animate-[fadeUp_450ms_ease-out_forwards]">
          <div className="h-12 w-12 rounded-full border-4 border-slate-700 border-t-cyan-400 animate-spin" />
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">
            Loading tickets...
          </div>
        </div>
      </div>
    );

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

      {/* ✅ Header + CTA + Controls (ONLY ONCE) */}
      <div className="mb-6 flex flex-col gap-3 opacity-0 animate-[fadeUp_500ms_ease-out_forwards]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black">My Support Tickets</h1>
            <p className="text-sm text-slate-400 mt-1">
              View old tickets and replies from the support team.
            </p>
          </div>

          <Link
            to="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-400 transition"
          >
            <Plus size={16} />
            Create New Ticket
          </Link>
        </div>

        {/* ✅ Controls Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: filters */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              ["ALL", "All"],
              ["OPEN", "Open"],
              ["PENDING", "Pending"],
              ["CLOSED", "Closed"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-widest transition",
                  statusFilter === key
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                    : "border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-950/70 hover:text-white",
                ].join(" ")}
              >
                {label}
              </button>
            ))}

            <div className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-500">
              Showing:{" "}
              <span className="text-slate-200">{visibleTickets.length}</span> /{" "}
              <span className="text-slate-200">{tickets.length}</span>
            </div>
          </div>

          {/* Right: search + sort */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by ticket ID, subject, or message…"
              className="w-full sm:w-80 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10"
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-200 outline-none focus:border-cyan-500/60"
            >
              <option value="UPDATED_NEWEST">Updated: Newest</option>
              <option value="NEWEST">Created: Newest</option>
              <option value="OLDEST">Created: Oldest</option>
              <option value="STATUS">Status Priority</option>
            </select>
          </div>
        </div>
      </div>

      {err && (
        <div className="mb-4 p-3 rounded bg-red-500/20 border border-red-500/30">
          {err}
        </div>
      )}

      {!loading && visibleTickets.length === 0 && (
        <div className="text-slate-400">
          {tickets.length === 0
            ? "No support tickets yet."
            : "No tickets match your filters/search."}
        </div>
      )}

      {/* ✅ Pagination Bar */}
      {!loading && visibleTickets.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-800 bg-slate-950/40 p-4 opacity-0 animate-[fadeUp_500ms_ease-out_forwards] [animation-delay:120ms]">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Showing{" "}
            <span className="text-slate-200">
              {pageStart}-{pageEnd}
            </span>{" "}
            of <span className="text-slate-200">{visibleTickets.length}</span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Per page
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-200 outline-none focus:border-cyan-500/60"
              >
                <option value={4}>4</option>
                <option value={6}>6</option>
                <option value={8}>8</option>
                <option value={12}>12</option>
              </select>
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
        </div>
      )}

      <div className="space-y-6">
        {pagedTickets.map((t, i) => {
          const previewMessages = (t.messages || []).slice(-2); // ✅ last 2 only

          return (
            <div
              key={t._id}
              style={animDelay(i)}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 opacity-0 animate-[popIn_450ms_ease-out_forwards]"
            >
              {/* Header row */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                <div className="min-w-0">
                  <div className="font-bold truncate">{t.subject}</div>
                  <div className="text-xs text-slate-400">
                    {t.createdAt ? new Date(t.createdAt).toLocaleString() : ""}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge status={t.status} />

                  <Link
                    to={`/support/${t._id}`}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs font-black text-slate-200 hover:bg-slate-950/70 hover:text-white transition"
                  >
                    Details
                  </Link>
                </div>
              </div>

              {/* Conversation Preview */}
              <div className="space-y-2 mb-4">
                {previewMessages.map((m, i) => (
                  <div
                    key={i}
                    style={{ animationDelay: `${i * 60}ms` }}
                    className={`p-3 rounded-xl text-sm border opacity-0 animate-[fadeUp_350ms_ease-out_forwards] ${
                      m.senderRole === "admin"
                        ? "bg-indigo-500/10 border-indigo-500/20"
                        : "bg-slate-800 border-slate-700"
                    }`}
                  >
                    <div className="font-bold mb-1">
                      {m.senderRole === "admin" ? "Support Team" : "You"}
                    </div>
                    <div className="whitespace-pre-wrap">{m.text}</div>
                  </div>
                ))}

                {!previewMessages.length && (
                  <div className="text-sm text-slate-400">
                    No messages in this ticket yet.
                  </div>
                )}
              </div>

              {/* Reply Box */}
              {String(t.status || "").toLowerCase() !== "closed" && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className="flex-1 rounded-xl bg-slate-800 border border-slate-700 p-2 text-sm outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10"
                    placeholder="Reply..."
                    value={activeId === t._id ? replyText : ""}
                    onFocus={() => setActiveId(t._id)}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <button
                    onClick={() => sendReply(t._id)}
                    className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
