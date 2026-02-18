import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import {
  canReviewProduct,
  createReview,
  getMyReview,
  updateMyReview,
  deleteMyReview,
} from "../api/reviews";

const StarPicker = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const active = n <= value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`text-2xl transition ${
              active ? "text-yellow-400" : "text-slate-700 hover:text-slate-500"
            }`}
            aria-label={`Rate ${n} star`}
            title={`${n} star`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
};

export default function ReviewFormPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const isEdit = useMemo(() => sp.get("mode") === "edit", [sp]);

  const [checking, setChecking] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [reason, setReason] = useState("");

  const [existingReview, setExistingReview] = useState(null);
  const [removePublicIds, setRemovePublicIds] = useState([]); // string[]

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");

  const [files, setFiles] = useState([]); // new File[]
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ---- initial load ----
  useEffect(() => {
    let alive = true;

    (async () => {
      setChecking(true);

      try {
        if (isEdit) {
          // edit mode: require existing review
          const my = await getMyReview(productId);
          if (!alive) return;

          const r = my.data?.review;
          setExistingReview(r || null);

          if (!r?._id) {
            toast.info("No existing review to edit.");
            navigate(-1);
            return;
          }

          setRating(Number(r.rating || 5));
          setTitle(r.title || "");
          setComment(r.comment || "");

          // In edit mode we allow submit without canReview check
          // (because you already reviewed)
          setCanReview(true);
          setReason("");
        } else {
          // create mode: check eligibility
          const res = await canReviewProduct(productId);
          if (!alive) return;

          const ok = !!res.data?.canReview;
          setCanReview(ok);
          setReason(res.data?.reason || "");
        }
      } catch (e) {
        const msg = e?.response?.data?.message || e.message || "Error";
        toast.error(msg);

        if (!alive) return;
        setCanReview(false);
        setReason("AUTH_OR_ERROR");
      } finally {
        if (alive) setChecking(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [productId, isEdit, navigate]);

  const onPickFiles = (e) => {
    const arr = Array.from(e.target.files || []);

    const existingCount =
      isEdit && existingReview ? existingReview.images?.length || 0 : 0;

    const removingCount = isEdit ? removePublicIds.length : 0;

    const availableSlots = Math.max(0, 5 - (existingCount - removingCount));
    const limited = arr.slice(0, availableSlots);

    if (arr.length > availableSlots) {
      toast.info(`You can add only ${availableSlots} more photo(s).`);
    }

    setFiles(limited);
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async (e) => {
    e.preventDefault();

    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      toast.error("Rating must be 1 to 5");
      return;
    }

    if (!canReview) {
      toast.info("You cannot review this product.");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("productId", productId);
      fd.append("rating", String(r));
      fd.append("title", title.trim());
      fd.append("comment", comment.trim());
      if (isEdit) {
        removePublicIds.forEach((pid) =>
          fd.append("removeImagePublicIds", pid),
        );
      }

      for (const f of files) fd.append("images", f);

      if (isEdit) {
        await updateMyReview(productId, fd);
        setRemovePublicIds([]);
        setFiles([]);

        toast.success("Review updated ✅");
      } else {
        await createReview(fd);
        toast.success("Review submitted ✅");
      }

      navigate(-1);
    } catch (e2) {
      toast.error(e2?.response?.data?.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    const ok = window.confirm("Delete your review? This cannot be undone.");
    if (!ok) return;

    setDeleting(true);
    try {
      await deleteMyReview(productId);
      toast.success("Review deleted ✅");
      navigate(-1);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to delete review");
    } finally {
      setDeleting(false);
    }
  };

  if (checking) {
    return (
      <main className="mx-auto max-w-3xl px-4 pt-12 pb-16 text-slate-200">
        Loading...
      </main>
    );
  }

  if (!canReview) {
    const msg =
      reason === "ALREADY_REVIEWED"
        ? "You already reviewed this product."
        : reason === "NOT_DELIVERED_OR_NOT_PURCHASED"
          ? "You can review only after the product is delivered."
          : "You cannot review this product.";

    return (
      <main className="mx-auto max-w-3xl px-4 pt-12 pb-16">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h1 className="text-2xl font-black text-white">
            {isEdit ? "Edit review" : "Write a review"}
          </h1>
          <p className="mt-2 text-slate-300">{msg}</p>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-5 inline-flex items-center justify-center px-4 py-2 rounded-xl
                       border border-slate-800 text-slate-200 hover:border-indigo-500/50 transition"
          >
            Go back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pt-12 pb-16">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">
              {isEdit ? "Edit review" : "Write a review"}
            </h1>
            <p className="mt-2 text-slate-400 text-sm">
              {isEdit
                ? "Update your rating/comment and optionally add new images (max 5)."
                : "Add rating, comment and up to 5 images."}
            </p>
          </div>

          {isEdit && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl
                         bg-rose-600 hover:bg-rose-500 text-white font-bold transition
                         disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>

        {/* Existing images preview (optional UI) */}
        {isEdit && existingReview?.images?.length > 0 && (
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-slate-300 font-bold text-sm">
              Existing photos
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {existingReview.images.map((img, idx) => {
                const pid = img.public_id;
                const marked = removePublicIds.includes(pid);

                return (
                  <div
                    key={pid || idx}
                    className={`rounded-xl border border-slate-800 bg-slate-950/40 p-2 ${
                      marked ? "opacity-50" : ""
                    }`}
                  >
                    <img
                      src={img.url}
                      alt="Review"
                      className="h-28 w-full rounded-lg object-cover"
                      loading="lazy"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        if (!pid) return;
                        setRemovePublicIds(
                          (prev) =>
                            prev.includes(pid)
                              ? prev.filter((x) => x !== pid) // undo
                              : [...prev, pid], // mark remove
                        );
                      }}
                      className={`mt-2 w-full rounded-lg px-3 py-2 text-xs font-bold transition ${
                        marked
                          ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                          : "bg-rose-600 text-white hover:bg-rose-500"
                      }`}
                    >
                      {marked ? "Undo remove" : "Remove"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 text-xs text-slate-500">
              Removed images will be deleted when you click <b>Save changes</b>.
            </div>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-6">
          <div>
            <div className="text-slate-300 font-bold mb-2">Rating</div>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          <div>
            <div className="text-slate-300 font-bold mb-2">
              Title (optional)
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-slate-200 outline-none focus:border-indigo-500/60"
              placeholder="Short summary"
              maxLength={80}
            />
          </div>

          <div>
            <div className="text-slate-300 font-bold mb-2">Review</div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full min-h-[140px] rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-slate-200 outline-none focus:border-indigo-500/60"
              placeholder="Share your experience..."
              maxLength={1000}
            />
          </div>

          <div>
            <div className="text-slate-300 font-bold mb-2">
              {isEdit ? "Add new photos (max 5)" : "Photos (max 5)"}
            </div>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onPickFiles}
              className="block w-full text-slate-300"
            />

            {files.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {files.map((f, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"
                  >
                    <div className="text-slate-300 text-xs break-all">
                      {f.name}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="mt-2 text-rose-400 text-xs hover:text-rose-300"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl
                         bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition
                         disabled:opacity-60"
            >
              {loading
                ? isEdit
                  ? "Saving..."
                  : "Submitting..."
                : isEdit
                  ? "Save changes"
                  : "Submit review"}
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl
                         border border-slate-800 text-slate-200 hover:border-indigo-500/50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
