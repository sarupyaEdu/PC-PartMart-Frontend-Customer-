import { useMemo, useState } from "react";
import { ChevronDown, ShieldCheck, Truck, RotateCcw, Cpu } from "lucide-react";

function Item({ q, a, open, onClick }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/35 backdrop-blur-xl overflow-hidden">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-950/30 transition"
      >
        <span className="text-sm sm:text-base font-black text-white">{q}</span>
        <ChevronDown
          className={`h-5 w-5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-slate-400 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

export default function Faq() {
  const faqs = useMemo(
    () => [
      {
        q: "Are the parts genuine and warranty-backed?",
        a: "Yes — we prioritize authentic products and warranty coverage. Always check the product page for warranty details and return eligibility.",
      },
      {
        q: "How do I know parts are compatible?",
        a: "Use category filters (CPU socket, RAM type, form factor). If you're unsure, contact support with your CPU, motherboard model, and cabinet size.",
      },
      {
        q: "What’s your return / replacement policy?",
        a: "Most items support returns within the allowed window. Items like CPUs/GPUs may have stricter rules if packaging is opened. Check the product page & order details.",
      },
      {
        q: "How long does delivery take?",
        a: "Typically 2–7 business days depending on location and courier availability. You’ll receive tracking updates after dispatch.",
      },
      {
        q: "Why does a deal show “Offer ended”?",
        a: "Timed offers can end, but the UI may still show the ended state until the day ends (depending on your offer logic). Refreshing can update badges based on current time.",
      },
      {
        q: "Can I cancel an order?",
        a: "Yes, if the order hasn’t shipped yet. After dispatch, you may need to request return or replacement as per policy.",
      },
    ],
    [],
  );

  const [openIdx, setOpenIdx] = useState(0);

  return (
    <div className="min-h-[calc(100vh-var(--nav-h))] bg-gradient-to-b from-[#020617] via-[#020b1f] to-[#020617] text-white">
      {/* BG */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
      <div className="pointer-events-none absolute top-[9%] left-1/4 h-[520px] w-[520px] rounded-full bg-cyan-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[12%] right-1/4 h-[620px] w-[620px] rounded-full bg-purple-600/10 blur-[150px]" />

      <div className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-800 bg-slate-900/40 px-4 py-2 text-xs font-bold text-slate-200">
          <Cpu className="h-4 w-4 text-cyan-300" />
          HELP CENTER
        </div>

        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">
          Frequently Asked <span className="text-cyan-400">Questions</span>
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-400">
          Quick answers about authenticity, delivery, compatibility, returns,
          and offers.
        </p>

        {/* Quick badges */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/35 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2 text-cyan-300">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">
                Genuine
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Verified products and warranty info on listings.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/35 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2 text-cyan-300">
              <Truck className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">
                Delivery
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Fast dispatch and tracking updates after ship.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/35 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2 text-cyan-300">
              <RotateCcw className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">
                Returns
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Easy returns where eligible. See product rules.
            </p>
          </div>
        </div>

        {/* Accordion */}
        <div className="mt-8 space-y-4">
          {faqs.map((x, i) => (
            <Item
              key={x.q}
              q={x.q}
              a={x.a}
              open={openIdx === i}
              onClick={() => setOpenIdx((p) => (p === i ? -1 : i))}
            />
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-10 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-5">
          <div className="text-xs font-black uppercase tracking-widest text-cyan-300">
            Still stuck?
          </div>
          <p className="mt-2 text-sm text-slate-400">
            If you share your CPU + motherboard model + cabinet size, we can
            help confirm compatibility fast.
          </p>
        </div>
      </div>
    </div>
  );
}
