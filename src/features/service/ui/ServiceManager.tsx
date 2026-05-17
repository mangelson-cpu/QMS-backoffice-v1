import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDynamicPageSize } from "../../../shared/hooks/useDynamicPageSize";
import { apiClient, setSelectedFiliale, getSelectedFiliale } from "../../../shared/api/apiClient";
import { FiTool, FiFilter } from "react-icons/fi";
import type { Service, UserRole } from "../../../shared/types";
import { SousServiceModal } from "./SousServiceModal";

interface Props {
  userRole: UserRole;
}

export const ServiceManager: React.FC<Props> = ({ userRole }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedServiceForSousService, setSelectedServiceForSousService] =
    useState<Service | null>(null);

  const [nomService, setNomService] = useState("");
  const [modalFilialeId, setModalFilialeId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { itemsPerPage, needsPagination } = useDynamicPageSize(
    tableContainerRef,
    services.length,
  );

  const isSuperAdmin = userRole === "super_admin";

  const [filiales, setFiliales] = useState<any[]>([]);
  const [selectedFilialeId, setSelectedFilialeIdState] = useState<string>(getSelectedFiliale() || "");

  // Charger les filiales au montage (super_admin)
  useEffect(() => {
    if (isSuperAdmin) {
      const load = async () => {
        try {
          const data = await apiClient.get('/filiales');
          setFiliales(data.filiales || []);
          if (!selectedFilialeId && data.filiales?.length > 0) {
            const firstId = data.filiales[0].id;
            setSelectedFilialeIdState(firstId);
            setSelectedFiliale(firstId);
          }
        } catch (err) { console.error('Erreur filiales:', err); }
      };
      load();
    }
  }, [isSuperAdmin]);

  const handleFilialeChange = (id: string) => {
    setSelectedFilialeIdState(id);
    setSelectedFiliale(id);
  };

  const fetchServices = useCallback(async (ignore: boolean = false) => {
    if (isSuperAdmin && !selectedFilialeId) return;
    setFetchError("");
    try {
      const data = await apiClient.get("/services");
      if (ignore) return;
      setServices(data.services || []);
      setCurrentPage(1);
    } catch (err) {
      if (ignore) return;
      const error = err as Error;
      console.error("Erreur lors de la récupération des services:", error);
      setFetchError(error.message || "Impossible de charger les services");
      setServices([]);
    }
  }, [selectedFilialeId, isSuperAdmin]);

  useEffect(() => {
    let ignore = false;
    fetchServices(ignore);
    return () => { ignore = true; };
  }, [fetchServices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomService.trim()) return;

    setLoading(true);
    setMessage("");

    // Appliquer la filiale du formulaire avant l'appel
    if (isSuperAdmin && modalFilialeId) {
      setSelectedFiliale(modalFilialeId);
    }

    try {
      if (editingService) {
        await apiClient.put(`/services/${editingService.id}`, { nom_service: nomService.trim() });
        setMessage("Service modifié avec succès");
      } else {
        await apiClient.post("/services", { nom_service: nomService.trim() });
        setMessage("Service créé avec succès");
      }

      setIsSuccess(true);

      setTimeout(() => {
        setShowModal(false);
        resetForm();
        setMessage("");
      }, 1000);

      await fetchServices();
    } catch (err) {
      const error = err as Error;
      console.error("Erreur handleSubmit:", error);
      setMessage(error.message || "Erreur lors de l'opération");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce service ?")) return;

    try {
      await apiClient.delete(`/services/${id}`);
      await fetchServices();
    } catch (err) {
      const error = err as Error;
      console.error("Erreur delette:", error);
      alert(error.message || "Erreur lors de la suppression");
    }
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setNomService(service.nom_service);
    if (selectedFilialeId) setModalFilialeId(selectedFilialeId);
    setShowModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    if (selectedFilialeId) setModalFilialeId(selectedFilialeId);
    setShowModal(true);
  };

  const resetForm = () => {
    setNomService("");
    setEditingService(null);
    setModalFilialeId("");
    setMessage("");
    setIsSuccess(false);
  };

  return (
    <div className="services-page">
      <header className="page-header">
        <div className="header-text">
          <h1>Gestion des services</h1>
          <p>Gérez les services de votre organisation</p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {isSuperAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "white", padding: "0.5rem 1rem", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <FiFilter color="var(--primary-color)" />
              <select
                value={selectedFilialeId}
                onChange={(e) => handleFilialeChange(e.target.value)}
                style={{ border: "none", outline: "none", background: "transparent", fontWeight: "bold", color: "var(--text-color)" }}
              >
                <option value="">Sélectionner une filiale</option>
                {filiales.map(f => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
            </div>
          )}
          {isSuperAdmin && (
            <button className="primary-gradient-btn" onClick={openCreateModal}>
              + Créer un service
            </button>
          )}
        </div>
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
              <div className="auth-card-icon"><FiTool style={{ color: 'var(--primary-color)' }} /></div>
              <h2 className="auth-card-title">
                {editingService ? "Modifier le service" : "Nouveau Service"}
              </h2>
              <p className="auth-card-subtitle">
                {editingService
                  ? "Modifiez le nom du service"
                  : "Remplissez les informations ci-dessous"}
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {isSuperAdmin && (
                <div className="auth-input-group">
                  <label className="auth-input-label">Filiale</label>
                  <select
                    className="auth-select"
                    value={modalFilialeId}
                    onChange={(e) => setModalFilialeId(e.target.value)}
                    required
                    style={{ width: "100%" }}
                  >
                    <option value="">Sélectionner une filiale</option>
                    {filiales.map(f => (
                      <option key={f.id} value={f.id}>{f.nom}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="auth-input-group">
                <label className="auth-input-label">Nom du service</label>
                <input
                  className="auth-input"
                  type="text"
                  value={nomService}
                  onChange={(e) => setNomService(e.target.value)}
                  placeholder="Ex: Dépôt, Retrait, Information..."
                  required
                />
              </div>
              <button type="submit" className="auth-button" disabled={loading}>
                {loading
                  ? editingService
                    ? "Modification..."
                    : "Création..."
                  : editingService
                    ? "Modifier"
                    : "Enregistrer le service"}
              </button>
              {message && (
                <div
                  className={`auth-message ${isSuccess ? "auth-message--success" : "auth-message--error"}`}
                  style={{ marginTop: "1rem" }}
                >
                  {message}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {selectedServiceForSousService && (
        <SousServiceModal
          service={selectedServiceForSousService}
          onClose={() => setSelectedServiceForSousService(null)}
          onSousServicesChange={() => fetchServices()}
        />
      )}

      <div className="content-card" ref={tableContainerRef}>
        {fetchError && (
          <div
            className="auth-message auth-message--error"
            style={{
              marginBottom: "1rem",
              textAlign: "left",
              fontWeight: "bold",
            }}
          >
            Erreur de chargement ({new Date().toLocaleTimeString()}) :{" "}
            {fetchError}
          </div>
        )}
        <table className="premium-table">
          <thead>
            <tr>
              <th>Nom du service</th>
              <th>Sous-services</th>
              <th>Date de création</th>
              {isSuperAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {services.length > 0 &&
              services
                .slice(
                  (currentPage - 1) * itemsPerPage,
                  currentPage * itemsPerPage,
                )
                .map((service) => (
                  <tr key={service.id}>
                    <td className="font-bold">{service.nom_service}</td>
                    <td>
                      {service.sous_service &&
                      service.sous_service.length > 0 ? (
                        <select
                          className="auth-input"
                          style={{
                            padding: "0.2rem 0.5rem",
                            fontSize: "0.85rem",
                            maxWidth: "200px",
                            backgroundColor: "var(--bg-glass)",
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Voir les {service.sous_service.length} sous-services
                          </option>
                          {service.sous_service.map((ss) => (
                            <option key={ss.id} value={ss.id} disabled>
                              {ss.nom_sous_service}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="text-secondary"
                          style={{ fontSize: "0.8rem", fontStyle: "italic" }}
                        >
                          Aucun
                        </span>
                      )}
                    </td>
                    <td className="text-secondary">
                      {service.created_at
                        ? new Date(service.created_at).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )
                        : "---"}
                    </td>
                    {isSuperAdmin && (
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="icon-btn edit"
                          onClick={() =>
                            setSelectedServiceForSousService(service)
                          }
                          title="Gérer les sous-services"
                          disabled={loading}
                          style={{
                            marginRight: "10px",
                            color: "var(--primary-color)",
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="18"
                            height="18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                        </button>
                        <button
                          className="icon-btn edit"
                          onClick={() => openEditModal(service)}
                          title="Modifier"
                          disabled={loading}
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
                        <button
                          className="icon-btn delete"
                          onClick={() => handleDelete(service.id)}
                          title="Supprimer"
                          disabled={loading}
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
                    )}
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
              { length: Math.ceil(services.length / itemsPerPage) },
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
                currentPage === Math.ceil(services.length / itemsPerPage)
              }
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              →
            </button>
            <span className="pagination-info">
              {services.length} service{services.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
