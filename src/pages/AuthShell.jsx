import { Outlet } from "react-router-dom";
import { Cpu } from "lucide-react";

export default function AuthShell() {
  return (
    <div className="min-h-screen bg-[#020617] relative flex flex-col overflow-x-hidden selection:bg-cyan-500 selection:text-white">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-grid z-0" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] translate-y-1/2 pointer-events-none" />

      {/* Main */}
      <main className="relative z-10 flex-grow flex items-center justify-center p-4">
        <div className="w-full flex flex-col items-center">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-8 border-t border-slate-900 bg-slate-950/50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-slate-500">
              <Cpu size={18} />
              <span className="text-xs font-mono uppercase">V-3.0.4 CORE</span>
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <p className="text-xs text-slate-600">
              © 2024 CORE-TECH HARDWARE SYSTEMS
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
              Network Status:
            </span>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
              <span className="text-[10px] text-green-500 font-bold">
                OPERATIONAL
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
