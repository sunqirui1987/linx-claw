import { Modal, Button, Alert, Steps } from "antd";
import { SafetyCertificateOutlined, SettingOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface InitModalProps {
  open: boolean;
  onClose: () => void;
}

export default function InitModal({ open, onClose }: InitModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const handleAccept = () => {
    setStep(1);
  };

  const handleGoToModels = () => {
    onClose();
    navigate("/models");
  };

  const handleGoToGeneral = () => {
    onClose();
    navigate("/general-config");
  };

  const handleLater = () => {
    onClose();
  };

  return (
    <Modal
      open={open}
      closable={step > 0}
      onCancel={step > 0 ? onClose : undefined}
      footer={null}
      width={560}
      title={t("init.title")}
      maskClosable={false}
    >
      <Steps
        current={step}
        size="small"
        style={{ marginBottom: 20 }}
        items={[
          { title: t("init.securityTitle"), icon: <SafetyCertificateOutlined /> },
          { title: t("init.startConfig"), icon: <SettingOutlined /> },
        ]}
      />

      {step === 0 && (
        <>
          <Alert
            type="info"
            showIcon
            message={t("init.securityTitle")}
            description={
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                  fontSize: 13,
                  margin: 0,
                }}
              >
                {t("init.securityDesc")}
              </pre>
            }
            style={{ marginBottom: 16 }}
          />
          <div style={{ textAlign: "right" }}>
            <Button type="primary" onClick={handleAccept}>
              {t("init.acceptSecurity")}
            </Button>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <p style={{ marginBottom: 16 }}>{t("init.configSteps")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Button
              type="primary"
              icon={<SettingOutlined />}
              onClick={handleGoToModels}
              block
              size="large"
            >
              {t("init.goToModels")}
            </Button>
            <Button onClick={handleGoToGeneral} block>
              {t("init.goToGeneral")}
            </Button>
            <Button type="link" onClick={handleLater}>
              {t("init.later")}
            </Button>
          </div>
          <p style={{ marginTop: 16, color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
            {t("init.afterConfigHint")}
          </p>
        </>
      )}
    </Modal>
  );
}
