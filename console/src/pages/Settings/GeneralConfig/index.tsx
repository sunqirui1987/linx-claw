import { useState, useEffect } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  message,
  Radio,
  Switch,
} from "@agentscope-ai/design";
import { Row, Col } from "antd";
import { useTranslation } from "react-i18next";
import api from "../../../api";
import styles from "./index.module.less";
import type { DefaultsConfig, DefaultsConfigRequest } from "../../../api/types";

function GeneralConfigPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeHoursEnabled, setActiveHoursEnabled] = useState(false);

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const config: DefaultsConfig = await api.getDefaultsConfig();
      const hb = config.heartbeat;
      form.setFieldsValue({
        heartbeat_every: hb?.every ?? "30m",
        heartbeat_target: hb?.target ?? "main",
        heartbeat_active_start: hb?.active_hours?.start ?? "08:00",
        heartbeat_active_end: hb?.active_hours?.end ?? "22:00",
        show_tool_details: config.show_tool_details,
        language: config.language,
      });
      setActiveHoursEnabled(!!hb?.active_hours);
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : t("generalConfig.loadFailed");
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const req: DefaultsConfigRequest = {
        heartbeat: {
          every: values.heartbeat_every,
          target: values.heartbeat_target,
          active_hours: activeHoursEnabled
            ? {
                start: values.heartbeat_active_start,
                end: values.heartbeat_active_end,
              }
            : null,
        },
        show_tool_details: values.show_tool_details,
        language: values.language,
      };
      setSaving(true);
      await api.updateDefaultsConfig(req);
      message.success(t("generalConfig.saveSuccess"));
    } catch (err) {
      if (err instanceof Error && "errorFields" in err) {
        return;
      }
      const errMsg =
        err instanceof Error ? err.message : t("generalConfig.saveFailed");
      message.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    fetchConfig();
  };

  return (
    <div className={styles.page}>
      {loading && (
        <div className={styles.centerState}>
          <span className={styles.stateText}>{t("common.loading")}</span>
        </div>
      )}

      {error && !loading && (
        <div className={styles.centerState}>
          <span className={styles.stateTextError}>{error}</span>
          <Button size="small" onClick={fetchConfig} style={{ marginTop: 12 }}>
            {t("environments.retry")}
          </Button>
        </div>
      )}

      <div style={{ display: loading || error ? "none" : "block" }}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>{t("generalConfig.title")}</h1>
            <p className={styles.description}>
              {t("generalConfig.description")}
            </p>
          </div>
        </div>

        <Card className={styles.formCard}>
          <Form form={form} layout="vertical" className={styles.form}>
            <div className={styles.sectionTitle}>
              {t("generalConfig.heartbeatSection")}
            </div>
            <Form.Item
              label={t("generalConfig.heartbeatEvery")}
              name="heartbeat_every"
              rules={[
                {
                  required: true,
                  message: t("generalConfig.heartbeatEveryRequired"),
                },
              ]}
              tooltip={t("generalConfig.heartbeatEveryTooltip")}
            >
              <Input
                placeholder="30m, 1h, 2h30m"
                style={{ maxWidth: 200 }}
              />
            </Form.Item>

            <Form.Item
              label={t("generalConfig.heartbeatTarget")}
              name="heartbeat_target"
              rules={[{ required: true }]}
              tooltip={t("generalConfig.heartbeatTargetTooltip")}
            >
              <Radio.Group>
                <Radio value="main">{t("generalConfig.targetMain")}</Radio>
                <Radio value="last">{t("generalConfig.targetLast")}</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item label={t("generalConfig.activeHours")}>
              <Switch
                checked={activeHoursEnabled}
                onChange={setActiveHoursEnabled}
              />
              <span style={{ marginLeft: 8 }}>
                {t("generalConfig.activeHoursHint")}
              </span>
            </Form.Item>

            {activeHoursEnabled && (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label={t("generalConfig.activeStart")}
                    name="heartbeat_active_start"
                    rules={[{ required: activeHoursEnabled }]}
                  >
                    <Input placeholder="08:00" style={{ maxWidth: 120 }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={t("generalConfig.activeEnd")}
                    name="heartbeat_active_end"
                    rules={[{ required: activeHoursEnabled }]}
                  >
                    <Input placeholder="22:00" style={{ maxWidth: 120 }} />
                  </Form.Item>
                </Col>
              </Row>
            )}

            <div className={styles.sectionTitle}>
              {t("generalConfig.displaySection")}
            </div>
            <Form.Item
              label={t("generalConfig.showToolDetails")}
              name="show_tool_details"
              valuePropName="checked"
              tooltip={t("generalConfig.showToolDetailsTooltip")}
            >
              <Switch />
            </Form.Item>

            <div className={styles.sectionTitle}>
              {t("generalConfig.languageSection")}
            </div>
            <Form.Item
              label={t("generalConfig.language")}
              name="language"
              rules={[{ required: true }]}
              tooltip={t("generalConfig.languageTooltip")}
            >
              <Radio.Group>
                <Radio value="zh">{t("generalConfig.languageZh")}</Radio>
                <Radio value="en">{t("generalConfig.languageEn")}</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item className={styles.buttonGroup}>
              <Button
                onClick={handleReset}
                disabled={saving}
                style={{ marginRight: 8 }}
              >
                {t("common.reset")}
              </Button>
              <Button type="primary" onClick={handleSave} loading={saving}>
                {t("common.save")}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
}

export default GeneralConfigPage;
