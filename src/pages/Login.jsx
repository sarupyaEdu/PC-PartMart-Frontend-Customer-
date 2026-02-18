import { useEffect, useState } from "react";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Mail, Lock, LogIn } from "lucide-react";
import BrandLogo from "../assets/brand-logo.png";

import { loginUser } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

import { TECH_TIPS } from "../data/techTips";

function LoadingOverlay({ show, text = "Initializing..." }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[999] grid place-items-center bg-slate-950/70 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-[0_0_60px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-4">
          {/* Spinner */}
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
            <div className="absolute inset-2 rounded-full border border-cyan-500/20" />
          </div>

          <div className="min-w-0">
            <div className="text-sm font-black text-white tracking-wide">
              {text}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Verifying credentials • Syncing session • Loading profile
            </div>

            {/* Progress bar shimmer */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-1/2 animate-[shimmer_1.2s_infinite] bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" />
            </div>
          </div>
        </div>
      </div>

      {/* local keyframes (Tailwind v4 supports arbitrary animations too, but this is simplest) */}
      <style>
        {`
          @keyframes shimmer {
            0% { transform: translateX(-120%); }
            100% { transform: translateX(220%); }
          }
        `}
      </style>
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [tip, setTip] = useState("Loading tech intelligence...");
  const [tipLoading, setTipLoading] = useState(true);

  const { refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const cached = sessionStorage.getItem("pcpm_tip");

    if (cached) {
      setTip(cached);
      setTipLoading(false);
      return;
    }

    const randomTip = TECH_TIPS[Math.floor(Math.random() * TECH_TIPS.length)];

    const timer = setTimeout(() => {
      setTip(randomTip);
      setTipLoading(false);
      sessionStorage.setItem("pcpm_tip", randomTip);
    }, 500); // keeps your shimmer animation vibe

    return () => clearTimeout(timer);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await loginUser({ email, password });
      const token = res.data?.token;

      if (!token) throw new Error("Token not received");

      localStorage.setItem("customerToken", token);
      await refresh();
      navigate("/");
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-[calc(100vh-var(--nav-h))] bg-gradient-to-b from-[#020617] via-[#020b1f] to-[#020617] overflow-hidden selection:bg-cyan-500 selection:text-white">
      <LoadingOverlay show={loading} text="Initializing Session..." />

      {/* Background Decor */}
      <div className="absolute inset-0 bg-grid z-0" />
      <div className="absolute top-[10%] left-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 grid h-full place-items-center px-4">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl">
            <div className="text-center mb-8">
              <div className="mb-4 flex justify-center">
                <div className="relative">
                  <img
                    src={BrandLogo}
                    alt="PC PartMart"
                    className="
        h-12 w-auto object-contain
        drop-shadow-[0_0_20px_rgba(34,211,238,0.25)]
        [mask-image:radial-gradient(circle,rgba(0,0,0,1)_70%,rgba(0,0,0,0)_100%)]
        [-webkit-mask-image:radial-gradient(circle,rgba(0,0,0,1)_70%,rgba(0,0,0,0)_100%)]
      "
                    loading="lazy"
                  />
                </div>
              </div>

              <h2 className="text-3xl font-orbitron font-bold text-white mb-2 tracking-tight">
                SYSTEM <span className="text-cyan-500">ACCESS</span>
              </h2>
              <p className="text-slate-400 text-sm">
                Welcome back to PC PartMart.
              </p>
            </div>

            {err && (
              <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                {err}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="pilot@core-tech.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                icon={<Mail size={18} />}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                icon={<Lock size={18} />}
                required
              />

              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    disabled={loading}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="group-hover:text-slate-300 transition-colors">
                    Maintain Link
                  </span>
                </label>

                {/* If you don't have /forgot-password route, remove this button */}
                <button
                  type="button"
                  className="hover:text-cyan-400 transition-colors font-medium"
                  disabled={loading}
                  onClick={() => navigate("/forgot-password")}
                >
                  Lost Protocol?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full mt-4"
                disabled={loading}
                isLoading={loading}
              >
                <LogIn size={18} className="mr-2" />
                {loading ? "Initializing..." : "Initialize Session"}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-800 text-center">
              <p className="text-slate-500 text-sm">
                New to the grid?{" "}
                <Link
                  to="/register"
                  className="text-cyan-400 font-bold hover:text-cyan-300 transition-colors underline-offset-4 hover:underline"
                >
                  Construct Profile
                </Link>
              </p>
            </div>
          </div>

          {/* AI Powered Tip Card */}
          <div className="mt-6 bg-cyan-950/20 border border-cyan-500/20 p-4 rounded-xl flex items-start space-x-3 backdrop-blur-sm">
            <div className="p-2 bg-cyan-500/10 rounded-lg shrink-0">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-orbitron font-bold text-cyan-400 uppercase tracking-widest mb-1">
                Tech Intel
              </h4>
              {tipLoading ? (
                <div className="space-y-2">
                  <div className="h-3 w-56 rounded bg-slate-800/80 overflow-hidden">
                    <div className="h-full w-1/2 animate-[shimmer_1.1s_infinite] bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent" />
                  </div>
                  <div className="h-3 w-44 rounded bg-slate-800/80 overflow-hidden">
                    <div className="h-full w-1/2 animate-[shimmer_1.1s_infinite] bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent" />
                  </div>

                  <style>
                    {`
        @keyframes shimmer {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
      `}
                  </style>
                </div>
              ) : (
                <p className="text-xs text-slate-400 leading-relaxed italic">
                  "{tip}"
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
