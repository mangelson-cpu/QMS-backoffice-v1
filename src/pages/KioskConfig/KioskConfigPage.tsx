import React, { useState } from "react";
import { FiLock, FiSave, FiCheck, FiAlertCircle } from "react-icons/fi";
import { apiClient } from "../../shared/api/apiClient";

export const KioskConfigPage: React.FC = () => {
  const [kioskPassword, setKioskPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleKioskPasswordSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      const data = await apiClient.post("/agences/kiosk-password", {
        password: kioskPassword,
      });

      setMessage(data.message || "Opération réussie.");
      setIsSuccess(true);
      setKioskPassword("");
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || "Erreur lors de la mise à jour.");
      setIsSuccess(false);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  return (
    <div className="agences-page" style={{ padding: "2rem" }}>
      <header className="page-header" style={{ marginBottom: "2rem" }}>
        <div className="header-text">
          <h1>
            <FiLock
              size={28}
              style={{ verticalAlign: "middle", marginRight: "0.5rem" }}
            />
            Sécurité de la Borne
          </h1>
          <p>Gérez le verrouillage des bornes de votre agence</p>
        </div>
      </header>

      <div className="content-card settings-card" style={{ padding: "2rem" }}>
        <div className="settings-section-panel">
          <div className="header-text" style={{ marginBottom: "1.5rem" }}>
            <h2>Paramètres d'accès public</h2>
            <p style={{ marginTop: "0.5rem", color: "var(--text-secondary)" }}>
              Définissez un mot de passe pour verrouiller l'accès aux bornes
              après un redémarrage (ex: coupure de courant). Laissez vide puis
              sauvegardez pour désactiver le verrouillage.
            </p>
          </div>

          <div style={{ maxWidth: "400px" }}>
            <div className="auth-input-group">
              <label className="auth-input-label">Nouveau mot de passe de la borne</label>
              <input
                className="auth-input"
                type="password"
                value={kioskPassword}
                onChange={(e) => setKioskPassword(e.target.value)}
                placeholder="Ex: 1234, ou motdepasse"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                }}
              />
            </div>

            <div className="settings-actions" style={{ marginTop: "1.5rem" }}>
              <button
                className="primary-gradient-btn"
                onClick={handleKioskPasswordSave}
                disabled={saving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "8px",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <FiSave size={18} />
                {saving ? "Enregistrement..." : "Appliquer la sécurité"}
              </button>
            </div>

            {message && (
              <div
                className={`auth-message ${isSuccess ? "auth-message--success" : "auth-message--error"
                  }`}
                style={{
                  marginTop: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  backgroundColor: isSuccess ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  color: isSuccess ? "#15803d" : "#ef4444",
                }}
              >
                {isSuccess ? <FiCheck size={16} /> : <FiAlertCircle size={16} />}
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
