import { Link } from "react-router-dom";
import { Cpu } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-2 group"
          >
            <Cpu className="h-6 w-6 text-indigo-500 group-hover:text-indigo-400 transition" />
            <span className="text-xl font-black tracking-tighter text-white group-hover:drop-shadow-[0_0_6px_rgba(99,102,241,0.6)] transition">
              PC<span className="text-indigo-500"> PartMart</span>
            </span>
          </Link>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-slate-400">
            <Link to="/about" className="hover:text-white transition">
              About Us
            </Link>
            <Link to="/faq" className="hover:text-white transition">
              FAQ
            </Link>
            <Link to="/contact" className="hover:text-white transition">
              Contact
            </Link>
            <Link to="/terminal-protocols" className="hover:text-white transition">
              Data Privacy Acts
            </Link>
            <Link to="/terminal-protocols" className="hover:text-white transition">
              Terminal Protocols
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-xs text-slate-500 text-center md:text-right">
            © {new Date().getFullYear()} PC PartMart. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
