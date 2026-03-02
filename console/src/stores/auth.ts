import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getApiUrl } from "../api/config";

const AUTH_STORAGE_KEY = "aicraw_console_auth";

export interface AuthState {
  apiKey: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      apiKey: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (apiKey: string) => {
        set({ isLoading: true });
        try {
          const url = getApiUrl("auth/login");
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiKey: apiKey.trim() }),
          });
          const data = (await resp.json()) as { success?: boolean; error?: string };
          if (data.success) {
            set({ apiKey: apiKey.trim(), isAuthenticated: true, isLoading: false });
            return { success: true };
          }
          set({ isLoading: false });
          return { success: false, error: data.error || "API Key 无效" };
        } catch (err) {
          set({ isLoading: false });
          return {
            success: false,
            error: err instanceof Error ? err.message : "网络错误，请稍后重试",
          };
        }
      },

      logout: () => {
        set({ apiKey: null, isAuthenticated: false });
      },

      checkAuth: () => {
        const { apiKey } = get();
        set({ isAuthenticated: !!apiKey });
      },
    }),
    { name: AUTH_STORAGE_KEY }
  )
);
