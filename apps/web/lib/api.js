import axios from "axios";
// need dotenv
import dotenv from "dotenv";
dotenv.config();

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  timeout: 15000,
});

// Attach token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("bm_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("bm_token");
      localStorage.removeItem("bm_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export default api;
