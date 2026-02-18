export default function GlowWrap({
  children,
  className = "",
  glowClassName = "",
}) {
  return (
    <div className={`relative inline-flex ${className}`}>
      {/* soft glow behind */}
      <div
        className={`pointer-events-none absolute -inset-3 rounded-[inherit]
          bg-gradient-to-r from-cyan-400/20 via-indigo-500/15 to-purple-500/20
          blur-2xl opacity-80
          ${glowClassName}`}
      />
      {/* the actual content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
