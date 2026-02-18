import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getMyReview } from "../api/reviews";
import { toast } from "react-toastify";

export default function MyReviewPage() {
  const { productId } = useParams();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await getMyReview(productId);
        if (!alive) return;
        setReview(res.data?.review);
      } catch (e) {
        toast.error("Failed to load your review");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [productId]);

  if (loading) return <div className="text-slate-200 p-6">Loading...</div>;

  if (!review)
    return <div className="text-slate-400 p-6">Review not found.</div>;

  return (
    <main className="mx-auto max-w-3xl px-4 pt-12 pb-16">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h1 className="text-2xl font-black text-white mb-4">Your Review</h1>

        <div className="text-yellow-400 text-lg">
          {"★".repeat(review.rating)}
        </div>

        {review.title && (
          <div className="mt-3 text-slate-200 font-bold">{review.title}</div>
        )}

        <p className="mt-2 text-slate-300 whitespace-pre-line">
          {review.comment}
        </p>

        {review.images?.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {review.images.map((img) => (
              <img
                key={img.public_id || img.url}
                src={img.url}
                alt=""
                className="rounded-xl border border-slate-800"
              />
            ))}
          </div>
        )}

        <Link
          to={`/review/${productId}?mode=edit`}
          className="mt-6 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 transition"
        >
          Edit Review
        </Link>
      </div>
    </main>
  );
}
