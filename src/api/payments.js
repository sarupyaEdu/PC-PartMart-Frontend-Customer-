import api from "./api";

// ✅ Create Razorpay order on backend using mongo orderId
export const createRazorpayOrder = (orderId) =>
  api.post("/payments/create-order", { orderId });

// ✅ Verify payment on backend
export const verifyRazorpayPayment = (payload) =>
  api.post("/payments/verify", payload);

// ✅ When user closes Razorpay popup (release stock + cancel)
export const cancelRazorpayAttempt = (mongoOrderId, reason = "") =>
  api.post("/payments/cancel-attempt", { mongoOrderId, reason });

// ✅ Optional: retry by cloning (only if you want this later)
export const retryPayment = (oldOrderId) =>
  api.post("/payments/retry", { oldOrderId });
