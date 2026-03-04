import { request } from "../request";

// Root API
export const rootApi = {
  readRoot: () => request<unknown>("/"),
  getVersion: () => request<{ version: string }>("/version"),
  getServerInfo: () => request<{ base_url: string }>("/server-info"),
};
