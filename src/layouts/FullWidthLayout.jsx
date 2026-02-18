import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function FullWidthLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#030712] text-white relative">
      {/* glow layer ONLY (clipped) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 left-1/4 h-[520px] w-[520px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute -bottom-24 right-1/4 h-[620px] w-[620px] rounded-full bg-purple-500/10 blur-[150px]" />
      </div>

      <Navbar />

      {/* ✅ flex-1 pushes footer down; keep your pt for fixed navbar */}
      <main className="relative z-10 flex-1 pt-[154px] md:pt-0">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
