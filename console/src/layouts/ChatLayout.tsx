import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useAuthStore } from "../stores/auth";
import ConsoleCronBubble from "../components/ConsoleCronBubble";
import InitModal from "../components/InitModal";
import { useState, useEffect } from "react";
import { agentApi } from "../api/modules/agent";
import styles from "./ChatLayout.module.less";

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const logout = useAuthStore((s: { logout: () => void }) => s.logout);
  const [showInitModal, setShowInitModal] = useState(false);

  useEffect(() => {
    agentApi
      .getInitStatus()
      .then((res) => setShowInitModal(res.needs_init))
      .catch(() => setShowInitModal(false));
  }, []);

  return (
    <div className={styles.chatLayout}>
      <div className={styles.chatHeader}>
        <div className={styles.chatHeaderLeft}>
          <span className={styles.logo}>LinCraw</span>
          <span className={styles.chatTitle}>Chat</span>
        </div>
        <div className={styles.chatHeaderRight}>
          <button
            type="button"
            className={styles.dashboardBtn}
            onClick={() => navigate("/channels")}
          >
            <LayoutDashboard size={18} />
            <span>Console</span>
          </button>
          <button
            type="button"
            className={styles.dashboardBtn}
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
      </div>

      <div className={styles.chatBody}>{children}</div>

      <InitModal open={showInitModal} onClose={() => setShowInitModal(false)} />
      <ConsoleCronBubble />
    </div>
  );
}
