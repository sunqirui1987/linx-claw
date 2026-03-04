import { Layout, Menu, type MenuProps } from "antd";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api";
import {
  MessageSquare,
  Radio,
  Zap,
  MessageCircle,
  Wifi,
  UsersRound,
  CalendarClock,
  Sparkles,
  Briefcase,
  Cpu,
  Box,
  Globe,
  Settings,
  Plug,
  SlidersHorizontal,
  Server,
} from "lucide-react";

const { Sider } = Layout;

const keyToPath: Record<string, string> = {
  chat: "/chat",
  channels: "/channels",
  sessions: "/sessions",
  "cron-jobs": "/cron-jobs",
  skills: "/skills",
  mcp: "/mcp",
  workspace: "/workspace",
  models: "/models",
  "general-config": "/general-config",
  "service-capabilities": "/service-capabilities",
  environments: "/environments",
  "agent-config": "/agent-config",
};

interface SidebarProps {
  selectedKey: string;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export default function Sidebar({
  selectedKey,
  collapsed = false,
  onCollapse,
}: SidebarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [openKeys, setOpenKeys] = useState<string[]>([
    "chat-group",
    "control-group",
    "agent-group",
    "settings-group",
  ]);
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    api
      .getVersion()
      .then((res) => setVersion(res?.version ?? ""))
      .catch(() => {});
  }, []);

  const menuItems: MenuProps["items"] = [
    {
      key: "chat-group",
      label: t("nav.chat"),
      icon: <MessageSquare size={16} />,
      children: [
        {
          key: "chat",
          label: t("nav.chat"),
          icon: <MessageCircle size={16} />,
        },
      ],
    },
    {
      key: "control-group",
      label: t("nav.control"),
      icon: <Radio size={16} />,
      children: [
        {
          key: "channels",
          label: t("nav.channels"),
          icon: <Wifi size={16} />,
        },
        {
          key: "sessions",
          label: t("nav.sessions"),
          icon: <UsersRound size={16} />,
        },
        {
          key: "cron-jobs",
          label: t("nav.cronJobs"),
          icon: <CalendarClock size={16} />,
        },
      ],
    },
    {
      key: "agent-group",
      label: t("nav.agent"),
      icon: <Zap size={16} />,
      children: [
        {
          key: "workspace",
          label: t("nav.workspace"),
          icon: <Briefcase size={16} />,
        },
        {
          key: "skills",
          label: t("nav.skills"),
          icon: <Sparkles size={16} />,
        },
        {
          key: "mcp",
          label: t("nav.mcp"),
          icon: <Plug size={16} />,
        },
        {
          key: "agent-config",
          label: t("nav.agentConfig"),
          icon: <Settings size={16} />,
        },
      ],
    },
    {
      key: "settings-group",
      label: t("nav.settings"),
      icon: <Cpu size={16} />,
      children: [
        {
          key: "models",
          label: t("nav.models"),
          icon: <Box size={16} />,
        },
        {
          key: "general-config",
          label: t("nav.generalConfig"),
          icon: <SlidersHorizontal size={16} />,
        },
        {
          key: "service-capabilities",
          label: t("nav.serviceCapabilities"),
          icon: <Server size={16} />,
        },
        {
          key: "environments",
          label: t("nav.environments"),
          icon: <Globe size={16} />,
        },
      ],
    },
  ];

  return (
    <Sider
      width={260}
      collapsedWidth={80}
      collapsible
      collapsed={collapsed}
      onCollapse={(c) => onCollapse?.(c)}
      style={{
        background: "#141414",
        borderRight: "1px solid #303030",
      }}
    >
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "flex-end",
          padding: collapsed ? "0 16px 10px" : "0 24px 10px",
          fontWeight: 600,
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#4f46e5",
            letterSpacing: "0.02em",
          }}
        >
          LinCraw
        </span>
        {!collapsed && version && (
          <span
            style={{
              fontSize: 11,
              color: "#8c8c8c",
              fontWeight: 400,
              lineHeight: 1,
            }}
          >
            v{version}
          </span>
        )}
      </div>
      <Menu
        mode="inline"
        inlineCollapsed={collapsed}
        selectedKeys={[selectedKey]}
        openKeys={collapsed ? [] : openKeys}
        onOpenChange={(keys) => !collapsed && setOpenKeys(keys as string[])}
        onClick={(info: { key: string | number }) => {
          const key = String(info.key);
          const path = keyToPath[key];
          if (path) {
            navigate(path);
          }
        }}
        items={menuItems}
        style={{
          height: "calc(100vh - 64px)",
          borderRight: "none",
          background: "transparent",
        }}
      />
    </Sider>
  );
}
