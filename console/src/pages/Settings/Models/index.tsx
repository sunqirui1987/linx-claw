import { useMemo } from "react";
import { useProviders } from "./useProviders";
import { PageHeader, LoadingState, ModelSquare } from "./components";
import { useTranslation } from "react-i18next";
import styles from "./index.module.less";

const QNAIGC_ID = "qnaigc";

/* ------------------------------------------------------------------ */
/* Main Page — 七牛模型广场（登入 API Key 即七牛云 API Key）                    */
/* ------------------------------------------------------------------ */

function ModelsPage() {
  const { t } = useTranslation();
  const { providers, activeModels, loading, error, fetchAll } = useProviders();

  const qnaigc = useMemo(
    () => providers.find((p) => p.id === QNAIGC_ID),
    [providers],
  );

  return (
    <div className={styles.page}>
      {loading ? (
        <LoadingState message={t("models.loading")} />
      ) : error ? (
        <LoadingState message={error} error onRetry={fetchAll} />
      ) : (
        <>
          <PageHeader
            title={t("models.modelSquareTitle")}
            description={t("models.modelSquareDescription")}
          />
          <ModelSquare
            providerId={QNAIGC_ID}
            providerName={qnaigc?.name ?? "Qiniu MaaS"}
            models={qnaigc?.models ?? []}
            activeModel={
              activeModels?.active_llm?.provider_id === QNAIGC_ID
                ? activeModels.active_llm.model
                : undefined
            }
            hasApiKey={!!qnaigc?.has_api_key}
            onSaved={fetchAll}
          />
        </>
      )}
    </div>
  );
}

export default ModelsPage;
