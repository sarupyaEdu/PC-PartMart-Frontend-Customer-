import api from "./api"; // same axios instance you use elsewhere

export const canReviewProduct = (productId) =>
  api.get(`/reviews/can-review/${productId}`);

export const listProductReviews = (productId) =>
  api.get(`/reviews/product/${productId}`);

// ✅ bundle grouped reviews endpoint
export const listBundleReviews = (bundleId) =>
  api.get(`/reviews/bundle/${bundleId}`);

export const createReview = (formData) =>
  api.post(`/reviews`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getMyReview = (productId) => api.get(`/reviews/me/${productId}`);

export const updateMyReview = (productId, formData) =>
  api.put(`/reviews/me/${productId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteMyReview = (productId) =>
  api.delete(`/reviews/me/${productId}`);
