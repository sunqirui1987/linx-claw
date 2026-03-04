import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useAuthStore } from "../stores/auth";
import ConsoleCronBubble from "../components/ConsoleCronBubble";
import InitModal from "../components/InitModal";
import { useState, useEffect } from "react";
import { agentApi } from "../api/modules/agent";
import {
  MessageSquare,
  Radio,
  Zap,
  Cpu,
  Wifi,
  UsersRound,
  CalendarClock,
  Briefcase,
  Sparkles,
  Plug,
  Settings,
  Box,
  SlidersHorizontal,
  Globe,
  Server,
} from "lucide-react";
import api from "../api";
import styles from "./ConsoleLayout.module.less";

const keyToPath: Record<string, string> = {
  chat: "/chat",
  channels: "/channels",
  sessions: "/sessions",
  "cron-jobs": "/cron-jobs",
  workspace: "/workspace",
  skills: "/skills",
  mcp: "/mcp",
  "agent-config": "/agent-config",
  models: "/models",
  "general-config": "/general-config",
  "service-capabilities": "/service-capabilities",
  environments: "/environments",
};

const keyToLabel: Record<string, string> = {
  channels: "nav.channels",
  sessions: "nav.sessions",
  "cron-jobs": "nav.cronJobs",
  workspace: "nav.workspace",
  skills: "nav.skills",
  mcp: "nav.mcp",
  "agent-config": "nav.agentConfig",
  models: "nav.models",
  "general-config": "nav.generalConfig",
  "service-capabilities": "nav.serviceCapabilities",
  environments: "nav.environments",
};

const navGroups = [
  {
    key: "control",
    labelKey: "nav.control",
    icon: Radio,
    items: [
      { key: "channels", icon: Wifi },
      { key: "sessions", icon: UsersRound },
      { key: "cron-jobs", icon: CalendarClock },
    ],
  },
  {
    key: "agent",
    labelKey: "nav.agent",
    icon: Zap,
    items: [
      { key: "workspace", icon: Briefcase },
      { key: "skills", icon: Sparkles },
      { key: "mcp", icon: Plug },
      { key: "agent-config", icon: Settings },
    ],
  },
  {
    key: "settings",
    labelKey: "nav.settings",
    icon: Cpu,
    items: [
      { key: "models", icon: Box },
      { key: "general-config", icon: SlidersHorizontal },
      { key: "service-capabilities", icon: Server },
      { key: "environments", icon: Globe },
    ],
  },
];

interface ConsoleLayoutProps {
  children: React.ReactNode;
}

export default function ConsoleLayout({ children }: ConsoleLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const logout = useAuthStore((s: { logout: () => void }) => s.logout);
  const [showInitModal, setShowInitModal] = useState(false);
  const [version, setVersion] = useState("");

  const currentPath = location.pathname;
  const selectedKey = Object.entries(keyToPath).find(
    ([, path]) => path === currentPath,
  )?.[0];

  useEffect(() => {
    api.getVersion().then((res) => setVersion(res?.version ?? "")).catch(() => {});
  }, []);

  useEffect(() => {
    if (
      currentPath === "/models" ||
      currentPath === "/general-config" ||
      currentPath === "/service-capabilities"
    )
      return;
    agentApi
      .getInitStatus()
      .then((res) => setShowInitModal(res.needs_init))
      .catch(() => setShowInitModal(false));
  }, [currentPath]);

  return (
    <div className={styles.consoleLayout}>
      <header className={styles.consoleHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>LinCraw</span>
          {version && (
            <span className={styles.version}>v{version}</span>
          )}
          <button
            type="button"
            className={styles.chatQuickBtn}
            onClick={() => navigate("/chat")}
          >
            <MessageSquare size={16} />
            <span>{t("nav.chat")}</span>
          </button>
        </div>
        <div className={styles.headerRight}>
          <LanguageSwitcher />
        </div>
      </header>

      <nav className={styles.nav}>
        {navGroups.map((group) => (
          <div key={group.key} className={styles.navGroup}>
            <span className={styles.navGroupLabel}>
              {t(group.labelKey)}
            </span>
            <div className={styles.navItems}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = selectedKey === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                    onClick={() => navigate(keyToPath[item.key])}
                  >
                    <Icon size={18} />
                    <span>{t(keyToLabel[item.key])}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className={styles.navGroupLogout}>
          <button
            type="button"
            className={styles.navItem}
            onClick={() => {
              logout();
              navigate("/login");
            }}
            title={t("login.logout")}
          >
            <LogOut size={18} />
            <span>{t("login.logout")}</span>
          </button>
        </div>
      </nav>

      <main className={styles.consoleContent}>{children}</main>

      <InitModal open={showInitModal} onClose={() => setShowInitModal(false)} />
      <ConsoleCronBubble />
    </div>
  );
}
