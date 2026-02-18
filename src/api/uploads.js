import api from "./api";

export const uploadAvatar = (file) => {
  const fd = new FormData();
  fd.append("image", file);
  return api.post("/uploads/avatar", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
