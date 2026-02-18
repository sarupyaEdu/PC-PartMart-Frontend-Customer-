import api from "./api";
export const registerUser = (payload) => api.post("/auth/register", payload);
export const loginUser = (payload) => api.post("/auth/login", payload);
export const meUser = () => api.get("/auth/me");
