import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  listProductReviews,
  listBundleReviews,
  canReviewProduct,
} from "../api/reviews";

const TabType = {
  OVERVIEW: "overview",
  SPECS: "specs",
  COMPAT: "compat",
  VIDEO: "video",
  WARRANTY: "warranty",
  REVIEWS: "reviews", // ✅ NEW
};

const Stars = ({ value = 0 }) => {
  const v = Math.max(0, Math.min(5, Number(value || 0)));
  const full = Math.round(v);
  return (
    <div className="text-yellow-400 text-sm font-extrabold tracking-wide">
      {"★".repeat(full)}
      <span className="text-slate-600 font-bold">{"★".repeat(5 - full)}</span>
    </div>
  );
};

export default function ProductTabs({ product, videoEmbed }) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(TabType.OVERVIEW);

  const type = product?.type || "SINGLE";
  const isBundle = type === "BUNDLE";

  // ✅ Reviews state
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviews, setReviews] = useState([]); // single
  const [bundleChildrenReviews, setBundleChildrenReviews] = useState([]); // bundle grouped

  // ✅ canReview state
  const [checkingCanReview, setCheckingCanReview] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [canReviewReason, setCanReviewReason] = useState("");

  const toYouTubeEmbedUrl = (url) => {
    if (!url) return "";
    try {
      const u = new URL(String(url).trim());
      if (u.hostname.includes("youtu.be")) {
        const id = u.pathname.split("/").filter(Boolean)[0];
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : "";
      }
      if (u.hostname.includes("youtube.com")) {
        const id = u.searchParams.get("v");
        if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
        const parts = u.pathname.split("/").filter(Boolean);
        const embedIndex = parts.indexOf("embed");
        if (embedIndex !== -1 && parts[embedIndex + 1]) {
          return `https://www.youtube-nocookie.com/embed/${parts[embedIndex + 1]}`;
        }
      }
      return "";
    } catch {
      return "";
    }
  };

  const bundleItems = Array.isArray(product?.bundleItems)
    ? product.bundleItems
    : [];

  const tabs = [
    { id: TabType.OVERVIEW, label: "Overview" },
    { id: TabType.SPECS, label: "Technical Specs" },
    { id: TabType.COMPAT, label: "Compatibility" },
    { id: TabType.WARRANTY, label: "Warranty" },
    { id: TabType.VIDEO, label: "Video Showcase" },
    { id: TabType.REVIEWS, label: "Reviews" }, // ✅ NEW
  ];

  const keySpecs = useMemo(
    () =>
      Array.isArray(product?.specs?.keySpecs) ? product.specs.keySpecs : [],
    [product],
  );

  const compatibility = useMemo(
    () =>
      Array.isArray(product?.specs?.compatibility)
        ? product.specs.compatibility
        : [],
    [product],
  );

  const requirements = useMemo(
    () =>
      Array.isArray(product?.specs?.requirements)
        ? product.specs.requirements
        : [],
    [product],
  );

  const warrantyText = useMemo(() => {
    const txt = String(product?.warranty?.text || "").trim();
    if (txt) return txt;

    const months = Number(product?.warranty?.months || 0);
    if (!months) return "No warranty information available.";

    if (months % 12 === 0) {
      const years = months / 12;
      return `${years} Year${years > 1 ? "s" : ""} Warranty`;
    }
    return `${months} Month${months > 1 ? "s" : ""} Warranty`;
  }, [product]);

  // ✅ fetch reviews + canReview ONLY when Reviews tab opens
  useEffect(() => {
    if (activeTab !== TabType.REVIEWS) return;
    if (!product?._id) return;

    let alive = true;

    (async () => {
      try {
        setLoadingReviews(true);

        // 1) canReview (this endpoint expects a productId)
        setCheckingCanReview(true);
        try {
          const r = await canReviewProduct(product._id);
          if (!alive) return;
          setCanReview(!!r.data?.canReview);
          setCanReviewReason(r.data?.reason || "");
        } catch (e) {
          if (!alive) return;
          setCanReview(false);
          setCanReviewReason("");
        } finally {
          if (alive) setCheckingCanReview(false);
        }

        // 2) list reviews
        if (!isBundle) {
          const res = await listProductReviews(product._id);
          if (!alive) return;
          setReviews(res.data?.reviews || []);
        } else {
          // ✅ bundle: needs a backend endpoint returning grouped reviews per child
          const res = await listBundleReviews(product._id);
          if (!alive) return;
          setBundleChildrenReviews(res.data?.children || []);
        }
      } catch (e) {
        console.log("REVIEWS FETCH ERROR:", e?.response?.data || e.message);
        if (alive) {
          setReviews([]);
          setBundleChildrenReviews([]);
        }
      } finally {
        if (alive) setLoadingReviews(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [activeTab, product?._id, isBundle]);

  const goWriteReview = (productId) => {
    if (!productId) return;
    navigate(`/review/${productId}`);
  };

  const renderReviewCard = (r) => {
    const name = r?.user?.name || "User";
    const avatar = r?.user?.avatar?.url || r?.user?.avatar || "";
    return (
      <div
        key={r._id}
        className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-slate-600 font-black">
                  {String(name).slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="text-white font-extrabold">{name}</div>
              <div className="mt-1">
                <Stars value={r?.rating} />
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            {r?.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
          </div>
        </div>

        {r?.title ? (
          <div className="mt-4 text-slate-200 font-bold">{r.title}</div>
        ) : null}

        <div className="mt-2 text-slate-400 whitespace-pre-line">
          {r?.comment || "—"}
        </div>

        {Array.isArray(r?.images) && r.images.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {r.images.map((img) => (
              <img
                key={img.public_id || img.url}
                src={img.url}
                alt=""
                className="h-24 w-24 rounded-2xl object-cover border border-slate-800"
                loading="lazy"
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case TabType.OVERVIEW:
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-8">
            {!isBundle && (
              <p className="text-slate-400 leading-relaxed text-lg whitespace-pre-line">
                {product?.longDescription || product?.description || "—"}
              </p>
            )}

            {isBundle && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white">
                  Included Items
                </h3>

                {bundleItems.map((it, idx) => {
                  const ip = it?.product || {};
                  const itemName =
                    ip?.title ||
                    ip?.name ||
                    ip?.productName ||
                    `Item ${idx + 1}`;

                  return (
                    <div
                      key={ip?._id || idx}
                      className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
                    >
                      <h4 className="text-lg font-extrabold text-indigo-400 mb-2">
                        {itemName}
                      </h4>

                      <p className="text-slate-400 whitespace-pre-line">
                        {ip?.longDescription || ip?.description || "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case TabType.SPECS:
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-8">
            {!isBundle && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                {(keySpecs.length ? keySpecs : ["—"]).map((spec, i) => {
                  const [label, ...rest] = spec.split(":");
                  const value = rest.join(":").trim();

                  return (
                    <div
                      key={i}
                      className="flex justify-between border-b border-slate-800 py-4 items-center gap-6"
                    >
                      <span className="text-slate-500 font-medium">
                        {value ? label.trim() : "Spec"}
                      </span>
                      <span className="text-white font-bold text-right">
                        {value || spec}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {isBundle &&
              bundleItems.map((it, idx) => {
                const ip = it?.product || {};
                const specs = Array.isArray(ip?.specs?.keySpecs)
                  ? ip.specs.keySpecs
                  : [];

                const itemName =
                  ip?.title || ip?.name || ip?.productName || `Item ${idx + 1}`;

                return (
                  <div
                    key={ip?._id || idx}
                    className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
                  >
                    <h4 className="text-lg font-extrabold text-indigo-400 mb-4">
                      {itemName}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(specs.length ? specs : ["—"]).map((spec, i) => (
                        <div
                          key={i}
                          className="flex justify-between border-b border-slate-800 py-3 items-center gap-4"
                        >
                          <span className="text-slate-500">
                            {spec.split(":")[0]}
                          </span>
                          <span className="text-white font-bold text-right">
                            {spec.includes(":")
                              ? spec.split(":").slice(1).join(":")
                              : spec}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        );

      case TabType.COMPAT:
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-8">
            {!isBundle ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-indigo-400 font-bold mb-4 uppercase tracking-widest text-sm">
                    Compatible Ecosystems
                  </h4>
                  <ul className="space-y-3">
                    {(compatibility.length ? compatibility : ["—"]).map(
                      (item, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 text-slate-300"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </div>

                <div>
                  <h4 className="text-rose-400 font-bold mb-4 uppercase tracking-widest text-sm">
                    System Requirements
                  </h4>
                  <ul className="space-y-3">
                    {(requirements.length ? requirements : ["—"]).map(
                      (item, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 text-slate-300"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {bundleItems.map((it, idx) => {
                  const ip = it?.product || {};
                  const itemName =
                    ip?.title ||
                    ip?.name ||
                    ip?.productName ||
                    `Item ${idx + 1}`;

                  const comp = Array.isArray(ip?.specs?.compatibility)
                    ? ip.specs.compatibility
                    : [];
                  const req = Array.isArray(ip?.specs?.requirements)
                    ? ip.specs.requirements
                    : [];

                  return (
                    <div
                      key={ip?._id || idx}
                      className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
                    >
                      <h4 className="text-lg font-extrabold text-indigo-400 mb-4">
                        {itemName}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <h5 className="text-indigo-300 font-bold mb-3 uppercase tracking-widest text-xs">
                            Compatible Ecosystems
                          </h5>
                          <ul className="space-y-3">
                            {(comp.length ? comp : ["—"]).map((x, i) => (
                              <li
                                key={i}
                                className="flex items-center gap-3 text-slate-300"
                              >
                                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                {x}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h5 className="text-rose-300 font-bold mb-3 uppercase tracking-widest text-xs">
                            System Requirements
                          </h5>
                          <ul className="space-y-3">
                            {(req.length ? req : ["—"]).map((x, i) => (
                              <li
                                key={i}
                                className="flex items-center gap-3 text-slate-300"
                              >
                                <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                {x}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case TabType.WARRANTY:
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-8">
            {!isBundle && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <p className="text-slate-300 whitespace-pre-line">
                  {warrantyText}
                </p>
              </div>
            )}

            {isBundle &&
              bundleItems.map((it, idx) => {
                const ip = it?.product || {};
                const months = Number(ip?.warranty?.months || 0);
                const text =
                  ip?.warranty?.text ||
                  (months
                    ? `${months} Month${months > 1 ? "s" : ""} Warranty`
                    : "No warranty information");

                const itemName =
                  ip?.title || ip?.name || ip?.productName || `Item ${idx + 1}`;

                return (
                  <div
                    key={ip?._id || idx}
                    className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
                  >
                    <h4 className="text-lg font-extrabold text-indigo-400 mb-3">
                      {itemName}
                    </h4>
                    <p className="text-slate-300 whitespace-pre-line">{text}</p>
                  </div>
                );
              })}
          </div>
        );

      case TabType.VIDEO:
        if (!isBundle) {
          return videoEmbed ? (
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black animate-in fade-in slide-in-from-bottom-2 duration-500 shadow-2xl">
              <iframe
                className="w-full h-full"
                src={videoEmbed}
                title="Product Showcase Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          ) : (
            <div className="text-slate-400">No video available.</div>
          );
        }

        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
            {bundleItems.map((it, idx) => {
              const ip = it?.product || {};
              const itemName =
                ip?.title || ip?.name || ip?.productName || `Item ${idx + 1}`;

              const embed = toYouTubeEmbedUrl(ip?.youtubeUrl);

              return (
                <div
                  key={ip?._id || idx}
                  className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
                >
                  <h4 className="text-lg font-extrabold text-indigo-400 mb-4">
                    {itemName}
                  </h4>

                  {embed ? (
                    <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
                      <iframe
                        className="w-full h-full"
                        src={embed}
                        title={`${itemName} Video`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="text-slate-400">No video available.</div>
                  )}
                </div>
              );
            })}
          </div>
        );

      case TabType.REVIEWS:
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-white">Reviews</h3>
                <p className="text-slate-400 text-sm mt-1">
                  {isBundle
                    ? "Bundle reviews are shown per included item."
                    : "Customer reviews for this product."}
                </p>
              </div>

              {/* ✅ View All Button */}
              <button
                type="button"
                onClick={() => navigate(`/product/${product?.slug}/reviews`)}
                className="px-5 py-3 rounded-2xl font-extrabold uppercase tracking-widest text-sm bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95"
              >
                View All
              </button>
            </div>

            {/* ========================= */}
            {/* SINGLE PRODUCT PREVIEW */}
            {/* ========================= */}
            {!isBundle && (
              <>
                {loadingReviews ? (
                  <div className="text-slate-400">Loading reviews...</div>
                ) : reviews.length ? (
                  <div className="space-y-5">
                    {reviews.slice(0, 3).map(renderReviewCard)}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-slate-400">
                    No reviews yet.
                  </div>
                )}
              </>
            )}

            {/* ========================= */}
            {/* BUNDLE PREVIEW */}
            {/* ========================= */}
            {isBundle && (
              <>
                {loadingReviews ? (
                  <div className="text-slate-400">Loading reviews...</div>
                ) : bundleChildrenReviews.length ? (
                  <div className="space-y-8">
                    {bundleChildrenReviews.map((group) => {
                      const child = group?.product || {};
                      const childReviews = Array.isArray(group?.reviews)
                        ? group.reviews
                        : [];

                      return (
                        <div
                          key={child?._id}
                          className="rounded-3xl border border-slate-800 bg-slate-900/30 p-6"
                        >
                          <div className="text-lg font-black text-white mb-4">
                            {child?.title}
                          </div>

                          {childReviews.length ? (
                            <div className="space-y-4">
                              {childReviews.slice(0, 2).map(renderReviewCard)}
                            </div>
                          ) : (
                            <div className="text-slate-500 text-sm">
                              No reviews for this item yet.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-slate-400">
                    No reviews found for bundle items.
                  </div>
                )}
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className="mt-20 border-t border-slate-800 pt-16">
      <div className="flex flex-wrap gap-2 mb-12 border-b border-slate-800 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
            className={`relative px-6 py-4 text-sm font-bold uppercase tracking-widest transition-all ${
              activeTab === tab.id
                ? "text-indigo-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-t-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
            )}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">{renderContent()}</div>
    </div>
  );
}
