import { useMemo, useState } from "react";

export default function ProductGallery({ images = [] }) {
  const safe = useMemo(
    () => (Array.isArray(images) ? images : []).filter(Boolean),
    [images],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  const main = safe[activeIndex] || safe[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/3] lg:aspect-square w-full overflow-hidden rounded-2xl bg-slate-800 border border-slate-700 group">
        {main ? (
          <img
            src={main}
            alt={`Product view ${activeIndex + 1}`}
            className="h-full w-full object-contain p-2 scale-[1.08] transition-transform duration-500 group-hover:scale-[1.14]"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-slate-400">
            No image
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent pointer-events-none" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {safe.map((img, idx) => (
          <button
            key={img + idx}
            onClick={() => setActiveIndex(idx)}
            type="button"
            className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
              idx === activeIndex
                ? "border-indigo-500 ring-2 ring-indigo-500/20"
                : "border-slate-800 hover:border-slate-600"
            }`}
          >
            <img
              src={img}
              alt={`Thumb ${idx + 1}`}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
