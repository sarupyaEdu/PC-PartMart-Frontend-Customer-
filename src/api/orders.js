import api from "./api";

export const createOrder = (payload) => api.post("/orders", payload);
export const myOrders = () => api.get("/orders/my");
export const getOrder = (id) => api.get(`/orders/${id}`);
export const requestRR = (id, payload) => api.post(`/orders/${id}/rr`, payload);
export const cancelRR = (id) => api.patch(`/orders/${id}/rr/cancel`);
export const cancelOrder = (id, payload) =>
  api.patch(`/orders/${id}/cancel`, payload);

// ✅ PARTIAL ITEM CANCEL (PLACED / CONFIRMED)
export const cancelItems = (id, payload) =>
  api.patch(`/orders/${id}/cancel-items`, payload);
