import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Outlet } from "react-router-dom";

export default function DefaultLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ✅ flex-1 pushes footer down, pt stays for fixed navbar on mobile */}
      <main className="flex-1 pt-[176px] md:pt-0">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
}
