import api from "./api";
export const listBrands = (params = {}) => {
  return api.get("/brands", {
    params: { status: "active", limit: 100, ...params },
  });
};
