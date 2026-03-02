import { useState } from "react";
import { Button, message } from "@agentscope-ai/design";
import { CheckOutlined } from "@ant-design/icons";
import type { ModelInfo } from "../../../../../api/types";
import api from "../../../../../api";
import { useTranslation } from "react-i18next";
import styles from "../../index.module.less";

interface ModelSquareProps {
  providerId: string;
  providerName: string;
  models: ModelInfo[];
  activeModel?: string;
  hasApiKey: boolean;
  onSaved: () => void;
  onConfigureProvider?: () => void;
}

export function ModelSquare({
  providerId,
  providerName,
  models,
  activeModel,
  hasApiKey,
  onSaved,
  onConfigureProvider,
}: ModelSquareProps) {
  const { t } = useTranslation();
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleSelectModel = async (modelId: string) => {
    if (!hasApiKey) {
      onConfigureProvider?.();
      return;
    }
    setSavingId(modelId);
    try {
      await api.setActiveLlm({ provider_id: providerId, model: modelId });
      message.success(t("models.llmModelUpdated"));
      onSaved();
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : t("models.failedToSave");
      message.error(errMsg);
    } finally {
      setSavingId(null);
    }
  };

  if (!hasApiKey) {
    return (
      <div className={styles.modelSquareEmpty}>
        <p className={styles.modelSquareEmptyText}>
          {t("models.modelSquareLoginHint", { name: providerName })}
        </p>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className={styles.modelSquareEmpty}>
        <p className={styles.modelSquareEmptyText}>{t("models.noModels")}</p>
      </div>
    );
  }

  return (
    <div className={styles.modelSquare}>
      <div className={styles.modelSquareGrid}>
        {models.map((m) => {
          const isActive = activeModel === m.id;
          return (
            <div
              key={m.id}
              className={`${styles.modelSquareCard} ${
                isActive ? styles.modelSquareCardActive : ""
              }`}
            >
              <div className={styles.modelSquareCardBody}>
                <div className={styles.modelSquareCardName}>{m.name}</div>
                <div className={styles.modelSquareCardId}>{m.id}</div>
              </div>
              <div className={styles.modelSquareCardActions}>
                <Button
                  type={isActive ? "primary" : "default"}
                  size="small"
                  loading={savingId === m.id}
                  icon={isActive ? <CheckOutlined /> : undefined}
                  onClick={() => handleSelectModel(m.id)}
                >
                  {isActive ? t("models.activeModel") : t("models.useModel")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
