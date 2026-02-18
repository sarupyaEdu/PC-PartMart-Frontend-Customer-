import React from "react";

export const Button = ({
  children,
  variant = "primary",
  isLoading = false,
  className = "",
  ...props
}) => {
  const baseStyles =
    "relative inline-flex items-center justify-center px-6 py-3 font-orbitron font-bold text-sm tracking-widest uppercase transition-all rounded-lg overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-cyan-600 text-white hover:bg-cyan-500 shadow-[0_0_15px_rgba(8,145,178,0.3)] hover:shadow-[0_0_25px_rgba(8,145,178,0.5)]",
    secondary:
      "bg-purple-600 text-white hover:bg-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_25px_rgba(147,51,234,0.5)]",
    outline:
      "bg-transparent text-cyan-400 border border-cyan-500 hover:bg-cyan-500/10 shadow-[0_0_15px_rgba(8,145,178,0.15)] hover:shadow-[0_0_25px_rgba(8,145,178,0.25)]",
  };

  const variantClasses = variants[variant] || variants.primary;

  return (
    <button
      className={`${baseStyles} ${variantClasses} ${className}`.trim()}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : (
        children
      )}

      {/* Glow highlight */}
      <span className="pointer-events-none absolute inset-0 h-full w-full bg-white/10 scale-x-0 transition-transform duration-300 origin-left group-hover:scale-x-100"></span>
    </button>
  );
};
