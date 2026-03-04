import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Input,
  message,
  Switch,
  Form,
} from "@agentscope-ai/design";
import { Space, Typography } from "antd";
import { useTranslation } from "react-i18next";
import api from "../../../api";
import styles from "./index.module.less";

// 灵矽配置指南参考图
import lingxiGuideImage from "./image.png";

/** 获取后端服务地址的兜底值：优先 .env 的 BASE_URL，否则当前 origin；开发时 vite 在 5174、后端在 8088 则用默认 */
function getBaseUrlFallback(): string {
  const base = typeof BASE_URL !== "undefined" && BASE_URL ? BASE_URL : "";
  if (base) return base.replace(/\/+$/, "");
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (origin.includes(":5174") || origin.includes(":5173")) {
      return "http://127.0.0.1:8088";
    }
    return origin;
  }
  return "http://127.0.0.1:8088";
}

declare const BASE_URL: string;

function ServiceCapabilitiesPage() {
  const { t } = useTranslation();
  const [baseUrl, setBaseUrl] = useState(getBaseUrlFallback());
  const [apiKey, setApiKey] = useState("");
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [defaultsConfig, setDefaultsConfig] = useState<{
    heartbeat?: { every: string; target: string; active_hours?: { start: string; end: string } | null };
    show_tool_details?: boolean;
    language?: string;
  } | null>(null);
  const [demoInput, setDemoInput] = useState("你好，请简单介绍一下自己");
  const [demoOutput, setDemoOutput] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);
  const [streamMode, setStreamMode] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const chatUrl = baseUrl ? `${baseUrl}/v1/chat/completions` : "";

  useEffect(() => {
    api
      .getServerInfo()
      .then((res) => setBaseUrl(res?.base_url || getBaseUrlFallback()))
      .catch(() => setBaseUrl(getBaseUrlFallback()));
  }, []);

  useEffect(() => {
    api
      .getDefaultsConfig()
      .then((config) => {
        setApiKey(config?.openai_api_key ?? "");
        setDefaultsConfig({
          heartbeat: config?.heartbeat ?? undefined,
          show_tool_details: config?.show_tool_details ?? true,
          language: config?.language ?? "zh",
        });
      })
      .catch(() => {});
  }, []);

  const handleSaveApiKey = async () => {
    setApiKeySaving(true);
    try {
      await api.updateDefaultsConfig({
        heartbeat: defaultsConfig?.heartbeat ?? undefined,
        show_tool_details: defaultsConfig?.show_tool_details ?? true,
        language: defaultsConfig?.language ?? "zh",
        openai_api_key: apiKey,
      });
      message.success(t("common.save"));
    } catch (err) {
      if (err instanceof Error && "errorFields" in err) return;
      message.error(err instanceof Error ? err.message : String(err));
    } finally {
      setApiKeySaving(false);
    }
  };

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      message.success(t("common.copied"));
      setTimeout(() => setCopied(null), 1500);
    } catch {
      message.error(t("common.copyFailed"));
    }
  };

  const handleDemo = async () => {
    if (!apiKey) {
      message.warning(t("serviceCapabilities.apiKeyRequired"));
      return;
    }
    if (!chatUrl) {
      message.warning(t("serviceCapabilities.serverUrlRequired"));
      return;
    }
    setDemoLoading(true);
    setDemoOutput("");
    try {
      const body = {
        messages: [{ role: "user", content: demoInput }],
        stream: streamMode,
      };
      const res = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.text();
        setDemoOutput(`Error ${res.status}: ${err}`);
        return;
      }
      if (streamMode && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
          for (const line of lines) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const obj = JSON.parse(data);
              const content = obj?.choices?.[0]?.delta?.content;
              if (content) {
                full += content;
                setDemoOutput(full);
              }
            } catch {
              // skip invalid json
            }
          }
        }
      } else {
        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content ?? "";
        setDemoOutput(content || JSON.stringify(json, null, 2));
      }
    } catch (err) {
      setDemoOutput(
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setDemoLoading(false);
    }
  };

  const curlExample = chatUrl
    ? `curl -X POST '${chatUrl}' \\
  -H 'Authorization: Bearer <API_KEY>' \\
  -H 'Content-Type: application/json' \\
  -d '{"messages":[{"role":"user","content":"你好"}],"stream":true}'`
    : "";

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {t("serviceCapabilities.title")}
          </h1>
          <p className={styles.description}>
            {t("serviceCapabilities.description")}
          </p>
        </div>
      </div>

      <Card className={styles.card} title={t("serviceCapabilities.apiKeyConfig")}>
        <Form layout="vertical">
          <Form.Item>
            <Typography.Text strong>
              {t("serviceCapabilities.apiKeyLabel")}
            </Typography.Text>
            <Input.Password
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t("serviceCapabilities.apiKeyPlaceholder")}
              autoComplete="off"
              className={styles.apiKeyInput}
            />
            <p className={styles.hint}>
              {t("serviceCapabilities.apiKeyHint")}
            </p>
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              onClick={handleSaveApiKey}
              loading={apiKeySaving}
            >
              {t("common.save")}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card className={styles.card} title={t("serviceCapabilities.apiInfo")}>
        <div className={styles.section}>
          <Typography.Text strong>
            {t("serviceCapabilities.baseUrl")}
          </Typography.Text>
          <div className={styles.codeRow}>
            <code className={styles.code}>{baseUrl || "-"}</code>
            {baseUrl && (
              <Button
                size="small"
                type="text"
                onClick={() => handleCopy(baseUrl, "base")}
              >
                {copied === "base" ? "✓" : t("serviceCapabilities.copy")}
              </Button>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <Typography.Text strong>
            {t("serviceCapabilities.chatEndpoint")}
          </Typography.Text>
          <div className={styles.codeRow}>
            <code className={styles.code}>
              POST {chatUrl || "-"}
            </code>
            {chatUrl && (
              <Button
                size="small"
                type="text"
                onClick={() => handleCopy(chatUrl, "chat")}
              >
                {copied === "chat" ? "✓" : t("serviceCapabilities.copy")}
              </Button>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <Typography.Text strong>
            {t("serviceCapabilities.auth")}
          </Typography.Text>
          <p className={styles.hint}>
            {t("serviceCapabilities.authHint")}
          </p>
        </div>

        {curlExample && (
          <div className={styles.section}>
            <Typography.Text strong>
              {t("serviceCapabilities.curlExample")}
            </Typography.Text>
            <pre className={styles.pre}>
              <code>{curlExample}</code>
            </pre>
            <Button
              size="small"
              onClick={() => handleCopy(curlExample, "curl")}
            >
              {copied === "curl" ? "✓" : t("serviceCapabilities.copy")}
            </Button>
          </div>
        )}
      </Card>

      <Card className={styles.card} title={t("serviceCapabilities.lingxiGuide")}>
        <div className={styles.section}>
          <Typography.Paragraph>
            {t("serviceCapabilities.lingxiGuideDesc")}
          </Typography.Paragraph>
          <div className={styles.guideImageWrap}>
            <img
              src={lingxiGuideImage}
              alt={t("serviceCapabilities.lingxiGuide")}
              className={styles.guideImage}
            />
          </div>
        </div>
        <div className={styles.section}>
          <Typography.Text strong>
            {t("serviceCapabilities.lingxiSteps")}
          </Typography.Text>
          <ol className={styles.guideSteps}>
            <li>{t("serviceCapabilities.lingxiStep1")}</li>
            <li>{t("serviceCapabilities.lingxiStep2")}</li>
            <li>{t("serviceCapabilities.lingxiStep3")}</li>
            <li>{t("serviceCapabilities.lingxiStep4")}</li>
          </ol>
        </div>
        <div className={styles.section}>
          <Typography.Text strong>
            {t("serviceCapabilities.lingxiFields")}
          </Typography.Text>
          <p className={styles.hint}>{t("serviceCapabilities.lingxiFieldsHint")}</p>
          <div className={styles.fieldTable}>
            <div className={styles.fieldRow}>
              <span className={styles.fieldName}>{t("serviceCapabilities.lingxiFieldName")}</span>
              <span className={styles.fieldValue}>Aicraw</span>
              <Button size="small" type="text" onClick={() => handleCopy("Aicraw", "lingxi-name")}>
                {copied === "lingxi-name" ? "✓" : t("serviceCapabilities.copy")}
              </Button>
            </div>
            <div className={styles.fieldRow}>
              <span className={styles.fieldName}>{t("serviceCapabilities.lingxiFieldType")}</span>
              <span className={styles.fieldValue}>OpenAI接口</span>
              <Button size="small" type="text" onClick={() => handleCopy("OpenAI接口", "lingxi-type")}>
                {copied === "lingxi-type" ? "✓" : t("serviceCapabilities.copy")}
              </Button>
            </div>
            <div className={styles.fieldRow}>
              <span className={styles.fieldName}>{t("serviceCapabilities.lingxiFieldBaseUrl")}</span>
              <span className={styles.fieldValue}>{baseUrl || "-"}</span>
              {baseUrl && (
                <Button size="small" type="text" onClick={() => handleCopy(baseUrl, "lingxi-base")}>
                  {copied === "lingxi-base" ? "✓" : t("serviceCapabilities.copy")}
                </Button>
              )}
            </div>
            <div className={styles.fieldRow}>
              <span className={styles.fieldName}>{t("serviceCapabilities.lingxiFieldModel")}</span>
              <span className={styles.fieldValue}>aicraw</span>
              <Button size="small" type="text" onClick={() => handleCopy("aicraw", "lingxi-model")}>
                {copied === "lingxi-model" ? "✓" : t("serviceCapabilities.copy")}
              </Button>
            </div>
            <div className={styles.fieldRow}>
              <span className={styles.fieldName}>{t("serviceCapabilities.lingxiFieldApiKey")}</span>
              <span className={styles.fieldValue}>
                {apiKey ? (apiKey.includes("*") ? t("serviceCapabilities.lingxiApiKeyMasked") : "••••••••") : "-"}
              </span>
              {apiKey && (
                <Button
                  size="small"
                  type="text"
                  onClick={() => {
                    if (apiKey.includes("*")) {
                      message.warning(t("serviceCapabilities.lingxiApiKeyCopyHint"));
                    } else {
                      handleCopy(apiKey, "lingxi-key");
                    }
                  }}
                >
                  {copied === "lingxi-key" ? "✓" : t("serviceCapabilities.copy")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className={styles.card} title={t("serviceCapabilities.demo")}>
        <div className={styles.section}>
          <Typography.Text strong>
            {t("serviceCapabilities.demoInput")}
          </Typography.Text>
          <Input.TextArea
            value={demoInput}
            onChange={(e) => setDemoInput(e.target.value)}
            placeholder={t("serviceCapabilities.demoInputPlaceholder")}
            rows={3}
            className={styles.textArea}
          />
        </div>
        <div className={styles.section}>
          <Space>
            <Typography.Text strong>
              {t("serviceCapabilities.streamMode")}
            </Typography.Text>
            <Switch
              checked={streamMode}
              onChange={setStreamMode}
            />
          </Space>
        </div>
        <div className={styles.section}>
          <Button
            type="primary"
            onClick={handleDemo}
            loading={demoLoading}
          >
            {t("serviceCapabilities.send")}
          </Button>
        </div>
        {demoOutput && (
          <div className={styles.section}>
            <Typography.Text strong>
              {t("serviceCapabilities.demoOutput")}
            </Typography.Text>
            <pre className={styles.output}>{demoOutput}</pre>
          </div>
        )}
      </Card>
    </div>
  );
}

export default ServiceCapabilitiesPage;
