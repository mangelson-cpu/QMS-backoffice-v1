import React, { useEffect, useState, useCallback } from "react";
import { FiBriefcase, FiFilter, FiInbox } from "react-icons/fi";
import type { Agence } from "../../../shared/types";
import { apiClient, setSelectedFiliale, getSelectedFiliale } from "../../../shared/api/apiClient";


export const AgenceManager: React.FC = () => {
  const [agences, setAgences] = useState<Agence[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAgence, setEditingAgence] = useState<Agence | null>(null);

  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [modalFilialeId, setModalFilialeId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filiales, setFiliales] = useState<any[]>([]);
  const [selectedFilialeId, setSelectedFilialeIdState] = useState<string>(getSelectedFiliale() || "");

  const handleFilialeChange = (id: string) => {
    setSelectedFilialeIdState(id);
    setSelectedFiliale(id);
  };

  useEffect(() => {
    // 1. Récupérer l'utilisateur pour connaître son rôle
    const initData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const resUser = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resUser.ok) {
          const { user } = await resUser.json();
          setCurrentUser(user);

          // Si super_admin, récupérer les filiales
          if (user.role === "super_admin") {
            try {
              const data = await apiClient.get('/filiales');
              setFiliales(data.filiales || []);
              const currentId = getSelectedFiliale();
              if (!currentId && data.filiales?.length > 0) {
                const firstId = data.filiales[0].id;
                setSelectedFilialeIdState(firstId);
                setSelectedFiliale(firstId);
              } else if (currentId) {
                setSelectedFilialeIdState(currentId);
              }
            } catch (err) {
              console.error('Erreur filiales:', err);
            }
          }
        }
      } catch (err) {
        console.error("Erreur initData:", err);
      }
    };
    initData();
  }, []);

  const fetchAgences = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Si on est super admin et qu'aucune filiale n'est sélectionnée, on ne fetch pas
    if (currentUser?.role === 'super_admin' && !selectedFilialeId) return;

    try {
      const headers: any = { Authorization: `Bearer ${token}` };
      if (currentUser?.role === 'super_admin') {
        headers['x-filiale-id'] = selectedFilialeId;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/agences`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAgences(data.agences || []);
      } else {
        const data = await res.json();
        console.error("Erreur API Agences:", data.error);
        setAgences([]);
      }
    } catch (err) {
      console.error("Erreur fetchAgences:", err);
    }
  }, [currentUser, selectedFilialeId]);

  useEffect(() => {
    if (currentUser) {
      fetchAgences();
    }
  }, [fetchAgences, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const targetFilialeId = currentUser?.role === 'super_admin' ? modalFilialeId : selectedFilialeId;
    if (currentUser?.role === 'super_admin' && !targetFilialeId) {
      setMessage("Veuillez sélectionner une filiale");
      setIsSuccess(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const slugContent = nom
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      
      const payload = {
        nom: nom.trim(),
        adresse: adresse.trim() || null,
        slug: slugContent,
      };

      const headers: any = { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      };
      if (currentUser?.role === 'super_admin') {
        headers['x-filiale-id'] = targetFilialeId;
      }

      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const url = editingAgence 
        ? `${baseUrl}/api/agences/${editingAgence.id}`
        : `${baseUrl}/api/agences`;
      
      const method = editingAgence ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");

      setMessage(editingAgence ? "Agence modifiée avec succès" : "Agence créée avec succès");
      setIsSuccess(true);

      setTimeout(() => {
        setShowModal(false);
        resetForm();
        setMessage("");
      }, 1000);

      await fetchAgences();
    } catch (err: any) {
      console.error("Erreur handleSubmit:", err);
      setMessage(err.message || "Erreur lors de l'opération");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette agence ?")) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const headers: any = { Authorization: `Bearer ${token}` };
      if (currentUser?.role === 'super_admin') {
        headers['x-filiale-id'] = selectedFilialeId;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/agences/${id}`, {
        method: "DELETE",
        headers
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur serveur");
      }

      await fetchAgences();
    } catch (err: any) {
      console.error("Erreur handleDelete:", err);
      alert(err.message || "Erreur lors de la suppression");
    }
  };

  const openEditModal = (agence: Agence) => {
    setEditingAgence(agence);
    setNom(agence.nom);
    setAdresse(agence.adresse || "");
    setShowModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    // Pré-remplir avec la filiale filtrée si elle est déjà sélectionnée
    if (selectedFilialeId) setModalFilialeId(selectedFilialeId);
    setShowModal(true);
  };

  const resetForm = () => {
    setNom("");
    setAdresse("");
    setModalFilialeId("");
    setEditingAgence(null);
    setMessage("");
    setIsSuccess(false);
  };

  return (
    <div className="agences-page">
      <header className="page-header" style={{ alignItems: "flex-start" }}>
        <div className="header-text">
          <h1>Gestion des agences</h1>
          <p>Gérez les agences de votre organisation</p>
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {currentUser?.role === "super_admin" && (
            <div className="auth-input-group" style={{ margin: 0, position: "relative" }}>
              <FiFilter
                style={{
                  position: "absolute",
                  left: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--primary-color, #8b5cf6)",
                  pointerEvents: "none",
                  fontSize: "1.1rem"
                }}
              />
              <select
                className="auth-select"
                value={selectedFilialeId}
                onChange={(e) => handleFilialeChange(e.target.value)}
                style={{
                  minWidth: "220px",
                  paddingLeft: "2.6rem",
                  height: "42px",
                  paddingTop: 0,
                  paddingBottom: 0,
                  borderRadius: "12px"
                }}
              >
                <option value="">Sélectionner une filiale...</option>
                {filiales.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button className="primary-gradient-btn" onClick={openCreateModal}>
            + Créer une agence
          </button>
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
              <div className="auth-card-icon"><FiBriefcase style={{ color: 'var(--primary-color)' }} /></div>
              <h2 className="auth-card-title">
                {editingAgence ? "Modifier l'agence" : "Nouvelle Agence"}
              </h2>
              <p className="auth-card-subtitle">
                {editingAgence
                  ? "Modifiez les informations de l'agence"
                  : "Remplissez les informations ci-dessous"}
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {currentUser?.role === "super_admin" && (
                <div className="auth-input-group">
                  <label className="auth-input-label">Filiale</label>
                  <select
                    className="auth-select"
                    value={modalFilialeId}
                    onChange={(e) => setModalFilialeId(e.target.value)}
                    required
                  >
                    <option value="">Sélectionner une filiale...</option>
                    {filiales.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nom}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="auth-input-group">
                <label className="auth-input-label">Nom de l'agence</label>
                <input
                  className="auth-input"
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: Agence Tananarive"
                  required
                />
              </div>
              <div className="auth-input-group">
                <label className="auth-input-label">Adresse</label>
                <input
                  className="auth-input"
                  type="text"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  placeholder="Ex: 12 Rue de la Paix, Tananarive"
                />
              </div>
              <button type="submit" className="auth-button" disabled={loading}>
                {loading
                  ? editingAgence
                    ? "Modification..."
                    : "Création..."
                  : editingAgence
                    ? "Modifier"
                    : "Enregistrer l'agence"}
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

      <div className="content-card" style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 240px)", position: "relative" }}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Adresse</th>
              <th>Lien Écran</th>
              <th>Lien Borne</th>
              <th>Date de création</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {agences.length > 0 ? (
              agences
                .map((agence: any) => (
                  <tr key={agence.id}>
                    <td className="font-bold">{agence.nom}</td>
                    <td className="text-secondary">
                      {agence.adresse || "Non renseignée"}
                    </td>
                    <td>
                      {agence.slug ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <a
                            href={`/${agence.slug}/screen`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline font-medium text-sm"
                            style={{
                              maxWidth: "120px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "inline-block",
                            }}
                            title={`/${agence.slug}/screen`}
                          >
                            /{agence.slug}/screen
                          </a>
                        </div>
                      ) : (
                        <span className="text-secondary text-sm">
                          Non généré
                        </span>
                      )}
                    </td>
                    <td>
                      {agence.slug ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <a
                            href={`/${agence.slug}/borne`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline font-medium text-sm"
                            style={{
                              maxWidth: "120px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "inline-block",
                            }}
                            title={`/${agence.slug}/borne`}
                          >
                            /{agence.slug}/borne
                          </a>
                        </div>
                      ) : (
                        <span className="text-secondary text-sm">
                          Non généré
                        </span>
                      )}
                    </td>
                    <td className="text-secondary">
                      {agence.created_at
                        ? new Date(agence.created_at).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )
                        : "---"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="icon-btn edit"
                        onClick={() => openEditModal(agence)}
                        title="Modifier"
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
                        onClick={() => handleDelete(agence.id)}
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
                ))
            ) : (
              <tr>
                <td
                  colSpan={6}
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
                      {currentUser?.role === 'super_admin' && !selectedFilialeId 
                        ? "Veuillez sélectionner une filiale pour voir ses agences." 
                        : "Aucune agence trouvée dans cette filiale."}
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
