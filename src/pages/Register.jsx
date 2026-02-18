import { useState } from "react";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { User, Mail, Lock, UserPlus } from "lucide-react";
import { loginUser } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "../assets/brand-logo.png";
import { registerUser } from "../api/auth";
import { useNavigate, Link } from "react-router-dom";

function LoadingOverlay({ show, text = "Initializing..." }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[999] grid place-items-center bg-slate-950/70 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-[0_0_60px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-4">
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
              Creating account • Syncing session • Loading profile
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-1/2 animate-[shimmer_1.2s_infinite] bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" />
            </div>
          </div>
        </div>
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
  );
}

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const { refresh } = useAuth();

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (formData.password !== formData.confirmPassword) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // 1️⃣ Register user
      await registerUser({
        name: formData.username,
        email: formData.email,
        password: formData.password,
      });

      // 2️⃣ Auto-login
      const res = await loginUser({
        email: formData.email,
        password: formData.password,
      });

      const token = res.data?.token;
      if (!token) throw new Error("Token not received");

      // 3️⃣ Save token + refresh auth
      localStorage.setItem("customerToken", token);
      await refresh();

      // 4️⃣ Go home
      navigate("/");
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-[calc(100vh-var(--nav-h))] bg-gradient-to-b from-[#020617] via-[#020b1f] to-[#020617] overflow-hidden selection:bg-cyan-500 selection:text-white">
      <LoadingOverlay show={loading} text="Creating Profile..." />

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
                NEW <span className="text-purple-500">OPERATIVE</span>
              </h2>
              <p className="text-slate-400 text-sm">
                Join the network of elite hardware enthusiasts.
              </p>
            </div>

            {err && (
              <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                {err}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <Input
                label="Name"
                name="username"
                placeholder="NeoBuilds_88"
                value={formData.username}
                onChange={handleChange}
                icon={<User size={18} />}
                required
              />

              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="architect@core-tech.io"
                value={formData.email}
                onChange={handleChange}
                icon={<Mail size={18} />}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Keycode"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  icon={<Lock size={18} />}
                  required
                />
                <Input
                  label="Verify"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  icon={<Lock size={18} />}
                  required
                />
              </div>

              <Button
                variant="secondary"
                type="submit"
                className="w-full mt-4"
                isLoading={loading}
                disabled={
                  loading || formData.password !== formData.confirmPassword
                }
              >
                <UserPlus size={18} className="mr-2" />
                {loading ? "Registering..." : "Register Profile"}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-800 text-center">
              <p className="text-slate-500 text-sm">
                Already verified?{" "}
                <Link
                  to="/login"
                  className="text-purple-400 font-bold hover:text-purple-300 transition-colors underline-offset-4 hover:underline"
                >
                  Initiate Login
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-400 tracking-widest">
            By registering, you agree to the{" "}
            <Link
              to="/terminal-protocols"
              className="font-bold text-indigo-400 hover:text-indigo-300 hover:underline transition"
            >
              Terminal Protocols
            </Link>{" "}
            &{" "}
            <Link
              to="/terminal-protocols"
              className="font-bold text-indigo-400 hover:text-indigo-300 hover:underline transition"
            >
              Data Privacy Acts
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
