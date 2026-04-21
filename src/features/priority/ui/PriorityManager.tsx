import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../../../shared/api/supabaseClient";
import { FiZap } from "react-icons/fi";
import type { Priority, UserRole } from "../../../shared/types";
import { useDynamicPageSize } from "../../../shared/hooks/useDynamicPageSize";

interface Props {
  userRole: UserRole;
}

export const PriorityManager: React.FC<Props> = ({ userRole }) => {
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);

  const [nom, setNom] = useState("");
  const [valeur, setValeur] = useState<number>(3);
  const [couleur, setCouleur] = useState("#8b5cf6");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const { itemsPerPage, needsPagination } = useDynamicPageSize(
    tableContainerRef,
    priorities.length
  );

  const isSuperAdmin = userRole === "super_admin";

  const fetchPriorities = useCallback(async () => {
    setFetchError("");
    try {
      const { data, error } = await supabase
        .from("priority")
        .select("*")
        .order("valeur", { ascending: true });

      if (error) throw error;
      if (data) {
        setPriorities(data as Priority[]);
      }
    } catch (err) {
      const error = err as Error;
      setFetchError(error.message || "Impossible de charger les priorités");
    }
  }, []);

  useEffect(() => {
    fetchPriorities();
    const channel = supabase
      .channel("priority_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "priority" },
        () => fetchPriorities()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPriorities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    setLoading(true);
    setMessage("");

    try {
      const payload = {
        nom: nom.trim(),
        valeur,
        couleur,
      };

      if (editingPriority) {
        const { error } = await supabase
          .from("priority")
          .update(payload)
          .eq("id", editingPriority.id);
        if (error) throw error;
        setMessage("Priorité modifiée avec succès");
      } else {
        const { error } = await supabase.from("priority").insert(payload);
        if (error) throw error;
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
      const { error } = await supabase.from("priority").delete().eq("id", id);
      if (error) throw error;
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
    setShowModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setNom("");
    setValeur(3);
    setCouleur("#8b5cf6");
    setEditingPriority(null);
    setMessage("");
    setIsSuccess(false);
  };

  const paginated = priorities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(priorities.length / itemsPerPage);

  return (
    <div className="services-page">
      <header className="page-header">
        <div className="header-text">
          <h1>Gestion des priorités</h1>
          <p>Configurez les priorités globales du système</p>
        </div>
        {isSuperAdmin && (
          <button className="primary-gradient-btn" onClick={openCreateModal}>
            + Créer une priorité
          </button>
        )}
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

      <div className="content-card" ref={tableContainerRef}>
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
              {isSuperAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? (
              paginated.map((priority) => (
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
                  {isSuperAdmin && (
                    <td style={{ textAlign: "right" }}>
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
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isSuperAdmin ? 4 : 3} style={{ textAlign: "center", padding: "3rem", color: "#64748b", fontStyle: "italic" }}>
                  Aucune priorité configurée.
                </td>
              </tr>
            )}
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
