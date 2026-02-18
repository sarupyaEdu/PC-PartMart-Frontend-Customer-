import React from "react";

export const Input = ({ label, icon, ...props }) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-400 mb-1 ml-1 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={`w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-4 ${
            icon ? "pl-10" : ""
          } text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner`}
        />
      </div>
    </div>
  );
};
