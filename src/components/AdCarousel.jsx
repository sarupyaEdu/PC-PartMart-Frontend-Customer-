import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function AdCarousel({
  items,
  heightClass,
  autoPlayInterval = 6000,
  smallText = false,
  onCtaClick,
}) {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((p) => (p + 1) % items.length);
  const prev = () => setCurrent((p) => (p - 1 + items.length) % items.length);

  useEffect(() => {
    if (!items?.length) return;
    const t = setInterval(next, autoPlayInterval);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items?.length, autoPlayInterval]);

  if (!items?.length) return null;

  return (
    <div
      className={`relative ${heightClass} overflow-hidden group rounded-2xl md:rounded-none w-full h-full`}
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === current ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover brightness-[0.4]"
          />
          <div
            className={`absolute inset-0 bg-gradient-to-r ${item.color} pointer-events-none`}
          />

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <h2
              className={`${
                smallText
                  ? "text-xl md:text-2xl lg:text-3xl"
                  : "text-3xl md:text-5xl lg:text-6xl"
              } font-black mb-2 transform transition-all duration-700 tracking-tight uppercase leading-none`}
            >
              {item.title}
            </h2>
            <p
              className={`${
                smallText ? "text-xs md:text-sm" : "text-base md:text-lg"
              } text-gray-300 mb-4 md:mb-6 max-w-xl font-light line-clamp-2`}
            >
              {item.subtitle}
            </p>
            <button
              type="button"
              onClick={() => onCtaClick?.(item)}
              className={`${
                smallText ? "px-4 py-2 text-xs" : "px-8 py-4 text-lg"
              } bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20`}
            >
              {item.cta}
            </button>
          </div>
        </div>
      ))}

      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/5 hover:bg-white/10 p-2 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          <button
            type="button"
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/5 hover:bg-white/10 p-2 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-1.5">
            {items.map((_, i) => (
              <button
                type="button"
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1 transition-all rounded-full ${
                  i === current ? "w-6 bg-blue-500" : "w-1.5 bg-white/20"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
