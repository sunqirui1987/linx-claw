import { request } from "../request";
import type {
  AgentRequest,
  AgentsRunningConfig,
  DefaultsConfig,
  DefaultsConfigRequest,
} from "../types";

// Agent API
export const agentApi = {
  agentRoot: () => request<unknown>("/agent/"),

  healthCheck: () => request<unknown>("/agent/health"),

  agentApi: (body: AgentRequest) =>
    request<unknown>("/agent/process", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getProcessStatus: () => request<unknown>("/agent/admin/status"),

  shutdownSimple: () =>
    request<void>("/agent/shutdown", {
      method: "POST",
    }),

  shutdown: () =>
    request<void>("/agent/admin/shutdown", {
      method: "POST",
    }),

  getAgentRunningConfig: () =>
    request<AgentsRunningConfig>("/agent/running-config"),

  updateAgentRunningConfig: (config: AgentsRunningConfig) =>
    request<AgentsRunningConfig>("/agent/running-config", {
      method: "PUT",
      body: JSON.stringify(config),
    }),

  getDefaultsConfig: () => request<DefaultsConfig>("/agent/defaults-config"),

  updateDefaultsConfig: (config: DefaultsConfigRequest) =>
    request<DefaultsConfig>("/agent/defaults-config", {
      method: "PUT",
      body: JSON.stringify(config),
    }),

  installMdTemplates: (language: string) =>
    request<{ copied: string[]; language: string }>(
      "/agent/install-md-templates",
      {
        method: "POST",
        body: JSON.stringify({ language }),
      }
    ),

  getInitStatus: () =>
    request<{ needs_init: boolean; reason?: string }>("/agent/init-status"),
};
