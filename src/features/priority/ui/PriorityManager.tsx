import React, { useEffect, useState, useCallback } from "react";
import { apiClient, setSelectedFiliale, getSelectedFiliale } from "../../../shared/api/apiClient";
import { FiZap, FiFilter, FiInbox } from "react-icons/fi";
import type { Priority, UserRole } from "../../../shared/types";

interface Props {
  userRole: UserRole;
  currentUserAgenceId?: string | null;
}

export const PriorityManager: React.FC<Props> = ({ userRole, currentUserAgenceId }) => {
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);

  const [nom, setNom] = useState("");
  const [valeur, setValeur] = useState<number>(3);
  const [couleur, setCouleur] = useState("#8b5cf6");
  const [modalFilialeId, setModalFilialeId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const isSuperAdmin = userRole === "super_admin";

  const [filiales, setFiliales] = useState<any[]>([]);
  const [selectedFilialeId, setSelectedFilialeIdState] = useState<string>(getSelectedFiliale() || "");

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

  const [agencyPriorities, setAgencyPriorities] = useState<any[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchPriorities = useCallback(async () => {
    if (isSuperAdmin && !selectedFilialeId) return;
    setFetchError("");
    try {
      const data = await apiClient.get("/priorities");
      setPriorities(data.priorities || []);

      if (userRole === "admin" && currentUserAgenceId) {
        const agencyRes = await apiClient.get(`/priorities/agence?agence_id=${currentUserAgenceId}`);
        setAgencyPriorities(agencyRes.agencePriorities || []);
      }
    } catch (err) {
      const error = err as Error;
      setFetchError(error.message || "Impossible de charger les priorités");
    }
  }, [selectedFilialeId, isSuperAdmin, userRole, currentUserAgenceId]);

  useEffect(() => {
    fetchPriorities();
  }, [fetchPriorities]);

  const togglePriority = async (priorityId: string) => {
    if (!currentUserAgenceId || toggling) return;
    setToggling(priorityId);

    const existing = agencyPriorities.find(ap => ap.priority_id === priorityId);

    try {
      if (existing) {
        await apiClient.post('/priorities/agence/toggle', {
          agence_id: currentUserAgenceId,
          priority_id: priorityId,
          is_active: !existing.is_active
        });
      } else {
        await apiClient.post('/priorities/agence/toggle', {
          agence_id: currentUserAgenceId,
          priority_id: priorityId,
          is_active: true
        });
      }
      await fetchPriorities();
    } catch (err) {
      const error = err as Error;
      alert(error.message || "Erreur lors de la modification");
    } finally {
      setToggling(null);
    }
  };

  const isActive = (priorityId: string) => {
    const ap = agencyPriorities.find(ap => ap.priority_id === priorityId);
    return ap ? ap.is_active : false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    setLoading(true);
    setMessage("");

    if (isSuperAdmin && modalFilialeId) {
      setSelectedFiliale(modalFilialeId);
    }

    try {
      const payload = {
        nom: nom.trim(),
        valeur,
        couleur,
      };

      if (editingPriority) {
        await apiClient.put(`/priorities/${editingPriority.id}`, payload);
        setMessage("Priorité modifiée avec succès");
      } else {
        await apiClient.post("/priorities", payload);
        setMessage("Priorité créée avec succès");
      }

      setIsSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        resetForm();
      }, 1500);
      await fetchPriorities();
    } catch (err) {
      const error = err as Error;
      setMessage(error.message || "Erreur lors de l'opération");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette priorité ?")) return;

    try {
      await apiClient.delete(`/priorities/${id}`);
      await fetchPriorities();
    } catch (err) {
      const error = err as Error;
      alert(error.message || "Erreur lors de la suppression");
    }
  };

  const openEditModal = (priority: Priority) => {
    setEditingPriority(priority);
    setNom(priority.nom);
    setValeur(priority.valeur);
    setCouleur(priority.couleur);
    if (selectedFilialeId) setModalFilialeId(selectedFilialeId);
    setShowModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    if (selectedFilialeId) setModalFilialeId(selectedFilialeId);
    setShowModal(true);
  };

  const resetForm = () => {
    setNom("");
    setValeur(3);
    setCouleur("#8b5cf6");
    setModalFilialeId("");
    setEditingPriority(null);
    setMessage("");
    setIsSuccess(false);
  };

  return (
    <div className="services-page">
      <header className="page-header">
        <div className="header-text">
          <h1>Gestion des priorités</h1>
          <p>Configurez les priorités globales du système</p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {isSuperAdmin && (
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.75rem", 
              background: "#ffffff", 
              padding: "0.75rem 1.25rem", 
              borderRadius: "14px", 
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
              transition: "all 0.2s ease"
            }}>
              <FiFilter style={{ fontSize: "1.2rem", color: "var(--primary-color, #8b5cf6)" }} />
              <select
                value={selectedFilialeId}
                onChange={(e) => handleFilialeChange(e.target.value)}
                style={{ 
                  border: "none", 
                  outline: "none", 
                  background: "transparent", 
                  fontWeight: 600, 
                  fontSize: "0.95rem",
                  color: "#1e293b",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  paddingRight: "0.5rem"
                }}
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
              + Créer une priorité
            </button>
          )}
        </div>
      </header>

      {showModal && (
        <div className="modal-overlay" onClick={() => !loading && setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowModal(false)}>×</button>
            <div className="auth-card-header" style={{ marginBottom: "2rem" }}>
              <div className="auth-card-icon"><FiZap style={{ color: 'var(--primary-color)' }} /></div>
              <h2 className="auth-card-title">
                {editingPriority ? "Modifier la priorité" : "Nouvelle Priorité"}
              </h2>
              <p className="auth-card-subtitle">
                Configurez le poids et l'apparence
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
                <label className="auth-input-label">Nom de la priorité</label>
                <input
                  className="auth-input"
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: Urgent, VIP, Normal..."
                  required
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Poids (Ordre de priorité)</label>
                <input
                  className="auth-input"
                  type="number"
                  value={valeur}
                  onChange={(e) => setValeur(parseInt(e.target.value))}
                  min="1"
                  max="100"
                  required
                />
                <small style={{ color: "#64748b", marginTop: "4px", display: "block" }}>
                  Plus le chiffre est bas, plus la priorité est haute (1 = maximum)
                </small>
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Couleur</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={couleur}
                    onChange={(e) => setCouleur(e.target.value)}
                    style={{ width: '50px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  />
                  <input
                    className="auth-input"
                    type="text"
                    value={couleur}
                    onChange={(e) => setCouleur(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>


              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? "Opération..." : editingPriority ? "Modifier" : "Enregistrer"}
              </button>

              {message && (
                <div className={`auth-message ${isSuccess ? "auth-message--success" : "auth-message--error"}`} style={{ marginTop: "1rem" }}>
                  {message}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      <div className="content-card" style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 240px)", position: "relative" }}>
        {fetchError && (
          <div className="auth-message auth-message--error" style={{ marginBottom: "1rem" }}>
            {fetchError}
          </div>
        )}

        <table className="premium-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Poids (Valeur)</th>
              <th>Couleur</th>
              {(isSuperAdmin || userRole === "admin") && <th style={{ textAlign: "right" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {priorities.length > 0 ? (
              priorities.map((priority) => (
                <tr key={priority.id}>
                  <td className="font-bold">{priority.nom}</td>
                  <td>
                    <span style={{
                      padding: "4px 10px",
                      borderRadius: "12px",
                      background: "#f1f5f9",
                      fontSize: "0.85rem",
                      fontWeight: 600
                    }}>
                      Niveau {priority.valeur}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: priority.couleur,
                        border: "1px solid #e2e8f0"
                      }} />
                      <span style={{ fontSize: "0.85rem", color: "#64748b", fontFamily: "monospace" }}>
                        {priority.couleur}
                      </span>
                    </div>
                  </td>
                  {(isSuperAdmin || userRole === "admin") && (
                    <td style={{ textAlign: "right", display: "flex", justifyContent: "flex-end", gap: "8px", alignItems: "center" }}>
                      {userRole === "admin" && currentUserAgenceId && (
                        <div style={{ display: "flex", alignItems: "center", marginRight: "1rem" }}>
                          <label className="switch" style={{ marginRight: "8px" }}>
                            <input
                              type="checkbox"
                              checked={isActive(priority.id)}
                              onChange={() => togglePriority(priority.id)}
                              disabled={toggling === priority.id}
                            />
                            <span className="slider round"></span>
                          </label>
                          <span style={{
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: isActive(priority.id) ? "#22c55e" : "#64748b",
                            minWidth: "75px"
                          }}>
                            {toggling === priority.id ? "..." : (isActive(priority.id) ? "Activée" : "Désactivée")}
                          </span>
                        </div>
                      )}
                      {isSuperAdmin && (
                        <>
                          <button
                            className="icon-btn edit"
                            onClick={() => openEditModal(priority)}
                            title="Modifier"
                            disabled={loading}
                            style={{ marginRight: "8px" }}
                          >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className="icon-btn delete"
                            onClick={() => handleDelete(priority.id)}
                            title="Supprimer"
                            disabled={loading}
                          >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 0-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={(isSuperAdmin || userRole === "admin") ? 4 : 3}
                  style={{
                    textAlign: "center",
                    padding: "3.5rem 2rem",
                    color: "#94a3b8",
                  }}
                >
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1rem",
                    justifyContent: "center"
                  }}>
                    <FiInbox style={{ fontSize: "3.5rem", color: "#cbd5e1" }} />
                    <span style={{ fontSize: "1.1rem", fontWeight: 500 }}>
                      Aucune priorité configurée.
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
