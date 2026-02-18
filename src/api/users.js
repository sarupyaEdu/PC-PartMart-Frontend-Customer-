import api from "./api";

// profile
export const getMyProfile = () => api.get("/users/me");
export const updateMyProfile = (payload) => api.put("/users/me", payload);
