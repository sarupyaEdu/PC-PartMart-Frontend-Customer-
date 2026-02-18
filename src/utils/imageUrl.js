export function resolveImageUrl(product) {
  // 1️⃣ Cloudinary-style images array [{ url, public_id }]
  if (Array.isArray(product?.images) && product.images.length > 0) {
    const first = product.images[0];
    if (typeof first === "string") return first; // safety
    if (first?.url) return first.url; // ✅ YOUR CASE
  }

  // 2️⃣ Other possible fields (fallbacks)
  const raw = product?.image || product?.imageUrl || product?.thumbnail || "";

  if (!raw) return "";

  // 3️⃣ Absolute URL
  if (/^https?:\/\//i.test(raw)) return raw;

  // 4️⃣ Relative path → prefix backend
  const origin = import.meta.env.VITE_BACKEND_ORIGIN || "http://localhost:4500";
  const cleaned = raw.startsWith("/") ? raw : `/${raw}`;
  return `${origin}${cleaned}`;
}
