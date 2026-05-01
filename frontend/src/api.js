import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const WS_URL = (import.meta.env.VITE_WS_URL || "ws://localhost:8000") + "/ws/monitor";

export const api = axios.create({ baseURL: BASE_URL });

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const refresh = localStorage.getItem("refresh_token");
    if (err.response?.status === 401 && refresh && !err.config._retry) {
      err.config._retry = true;
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refresh,
        });
        localStorage.setItem("access_token", data.access_token);
        err.config.headers.Authorization = `Bearer ${data.access_token}`;
        return axios(err.config);
      } catch {
        localStorage.clear();
        window.location.href = "/";
      }
    }
    return Promise.reject(err);
  }
);
