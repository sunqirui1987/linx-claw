import { useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import ChatLayout from "../ChatLayout";
import ConsoleLayout from "../ConsoleLayout";
import Chat from "../../pages/Chat";
import Login from "../../pages/Login";
import ChannelsPage from "../../pages/Control/Channels";
import SessionsPage from "../../pages/Control/Sessions";
import CronJobsPage from "../../pages/Control/CronJobs";
import AgentConfigPage from "../../pages/Agent/Config";
import SkillsPage from "../../pages/Agent/Skills";
import WorkspacePage from "../../pages/Agent/Workspace";
import MCPPage from "../../pages/Agent/MCP";
import ModelsPage from "../../pages/Settings/Models";
import GeneralConfigPage from "../../pages/Settings/GeneralConfig";
import ServiceCapabilitiesPage from "../../pages/Settings/ServiceCapabilities";
import EnvironmentsPage from "../../pages/Settings/Environments";
import { useAuthStore, type AuthState } from "../../stores/auth";
import { agentApi } from "../../api/modules/agent";

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated);
  const apiKey = useAuthStore((s: AuthState) => s.apiKey);
  const checkAuth = useAuthStore((s: AuthState) => s.checkAuth);
  const logout = useAuthStore((s: AuthState) => s.logout);
  const isLoginPage = location.pathname === "/login";
  const isChat = location.pathname === "/chat" || location.pathname === "/";

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (location.pathname === "/") {
      navigate("/chat", { replace: true });
    }
  }, [location.pathname, navigate]);

  // Auth guard: require login for all pages except /login
  const hasAuth = isAuthenticated || !!apiKey;
  useEffect(() => {
    if (!hasAuth && !isLoginPage) {
      navigate("/login", { replace: true });
    } else if (hasAuth && isLoginPage) {
      navigate("/chat", { replace: true });
    }
  }, [hasAuth, isLoginPage, navigate]);

  // On startup, verify the stored key is still valid via init-status.
  // If the backend cleared an invalid key, needs_init=true -> force re-login.
  useEffect(() => {
    if (!hasAuth || isLoginPage) return;
    agentApi.getInitStatus().then((res) => {
      if (res.needs_init) {
        logout();
        navigate("/login", { replace: true });
      }
    }).catch(() => {
      // Backend unreachable — don't force logout, let the user proceed.
    });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasAuth) {
    return <Login />;
  }

  if (isChat) {
    return (
      <ChatLayout>
        <Routes>
          <Route path="/chat" element={<Chat />} />
          <Route path="/" element={<Chat />} />
        </Routes>
      </ChatLayout>
    );
  }

  return (
    <ConsoleLayout>
      <Routes>
        <Route path="/channels" element={<ChannelsPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/cron-jobs" element={<CronJobsPage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/mcp" element={<MCPPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/models" element={<ModelsPage />} />
        <Route path="/general-config" element={<GeneralConfigPage />} />
        <Route path="/service-capabilities" element={<ServiceCapabilitiesPage />} />
        <Route path="/environments" element={<EnvironmentsPage />} />
        <Route path="/agent-config" element={<AgentConfigPage />} />
      </Routes>
    </ConsoleLayout>
  );
}
