import api from "./api";

export const listProducts = (qs = {}) => api.get("/products", { params: qs });
export const getProductBySlug = (slug) => api.get(`/products/${slug}`);
export const bulkProducts = (ids) => api.post("/products/bulk", { ids });

