import api from "./axiosInstance";

export async function registerUser(formData) {
  const res = await api.post("/auth/register", formData);
  return res.data;
}

export async function loginUser(credentials) {
  const res = await api.post("/auth/login", credentials);
  return res.data;
}

export async function getCurrentUser() {
  const res = await api.get("/auth/me");
  return res.data;
}
