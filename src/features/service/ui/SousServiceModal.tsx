import React, { useEffect, useState, useCallback } from "react";
import { apiClient } from "../../../shared/api/apiClient";
import { FiFolder } from "react-icons/fi";
import type { Service, SousService } from "../../../shared/types";

interface Props {
  service: Service;
  onClose: () => void;
  onSousServicesChange: () => void;
}

export const SousServiceModal: React.FC<Props> = ({
  service,
  onClose,
  onSousServicesChange,
}) => {
  const [sousServices, setSousServices] = useState<SousService[]>([]);
  const [nomSousService, setNomSousService] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const fetchSousServices = useCallback(async () => {
    setFetchError("");
    try {
      const data = await apiClient.get(`/services/${service.id}/sous-services`);
      setSousServices(data.sousServices || []);
    } catch (err) {
      const error = err as Error;
      console.error("Erreur fetching sous_services:", error);
      setFetchError(
        error.message || "Erreur lors du chargement des sous-services",
      );
    }
  }, [service.id]);

  useEffect(() => {
    fetchSousServices();
  }, [fetchSousServices]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomSousService.trim()) return;

    setLoading(true);
    try {
      await apiClient.post(`/services/${service.id}/sous-services`, {
        nom_sous_service: nomSousService.trim(),
      });

      setNomSousService("");
      await fetchSousServices();
      onSousServicesChange();
    } catch (err) {
      alert((err as Error).message || "Erreur lors de l'ajout du sous-service");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce sous-service ?")) return;

    try {
      await apiClient.delete(`/services/sous-services/${id}`);
      await fetchSousServices();
      onSousServicesChange();
    } catch (err) {
      alert((err as Error).message || "Erreur lors de la suppression");
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose()}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "500px" }}
      >
        <button className="modal-close-btn" onClick={onClose}>
          ×
        </button>
        <div className="auth-card-header" style={{ marginBottom: "2rem" }}>
          <div className="auth-card-icon"><FiFolder style={{ color: 'var(--primary-color)' }} /></div>
          <h2 className="auth-card-title">
            Sous-services pour : {service.nom_service}
          </h2>
        </div>

        <form
          className="auth-form"
          onSubmit={handleAdd}
          style={{ marginBottom: "2rem" }}
        >
          <div
            className="auth-input-group"
            style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}
          >
            <div style={{ flex: 1 }}>
              <label className="auth-input-label">
                Ajouter un sous-service
              </label>
              <input
                className="auth-input"
                type="text"
                value={nomSousService}
                onChange={(e) => setNomSousService(e.target.value)}
                placeholder="Nom du sous-service"
                required
              />
            </div>
            <button
              type="submit"
              className="primary-gradient-btn"
              disabled={loading}
              style={{ height: "48px", padding: "0 1rem", marginTop: 0 }}
            >
              {loading ? "..." : "Ajouter"}
            </button>
          </div>
        </form>

        {fetchError && (
          <div
            className="auth-message auth-message--error"
            style={{ marginBottom: "1rem" }}
          >
            {fetchError}
          </div>
        )}

        <div
          className="sous-service-list"
          style={{ maxHeight: "300px", overflowY: "auto" }}
        >
          {sousServices.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>
              Aucun sous-service n'a été créé.
            </p>
          ) : (
            <table className="premium-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th style={{ textAlign: "right", width: "60px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sousServices.map((ss) => (
                  <tr key={ss.id}>
                    <td className="font-bold">{ss.nom_sous_service}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="icon-btn delete"
                        onClick={() => handleDelete(ss.id)}
                        title="Supprimer"
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
