import { Link } from "react-router-dom";
import { Shield, Truck, Zap, Users, BadgeCheck, Cpu } from "lucide-react";

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl p-5">
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">
        {label}
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/35 backdrop-blur-xl p-6 hover:border-cyan-500/40 transition">
      <div className="mb-3 inline-flex rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-cyan-300">
        {icon}
      </div>
      <h3 className="text-lg font-black text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function About() {
  return (
    <div className="min-h-[calc(100vh-var(--nav-h))] bg-gradient-to-b from-[#020617] via-[#020b1f] to-[#020617] text-white">
      {/* BG */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
      <div className="pointer-events-none absolute top-[8%] left-1/4 h-[520px] w-[520px] rounded-full bg-cyan-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[10%] right-1/4 h-[620px] w-[620px] rounded-full bg-purple-600/10 blur-[150px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-800 bg-slate-900/40 px-4 py-2 text-xs font-bold text-slate-200">
            <Cpu className="h-4 w-4 text-cyan-300" />
            BUILT FOR PC ENTHUSIASTS
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
            About <span className="text-cyan-400">PC PartMart</span>
          </h1>

          <p className="max-w-3xl text-sm sm:text-base text-slate-400 leading-relaxed">
            We’re a component-first marketplace designed for builders:
            transparent pricing, verified parts, fast delivery, and help
            choosing compatible hardware — so you can build confidently.
          </p>
        </div>

        {/* Stats */}
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Verified Sellers" value="100+" />
          <Stat label="Happy Builders" value="10K+" />
          <Stat label="Avg Dispatch Time" value="24h" />
          <Stat label="Support Response" value="< 2h" />
        </div>

        {/* Features */}
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Feature
            icon={<Shield className="h-6 w-6" />}
            title="Genuine & Warranty-backed"
            desc="We prioritize authentic inventory and warranty coverage so you don’t gamble on core parts."
          />
          <Feature
            icon={<Truck className="h-6 w-6" />}
            title="Fast Delivery, Safe Packaging"
            desc="Careful packing for GPUs, CPUs, and fragile components — delivered with tracking updates."
          />
          <Feature
            icon={<Zap className="h-6 w-6" />}
            title="Build Guidance"
            desc="Need help? We’ll point you to compatible parts and safe upgrade paths for your budget."
          />
          <Feature
            icon={<BadgeCheck className="h-6 w-6" />}
            title="Fair, Transparent Pricing"
            desc="Clear discounts, real-time stock, and pricing snapshots so the cart never surprises you."
          />
          <Feature
            icon={<Users className="h-6 w-6" />}
            title="Community-first"
            desc="We’re builders too — we care about temps, airflow, RAM timings, and cable management."
          />
          <Feature
            icon={<Cpu className="h-6 w-6" />}
            title="Curated Categories"
            desc="Browse by CPU, GPU, RAM, SSD, PSU, Cabinet, Cooler and more — the way builders think."
          />
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-3xl border border-slate-800 bg-slate-900/35 backdrop-blur-xl p-8 sm:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black">
                Ready to build your next rig?
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Explore curated parts and deals — or reach out if you want a
                compatibility check.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/products"
                className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-400 transition"
              >
                Browse Store
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 px-5 py-3 text-sm font-black text-slate-200 hover:border-slate-700 hover:text-white transition"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
