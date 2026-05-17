import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDynamicPageSize } from "../../../shared/hooks/useDynamicPageSize";
import { apiClient } from "../../../shared/api/apiClient";
import type {
  Service,
  Guichet,
  GuichetService,
  UserRole,
} from "../../../shared/types";
import { FiTool } from "react-icons/fi";
import "./GuichetAssignment.css";

interface Props {
  userRole: UserRole;
  currentUserAgenceId: string | null;
}

export const GuichetAssignment: React.FC<Props> = ({
  userRole,
  currentUserAgenceId,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [assignments, setAssignments] = useState<GuichetService[]>([]);
  const [guichets, setGuichets] = useState<Guichet[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [selectedGuichet, setSelectedGuichet] = useState("");

  const [localSelectedServices, setLocalSelectedServices] = useState<string[]>(
    [],
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { itemsPerPage, needsPagination } = useDynamicPageSize(
    tableContainerRef,
    guichets.length,
  );

  const fetchData = useCallback(
    async (ignore: boolean = false) => {
      setFetchError("");
      if (!currentUserAgenceId) return;

      try {
        const [servicesRes, assignRes, guichetRes] = await Promise.all([
            apiClient.get('/services'),
            apiClient.get(`/guichets/services?agence_id=${currentUserAgenceId}`),
            apiClient.get(`/guichets?agence_id=${currentUserAgenceId}`)
        ]);

        if (ignore) return;

        if (servicesRes.services) setServices(servicesRes.services);
        if (assignRes.guichetServices) setAssignments(assignRes.guichetServices as GuichetService[]);
        if (guichetRes.guichets) {
          const typedGuichets = guichetRes.guichets as Guichet[];
          setGuichets(typedGuichets);
          if (typedGuichets.length > 0 && !selectedGuichet) {
            setSelectedGuichet(typedGuichets[0].nom_guichet);
          }
        }
      } catch (err) {
        if (ignore) return;
        const error = err as Error;
        setFetchError(error.message || "Impossible de charger les données");
      } finally {
        if (!ignore) setLoading(false);
      }
    },
    [currentUserAgenceId, selectedGuichet],
  );

  useEffect(() => {
    let ignore = false;
    fetchData(ignore);
    return () => { ignore = true; };
  }, [fetchData]);

  useEffect(() => {
    if (showModal) {
      const alreadyAssigned = assignments
        .filter((a) => a.nom_guichet === selectedGuichet)
        .map((a) => a.service_id);

      setLocalSelectedServices(alreadyAssigned);
    }
  }, [selectedGuichet, showModal, assignments]);

  const handleToggleLocalService = (serviceId: string) => {
    setLocalSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
  };

  const handleSave = async () => {
    if (!currentUserAgenceId) return;
    setLoading(true);
    setMessage("");

    try {
      await apiClient.post('/guichets/services', {
        nom_guichet: selectedGuichet,
        agence_id: currentUserAgenceId,
        service_ids: localSelectedServices
      });

      await fetchData();
      setIsSuccess(true);
      setMessage("Configuration enregistrée avec succès");

      setTimeout(() => {
        setShowModal(false);
        setMessage("");
      }, 1500);
    } catch (err) {
      const error = err as Error;
      setMessage(error.message || "Erreur lors de l'enregistrement");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const groupedAssignments = guichets.map((gInfo) => {
    const opt = gInfo.nom_guichet;
    const relevantAssignments = assignments.filter(
      (a) => a.nom_guichet === opt,
    );
    const agenceName = relevantAssignments[0]?.agence?.nom || "Votre Agence";

    return {
      nom_guichet: opt,
      appellation: gInfo?.appellation || "",
      agence_nom: agenceName,
      services: relevantAssignments
        .map((a) => a.service?.nom_service)
        .filter(Boolean) as string[],
    };
  });

  const handleDeleteAllForGuichet = async (nomGuichet: string) => {
    if (!currentUserAgenceId) return;
    if (!confirm(`Êtes-vous sûr de vouloir supprimer toutes les affectations pour le ${nomGuichet} ?`)) return;

    setLoading(true);
    try {
      await apiClient.delete(`/guichets/services?nom_guichet=${encodeURIComponent(nomGuichet)}&agence_id=${currentUserAgenceId}`);
      await fetchData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (userRole !== "admin") return null;

  return (
    <div className="services-page">
      <header className="page-header">
        <div className="header-text">
          <h1>Affectation des Guichets</h1>
          <p>Configurez les services gérés par chaque guichet</p>
        </div>
        <button
          className="primary-gradient-btn"
          onClick={() => {
            if (guichets.length > 0) {
              setSelectedGuichet(guichets[0].nom_guichet);
              setShowModal(true);
            } else {
              alert("Veuillez d'abord configurer des guichets.");
            }
          }}
        >
          + Configurer un guichet
        </button>
      </header>

      {showModal && (
        <div className="modal-overlay" onClick={() => !loading && setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowModal(false)}>×</button>
            <div className="auth-card-header" style={{ marginBottom: "2rem" }}>
              <div className="auth-card-icon"><FiTool style={{ color: 'var(--primary-color)' }} /></div>
              <h2 className="auth-card-title">Affectation de Services</h2>
            </div>

            <div className="auth-form">
              <div className="auth-input-group">
                <label className="auth-input-label">Guichet</label>
                <select
                  className="auth-select guichet-select"
                  value={selectedGuichet}
                  onChange={(e) => setSelectedGuichet(e.target.value)}
                  style={{ width: "100%", maxWidth: "none" }}
                  disabled={loading}
                >
                  {guichets.map((g) => (
                    <option key={g.id} value={g.nom_guichet}>
                      {g.nom_guichet} {g.appellation ? `(${g.appellation})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="services-checklist-container">
                <label className="auth-input-label">Checklist des Services</label>
                <div className="checklist-grid-modal">
                  {services.map((service) => (
                    <label key={service.id} className={`checklist-item-compact ${localSelectedServices.includes(service.id) ? "checked" : ""}`}>
                      <input
                        type="checkbox"
                        checked={localSelectedServices.includes(service.id)}
                        onChange={() => handleToggleLocalService(service.id)}
                        disabled={loading}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="service-name">{service.nom_service}</span>
                    </label>
                  ))}
                </div>
              </div>

              {message && <div className={`auth-message ${isSuccess ? "auth-message--success" : "auth-message--error"}`}>{message}</div>}

              <div className="modal-actions" style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
                <button className="auth-button" onClick={handleSave} disabled={loading} style={{ flex: 1 }}>
                  Enregistrer
                </button>
                <button className="auth-button secondary" onClick={() => setShowModal(false)} disabled={loading} style={{ flex: 1 }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="content-card" ref={tableContainerRef}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Guichet / Caisse</th>
              <th>Agence</th>
              <th>Services Assignés</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groupedAssignments
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((group) => (
                <tr key={group.nom_guichet}>
                  <td className="font-bold">{group.nom_guichet} {group.appellation ? `(${group.appellation})` : ""}</td>
                  <td className="text-secondary">{group.agence_nom}</td>
                  <td>
                    <div className="service-tags-container">
                      {group.services.map((s) => <span key={s} className="status-badge user">{s}</span>)}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="icon-btn edit" onClick={() => { setSelectedGuichet(group.nom_guichet); setShowModal(true); }} title="Modifier">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button className="icon-btn delete" onClick={() => handleDeleteAllForGuichet(group.nom_guichet)} title="Supprimer">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {needsPagination && (
          <div className="pagination-controls">
            <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>←</button>
            <button className="pagination-btn active">{currentPage}</button>
            <button className="pagination-btn" disabled={currentPage >= Math.ceil(groupedAssignments.length / itemsPerPage)} onClick={() => setCurrentPage(p => p + 1)}>→</button>
          </div>
        )}
      </div>
    </div>
  );
};
