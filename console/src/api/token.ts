/**
 * Get the API token for authenticated requests.
 * Used as Authorization: Bearer <token> per Qiniu MaaS API spec.
 */
import { useAuthStore } from "../stores/auth";

export function getApiToken(): string {
  return useAuthStore.getState().apiKey || "";
}
