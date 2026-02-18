import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";

import { getProductBySlug } from "../api/products";
import { listProductReviews, listBundleReviews } from "../api/reviews";
import { useAuth } from "../context/AuthContext";
import { deleteMyReview } from "../api/reviews";
const animDelay = (i, step = 70) => ({ animationDelay: `${i * step}ms` });

const Stars = ({ value = 0 }) => {
  const v = Math.max(0, Math.min(5, Number(value || 0)));
  const full = Math.floor(v);
  const half = v - full >= 0.5;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const filled = idx <= full || (idx === full + 1 && half);
        return (
          <span
            key={i}
            className={filled ? "text-yellow-400" : "text-slate-700"}
          >
            ★
          </span>
        );
      })}
    </div>
  );
};

export default function ReviewsPage() {
  const { slug } = useParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);

  const [isBundle, setIsBundle] = useState(false);

  // SINGLE
  const [reviews, setReviews] = useState([]);

  // BUNDLE grouped
  const [children, setChildren] = useState([]); // [{ product, reviews }]

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const pr = await getProductBySlug(slug);
        const p = pr.data?.product;
        if (!alive) return;

        setProduct(p);

        const pid = p?._id;
        if (!pid) throw new Error("Missing product id");

        if ((p?.type || "SINGLE") === "BUNDLE") {
          setIsBundle(true);
          const br = await listBundleReviews(pid);
          if (!alive) return;
          setChildren(br.data?.children || []);
          setReviews([]);
        } else {
          setIsBundle(false);
          const sr = await listProductReviews(pid);
          if (!alive) return;
          setReviews(sr.data?.reviews || []);
          setChildren([]);
        }
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load reviews");
        if (!alive) return;
        setProduct(null);
        setIsBundle(false);
        setReviews([]);
        setChildren([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [slug]);

  const totalCount = useMemo(() => {
    if (!isBundle) return reviews.length;
    return (children || []).reduce(
      (sum, x) => sum + (x?.reviews?.length || 0),
      0,
    );
  }, [isBundle, reviews.length, children]);

  const handleDelete = async (productId) => {
    const ok = window.confirm("Delete your review? This cannot be undone.");
    if (!ok) return;

    try {
      await deleteMyReview(productId);
      toast.success("Review deleted ✅");

      // ✅ refresh without full reload
      if (!isBundle) {
        setReviews((prev) =>
          prev.filter((r) => String(r?.product) !== String(productId)),
        );
      } else {
        setChildren((prev) =>
          prev.map((x) => ({
            ...x,
            reviews: (x.reviews || []).filter(
              (r) => String(r?.product) !== String(productId),
            ),
          })),
        );
      }

      // simplest safe refresh:
      // window.location.reload();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to delete review");
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 pt-12 pb-16">
      <style>{`
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes popIn {
    from { opacity: 0; transform: scale(.985); }
    to   { opacity: 1; transform: scale(1); }
  }
`}</style>

      <div className="flex items-start justify-between gap-4 opacity-0 animate-[fadeUp_500ms_ease-out_forwards]">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Reviews
          </h1>
          <p className="mt-2 text-slate-400 text-sm">
            {product?.title ? (
              <>
                For:{" "}
                <span className="text-slate-200 font-bold">
                  {product.title}
                </span>{" "}
                •{" "}
              </>
            ) : null}
            Total: {totalCount} review{totalCount === 1 ? "" : "s"}
          </p>
        </div>

        {/* ✅ Write review: if bundle, we don't allow writing on bundle directly */}
        {!isBundle ? (
          <Link
            to={`/review/${product?._id}`}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl
                       bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition"
          >
            Write a review
          </Link>
        ) : (
          <div className="text-slate-400 text-sm">
            Review individual items inside the bundle.
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-8 text-slate-300 opacity-0 animate-[fadeUp_450ms_ease-out_forwards]">
          Loading...
        </div>
      ) : !isBundle ? (
        // ✅ SINGLE
        <div className="mt-8 space-y-4">
          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-slate-400">
              No reviews yet.
            </div>
          ) : (
            reviews.map((r, i) => {
              const isOwner =
                !!user &&
                !!r?.user?._id &&
                String(r.user._id) === String(user._id);

              return (
                <div
                  key={r._id}
                  style={animDelay(i, 60)}
                  className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 opacity-0 animate-[fadeUp_420ms_ease-out_forwards]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-white font-bold">
                        {r?.user?.name || "User"}
                      </div>
                      <div className="mt-1">
                        <Stars value={r?.rating} />
                      </div>
                    </div>
                    <div className="text-slate-500 text-xs">
                      {r?.createdAt
                        ? new Date(r.createdAt).toLocaleString()
                        : ""}
                    </div>
                  </div>

                  {r?.title && (
                    <div className="mt-3 text-slate-200 font-bold">
                      {r.title}
                    </div>
                  )}

                  {r?.comment && (
                    <p className="mt-2 text-slate-300 whitespace-pre-line">
                      {r.comment}
                    </p>
                  )}

                  {Array.isArray(r?.images) && r.images.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {r.images.map((img) => (
                        <a
                          key={img.public_id || img.url}
                          href={img.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-xl border border-slate-800"
                        >
                          <img
                            src={img.url}
                            alt="review"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* ✅ owner actions */}
                  {isOwner && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        to={`/review/${product?._id}?mode=edit`}
                        className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(product?._id)}
                        className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-500"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        // ✅ BUNDLE grouped
        <div className="mt-8 space-y-8">
          {children.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-slate-400">
              No reviews for bundle items yet.
            </div>
          ) : (
            children.map((x, ci) => (
              <div
                key={x?.product?._id}
                style={animDelay(ci, 90)}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 opacity-0 animate-[popIn_500ms_ease-out_forwards]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-white font-black text-xl">
                      {x?.product?.title || "Bundle item"}
                    </div>
                    <div className="mt-1 text-slate-400 text-sm">
                      {x?.reviews?.length || 0} review
                      {(x?.reviews?.length || 0) === 1 ? "" : "s"}
                    </div>
                  </div>

                  <Link
                    to={`/review/${x?.product?._id}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl
                               border border-slate-800 text-slate-200 hover:border-indigo-500/50 transition"
                  >
                    Review this item
                  </Link>
                </div>

                <div className="mt-5 space-y-4">
                  {(x?.reviews || []).length === 0 ? (
                    <div className="text-slate-400">
                      No reviews for this item.
                    </div>
                  ) : (
                    (x.reviews || []).map((r, ri) => {
                      const isOwner =
                        !!user &&
                        !!r?.user?._id &&
                        String(r.user._id) === String(user._id);

                      return (
                        <div
                          key={r._id}
                          style={animDelay(ri, 55)}
                          className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 opacity-0 animate-[fadeUp_420ms_ease-out_forwards]"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-white font-bold">
                                {r?.user?.name || "User"}
                              </div>
                              <div className="mt-1">
                                <Stars value={r?.rating} />
                              </div>
                            </div>
                            <div className="text-slate-500 text-xs">
                              {r?.createdAt
                                ? new Date(r.createdAt).toLocaleString()
                                : ""}
                            </div>
                          </div>

                          {r?.title && (
                            <div className="mt-3 text-slate-200 font-bold">
                              {r.title}
                            </div>
                          )}

                          {r?.comment && (
                            <p className="mt-2 text-slate-300 whitespace-pre-line">
                              {r.comment}
                            </p>
                          )}

                          {Array.isArray(r?.images) && r.images.length > 0 && (
                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {r.images.map((img) => (
                                <a
                                  key={img.public_id || img.url}
                                  href={img.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block overflow-hidden rounded-xl border border-slate-800"
                                >
                                  <img
                                    src={img.url}
                                    alt="review"
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                </a>
                              ))}
                            </div>
                          )}

                          {/* ✅ owner actions */}
                          {isOwner && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              <Link
                                to={`/review/${x?.product?._id}?mode=edit`}
                                className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                              >
                                Edit
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDelete(x?.product?._id)}
                                className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-500"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}
