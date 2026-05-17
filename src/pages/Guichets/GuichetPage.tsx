import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDynamicPageSize } from "../../shared/hooks/useDynamicPageSize";
import { apiClient } from "../../shared/api/apiClient";
import type { Guichet, UserRole, Service, GuichetService } from "../../shared/types";
import { FiTag, FiTool } from "react-icons/fi";
import "./GuichetPage.css";

interface Props {
  userRole: UserRole;
  currentUserAgenceId: string | null;
}

const GUICHET_OPTIONS = Array.from(
  { length: 20 },
  (_, i) => `Guichet ${i + 1}`,
);

export const GuichetPage: React.FC<Props> = ({
  userRole,
  currentUserAgenceId,
}) => {
  const [guichets, setGuichets] = useState<Guichet[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [selectedGuichet, setSelectedGuichet] = useState(GUICHET_OPTIONS[0]);
  const [appellation, setAppellation] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // États pour l'affectation des services
  const [services, setServices] = useState<Service[]>([]);
  const [assignments, setAssignments] = useState<GuichetService[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedGuichetForServices, setSelectedGuichetForServices] = useState("");
  const [localSelectedServices, setLocalSelectedServices] = useState<string[]>([]);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { itemsPerPage, needsPagination } = useDynamicPageSize(
    tableContainerRef,
    GUICHET_OPTIONS.length,
  );

  const fetchData = useCallback(async () => {
    if (!currentUserAgenceId) return;
    setLoading(true);
    try {
      const [guichetRes, serviceRes, assignRes] = await Promise.all([
        apiClient.get(`/guichets?agence_id=${currentUserAgenceId}`),
        apiClient.get('/services'),
        apiClient.get(`/guichets/services?agence_id=${currentUserAgenceId}`)
      ]);
      
      setGuichets(guichetRes.guichets || []);
      setServices(serviceRes.services || []);
      setAssignments(assignRes.guichetServices || []);
    } catch (err) {
      console.error("Erreur lors de la récupération des données:", (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [currentUserAgenceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (
    guichetName?: string,
    currentAppellation?: string,
  ) => {
    setSelectedGuichet(guichetName || GUICHET_OPTIONS[0]);
    setAppellation(currentAppellation || "");
    setMessage("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!currentUserAgenceId) return;
    setLoading(true);
    setMessage("");

    try {
      await apiClient.post('/guichets', {
        nom_guichet: selectedGuichet,
        appellation: appellation.trim() === "" ? null : appellation.trim(),
        agence_id: currentUserAgenceId,
      });

      setIsSuccess(true);
      setMessage("Appellation enregistrée avec succès");
      await fetchData();

      setTimeout(() => {
        setShowModal(false);
        setMessage("");
      }, 1500);
    } catch (err) {
      setIsSuccess(false);
      setMessage((err as Error).message || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (nomGuichet: string) => {
    if (!currentUserAgenceId) return;
    if (
      !confirm(
        `Voulez-vous vraiment réinitialiser l'appellation du ${nomGuichet} ?`,
      )
    )
      return;

    setLoading(true);
    try {
      await apiClient.delete(`/guichets?nom_guichet=${encodeURIComponent(nomGuichet)}&agence_id=${currentUserAgenceId}`);
      await fetchData();
    } catch (err) {
      alert("Erreur: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (userRole !== "admin" && userRole !== "super_admin") {
    return <div className="auth-permission-denied">Accès non autorisé</div>;
  }

  const allGuichetsDisplay = GUICHET_OPTIONS.map((opt) => {
    const dbGuichet = guichets.find((g) => g.nom_guichet === opt);
    const assignedServices = assignments
      .filter(a => a.nom_guichet === opt)
      .map(a => a.service?.nom_service)
      .filter(Boolean) as string[];

    return {
      nom_guichet: opt,
      appellation: dbGuichet?.appellation || null,
      isConfigured: !!dbGuichet,
      services: assignedServices
    };
  });

  const handleOpenServiceModal = (nomGuichet: string) => {
    setSelectedGuichetForServices(nomGuichet);
    const alreadyAssigned = assignments
      .filter((a) => a.nom_guichet === nomGuichet)
      .map((a) => a.service_id);
    setLocalSelectedServices(alreadyAssigned);
    setShowServiceModal(true);
  };

  const handleToggleLocalService = (serviceId: string) => {
    setLocalSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSaveServices = async () => {
    if (!currentUserAgenceId) return;
    setLoading(true);
    try {
      await apiClient.post('/guichets/services', {
        nom_guichet: selectedGuichetForServices,
        agence_id: currentUserAgenceId,
        service_ids: localSelectedServices
      });
      await fetchData();
      setShowServiceModal(false);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="services-page">
      <header className="page-header">
        <div className="header-text">
          <h1>Gestion des Guichets</h1>
          <p>
            Configurez les appellations personnalisées de vos guichets (ex:
            Caisse Principale)
          </p>
        </div>
        <button
          className="primary-gradient-btn"
          onClick={() => handleOpenModal()}
        >
          + Configurer une Appellation
        </button>
      </header>

      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => !loading && setShowModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setShowModal(false)}
            >
              ×
            </button>
            <div className="auth-card-header" style={{ marginBottom: "2rem" }}>
              <div className="auth-card-icon"><FiTag style={{ color: 'var(--primary-color)' }} /></div>
              <h2 className="auth-card-title">Appellation du Guichet</h2>
              <p className="auth-card-subtitle">
                Définissez le nom public du guichet
              </p>
            </div>

            <div className="auth-form">
              <div className="auth-input-group">
                <label className="auth-input-label">
                  Identifiant Technique
                </label>
                <select
                  className="auth-select"
                  value={selectedGuichet}
                  onChange={(e) => setSelectedGuichet(e.target.value)}
                  disabled={loading}
                >
                  {GUICHET_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">
                  Appellation Publique (Optionnel)
                </label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Ex: Caisse 1, Bureau des entrées..."
                  value={appellation}
                  onChange={(e) => setAppellation(e.target.value)}
                  disabled={loading}
                />
              </div>

              {message && (
                <div
                  className={`auth-message ${isSuccess ? "auth-message--success" : "auth-message--error"}`}
                  style={{ marginTop: "1rem" }}
                >
                  {message}
                </div>
              )}

              <div
                className="modal-actions"
                style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}
              >
                <button
                  className="auth-button"
                  style={{ flex: 1 }}
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button
                  className="auth-button secondary"
                  style={{ flex: 1, background: "#f1f5f9", color: "#64748b" }}
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showServiceModal && (
        <div className="modal-overlay" onClick={() => !loading && setShowServiceModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowServiceModal(false)}>×</button>
            <div className="auth-card-header" style={{ marginBottom: "2rem" }}>
              <div className="auth-card-icon"><FiTool style={{ color: 'var(--primary-color)' }} /></div>
              <h2 className="auth-card-title">Services du {selectedGuichetForServices}</h2>
              <p className="auth-card-subtitle">Cochez les services que ce guichet doit traiter</p>
            </div>
            
            <div className="services-checklist-container" style={{ maxHeight: "300px", overflowY: "auto", marginBottom: "2rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.8rem" }}>
                {services.map((service) => (
                  <label key={service.id} className={`checklist-item-compact ${localSelectedServices.includes(service.id) ? "checked" : ""}`} style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0.8rem",
                    borderRadius: "8px",
                    background: localSelectedServices.includes(service.id) ? "#f0fdf4" : "#f8fafc",
                    border: `1px solid ${localSelectedServices.includes(service.id) ? "#22c55e" : "#e2e8f0"}`,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}>
                    <input
                      type="checkbox"
                      checked={localSelectedServices.includes(service.id)}
                      onChange={() => handleToggleLocalService(service.id)}
                      style={{ marginRight: "12px", width: "18px", height: "18px" }}
                    />
                    <span style={{ fontWeight: 500, color: localSelectedServices.includes(service.id) ? "#166534" : "#475569" }}>
                      {service.nom_service}
                    </span>
                  </label>
                ))}
              </div>
              {services.length === 0 && <p style={{ textAlign: "center", color: "#64748b" }}>Aucun service disponible.</p>}
            </div>

            <div className="modal-actions" style={{ display: "flex", gap: "1rem" }}>
              <button className="auth-button" onClick={handleSaveServices} disabled={loading} style={{ flex: 1 }}>
                {loading ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button className="auth-button secondary" onClick={() => setShowServiceModal(false)} disabled={loading} style={{ flex: 1 }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="content-card" ref={tableContainerRef}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Identifiant</th>
              <th>Appellation Publique</th>
              <th>Statut</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allGuichetsDisplay
              .slice(
                (currentPage - 1) * itemsPerPage,
                currentPage * itemsPerPage,
              )
              .map((g) => (
                <tr key={g.nom_guichet}>
                  <td className="font-bold">{g.nom_guichet}</td>
                  <td>
                    {g.appellation ? (
                      <span
                        style={{ color: "var(--primary)", fontWeight: 600 }}
                      >
                        {g.appellation}
                      </span>
                    ) : (
                      <span className="text-secondary">
                        Non défini (utilisera l'identifiant)
                      </span>
                    )}
                  </td>

                  <td>
                    {g.isConfigured && g.appellation ? (
                      <span className="status-badge user">Personnalisé</span>
                    ) : (
                      <span className="status-badge priority">Par défaut</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>

                    <button
                      className="icon-btn edit"
                      onClick={() =>
                        handleOpenModal(g.nom_guichet, g.appellation || "")
                      }
                      title="Modifier l'appellation"
                      style={{ marginRight: "8px" }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    {g.isConfigured && (
                      <button
                        className="icon-btn delete"
                        onClick={() => handleDelete(g.nom_guichet)}
                        title="Réinitialiser"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {needsPagination && (
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              ←
            </button>
            {Array.from(
              { length: Math.ceil(allGuichetsDisplay.length / itemsPerPage) },
              (_, i) => i + 1,
            ).map((page) => (
              <button
                key={page}
                className={`pagination-btn ${currentPage === page ? "active" : ""}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="pagination-btn"
              disabled={
                currentPage ===
                Math.ceil(allGuichetsDisplay.length / itemsPerPage)
              }
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              →
            </button>
            <span className="pagination-info">
              {allGuichetsDisplay.length} guichet
              {allGuichetsDisplay.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
