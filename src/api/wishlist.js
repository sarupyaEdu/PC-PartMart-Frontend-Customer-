import api from "./api";

// GET wishlist product IDs (for heart icons)
export const getWishlistIds = async () => {
  const res = await api.get("/wishlist/ids");
  return res.data?.data || [];
};

// TOGGLE wishlist (add/remove)
export const toggleWishlist = async (productId) => {
  const res = await api.post(`/wishlist/toggle/${productId}`);
  return res.data;
};

// GET full wishlist (wishlist page)
export const getWishlist = async () => {
  const res = await api.get("/wishlist");
  return res.data;
};

// OPTIONAL
export const clearWishlist = async () => {
  const res = await api.delete("/wishlist/clear");
  return res.data;
};
