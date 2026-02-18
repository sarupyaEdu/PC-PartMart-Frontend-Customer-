import { useMemo } from "react";

const sizeMap = {
  sm: { box: "h-9", pad: "px-2 py-1", img: "h-6" }, // ~24px tall logo
  md: { box: "h-10", pad: "px-2.5 py-1.5", img: "h-7" }, // ~28px
  lg: { box: "h-12", pad: "px-3 py-2", img: "h-9" }, // ✅ ~36px (looks good)
};

export default function BrandBadge({ brand, size = "lg", showName = true }) {
  if (!brand || typeof brand === "string") return null;

  const { name, logo, ui = {} } = brand;

  const { scale = 1, padding = 8, bg = "#ffffff", invert = false } = ui;

  return (
    <span className="inline-flex items-center gap-2" title={name}>
      {logo?.url && (
        <span
          className="inline-flex items-center justify-center rounded-xl border shadow-sm"
          style={{
            background: bg,
            padding: `${padding}px`,
          }}
        >
          <img
            src={logo.url}
            alt={name}
            style={{
              height: "36px", // base size
              transform: `scale(${scale})`,
              filter: invert ? "invert(1)" : "none",
            }}
            className="w-auto object-contain"
          />
        </span>
      )}

      {showName && <span className="text-indigo-400 font-medium">{name}</span>}
    </span>
  );
}
