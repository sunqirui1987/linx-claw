export interface AgentRequest {
  input: unknown;
  session_id?: string | null;
  user_id?: string | null;
  channel?: string | null;
  [key: string]: unknown;
}

export interface AgentsRunningConfig {
  max_iters: number;
  max_input_length: number;
}

export interface ActiveHoursConfig {
  start: string;
  end: string;
}

export interface HeartbeatConfig {
  every: string;
  target: string;
  active_hours?: ActiveHoursConfig | null;
}

export interface DefaultsConfig {
  heartbeat: HeartbeatConfig | null;
  show_tool_details: boolean;
  language: string;
}

export interface DefaultsConfigRequest {
  heartbeat?: {
    every: string;
    target: string;
    active_hours?: { start: string; end: string } | null;
  } | null;
  show_tool_details: boolean;
  language: string;
}
