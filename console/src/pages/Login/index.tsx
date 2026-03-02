import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Alert } from "antd";
import { KeyOutlined, LoginOutlined } from "@ant-design/icons";
import { useAuthStore } from "../../stores/auth";
import { useTranslation } from "react-i18next";
import styles from "./index.module.less";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: { apiKey: string }) => {
    const apiKey = values.apiKey?.trim();
    if (!apiKey) return;

    setError(null);
    const res = await login(apiKey);
    if (res.success) {
      navigate("/chat", { replace: true });
    } else {
      setError(res.error || t("login.failed"));
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("login.title")}</h1>
          <p className={styles.subtitle}>{t("login.subtitle")}</p>
        </div>

        <Form
          name="login"
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
          autoComplete="off"
        >
          <Form.Item
            name="apiKey"
            label={t("login.apiKeyLabel")}
            rules={[
              { required: true, message: t("login.apiKeyRequired") },
              {
                validator: (_, value) => {
                  const v = (value || "").trim();
                  if (!v) return Promise.resolve();
                  if (!v.startsWith("sk-")) {
                    return Promise.reject(
                      new Error(t("login.apiKeyInvalidPrefix"))
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input.Password
              prefix={<KeyOutlined style={{ color: "#bfbfbf" }} />}
              placeholder="sk-xxxxxxxxxxxxxxxx"
            />
          </Form.Item>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{
                marginBottom: 16,
                background: "#f5f5f5",
                borderColor: "#d9d9d9",
              }}
            />
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              block
              icon={<LoginOutlined />}
              className={styles.submitBtn}
              style={{
                height: 44,
                background: "#1a1a1a",
                borderColor: "#1a1a1a",
              }}
            >
              {t("login.submit")}
            </Button>
          </Form.Item>
        </Form>

        <p className={styles.hint}>{t("login.hint")}</p>
      </div>
    </div>
  );
}
