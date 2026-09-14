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

export async function forgotPassword(email) {
  const res = await api.post("/auth/forgot-password", { email });
  return res.data;
}

export async function resetPassword(token, newPassword) {
  const res = await api.post("/auth/reset-password", { token, newPassword });
  return res.data;
}
