import React, { useEffect, useState, useCallback } from "react";
import { apiClient, getSelectedFiliale, setSelectedFiliale } from "../../../shared/api/apiClient";
import { FiUser, FiEdit2, FiFilter, FiInbox } from "react-icons/fi";
import type { UserRole, Agence, User } from "../../../shared/types";

interface Props {
  agences: Agence[];
  userRole: UserRole;
  currentUserAgenceId: string | null;
}

export const CreateUserForm: React.FC<Props> = ({
  agences: _agencesFromProps,
  userRole,
  currentUserAgenceId,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [agenceId, setAgenceId] = useState<string>("");
  const [filialeId, setFilialeId] = useState<string>("");
  const [filiales, setFiliales] = useState<any[]>([]);
  const [agencesForFiliale, setAgencesForFiliale] = useState<Agence[]>([]);
  const [selectedFilterFilialeId, setSelectedFilterFilialeIdState] = useState<string>(getSelectedFiliale() || "");

  const handleFilterFilialeChange = (id: string) => {
    setSelectedFilterFilialeIdState(id);
    setSelectedFiliale(id);
  };

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Charger les filiales au montage (super_admin uniquement)
  useEffect(() => {
    if (userRole === "super_admin") {
      const loadFiliales = async () => {
        try {
          const data = await apiClient.get('/filiales');
          setFiliales(data.filiales || []);
        } catch (err) {
          console.error('Erreur chargement filiales:', err);
        }
      };
      loadFiliales();
    }
  }, [userRole]);

  // Quand la filiale change (super_admin) ou au montage (admin), charger les agences
  useEffect(() => {
    const loadAgences = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`
        };

        if (userRole === "super_admin") {
          if (!filialeId) {
            setAgencesForFiliale([]);
            return;
          }
          headers['x-filiale-id'] = filialeId;
        }

        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/agences`, { headers });
        if (res.ok) {
          const data = await res.json();
          setAgencesForFiliale(data.agences || []);
        }
      } catch (err) {
        console.error('Erreur chargement agences:', err);
        setAgencesForFiliale([]);
      }
    };

    if (userRole === "super_admin" && filialeId) {
      loadAgences();
    } else if (userRole === "admin") {
      loadAgences();
    } else {
      setAgencesForFiliale([]);
    }
  }, [filialeId, userRole]);

  useEffect(() => {
    if (userRole === "admin" && currentUserAgenceId) {
      setAgenceId(currentUserAgenceId);
    }
  }, [userRole, currentUserAgenceId, showModal]);

  const fetchUsers = useCallback(async (ignore: boolean = false) => {
    setFetchError("");
    try {
      const data = await apiClient.get('/auth/users');
      if (ignore) return;

      const currentUserId = JSON.parse(atob(localStorage.getItem('token')?.split('.')[1] || '')).id;
      const filteredUsers = (data.users as User[]).filter(u => u.id !== currentUserId);
      setUsers(filteredUsers);
    } catch (err) {
      if (ignore) return;
      console.error("fetchUsers erreur:", err);
      const error = err as Error;
      setFetchError(error.message || "Erreur réseau inconnue lors du chargement.");
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadUsers = async () => {
      await fetchUsers(ignore);
    };

    loadUsers();

    return () => {
      ignore = true;
    };
  }, [fetchUsers]);

  const filteredUsersList = users.filter(user => {
    if (userRole !== "super_admin") return true;
    if (!selectedFilterFilialeId) return true;
    return (user as any).filiale_id === selectedFilterFilialeId || (user as any).filiale?.id === selectedFilterFilialeId;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await apiClient.post('/auth/users', {
        nom_user: nom,
        email,
        password,
        role,
        filiale_id: userRole === 'super_admin' ? (filialeId || null) : undefined,
        agence_id: agenceId || null,
      });

      setMessage("Utilisateur créé avec succès");
      setIsSuccess(true);

      setTimeout(() => {
        setShowModal(false);
        resetForm();
        setMessage("");
      }, 1500);

      fetchUsers();
    } catch (err) {
      const error = err as Error;
      setMessage(error.message || "Erreur lors de la création");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setNom(user.nom_user);
    setEmail(user.email);
    setPassword("");
    setRole(user.role as "user" | "admin");
    setFilialeId((user as any).filiale?.id || (user as any).filiale_id || "");
    setAgenceId(user.agence_id || user.agence?.id || "");
    setShowEditModal(true);
    setMessage("");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    setMessage("");

    try {
      await apiClient.put(`/auth/users/${editingUser.id}`, { 
        nom_user: nom,
        email,
        new_password: password || undefined,
        role,
        filiale_id: userRole === 'super_admin' ? (filialeId || null) : undefined,
        agence_id: agenceId || null,
      });

      setMessage("Utilisateur mis à jour avec succès");
      setIsSuccess(true);

      fetchUsers();

      setTimeout(() => {
        setShowEditModal(false);
        resetForm();
      }, 1500);

    } catch (err) {
      const error = err as Error;
      setMessage(error.message || "Erreur lors de la mise à jour");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setNom("");
    setPassword("");
    setRole("user");
    setEditingUser(null);
    setFilialeId("");
    setAgencesForFiliale([]);

    if (userRole !== "admin") {
      setAgenceId("");
    }
    setMessage("");
    setIsSuccess(false);
  };

  return (
    <div className="agents-page">
      <header className="page-header">
        <div className="header-text">
          <h1>Gestion des agents</h1>
          <p>
            {userRole === "super_admin"
              ? "Administration globale des utilisateurs"
              : "Gérez les agents de votre agence"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {userRole === "super_admin" && (
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
                value={selectedFilterFilialeId}
                onChange={(e) => handleFilterFilialeChange(e.target.value)}
                style={{
                  minWidth: "220px",
                  paddingLeft: "2.6rem",
                  height: "42px",
                  paddingTop: 0,
                  paddingBottom: 0,
                  borderRadius: "12px"
                }}
              >
                <option value="">Toutes les filiales...</option>
                {filiales.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            className="primary-gradient-btn"
            onClick={() => setShowModal(true)}
          >
            + Créer un agent
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
              <div className="auth-card-icon"><FiUser style={{ color: 'var(--primary-color)' }} /></div>
              <h2 className="auth-card-title">Nouvel Agent</h2>
              <p className="auth-card-subtitle">
                Remplissez les informations ci-dessous
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-input-grid">
                {userRole === "super_admin" && (
                  <div className="auth-input-group" style={{ gridColumn: "span 2" }}>
                    <label className="auth-input-label">Filiale</label>
                    <select
                      className="auth-select"
                      value={filialeId}
                      onChange={(e) => {
                        setFilialeId(e.target.value);
                        setAgenceId("");
                      }}
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
                  <label className="auth-input-label">Nom complet</label>
                  <input
                    className="auth-input"
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-input-group">
                  <label className="auth-input-label">Email</label>
                  <input
                    className="auth-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-input-group">
                  <label className="auth-input-label">Mot de passe</label>
                  <input
                    className="auth-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="auth-input-group">
                  <label className="auth-input-label">Rôle</label>
                  <select
                    className="auth-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value as "user" | "admin")}
                    disabled={userRole === "admin"}
                  >
                    <option value="user">Utilisateur</option>
                    {userRole === "super_admin" && (
                      <option value="admin">Administrateur</option>
                    )}
                  </select>
                </div>
                <div
                  className="auth-input-group"
                  style={{ gridColumn: "span 2" }}
                >
                  <label className="auth-input-label">Agence</label>
                  <select
                    className="auth-select"
                    value={agenceId}
                    onChange={(e) => setAgenceId(e.target.value)}
                    disabled={userRole === "admin" || (userRole === "super_admin" && !filialeId)}
                    required
                  >
                    <option value="">
                      {userRole === "super_admin" && !filialeId
                        ? "Choisissez d'abord une filiale"
                        : "Sélectionner une agence..."}
                    </option>
                    {(userRole === "super_admin" || userRole === "admin" ? agencesForFiliale : _agencesFromProps).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nom}
                      </option>
                    ))}
                  </select>
                  {userRole === "admin" && (
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "#64748b",
                        marginTop: "0.4rem",
                      }}
                    >
                      En tant qu'administrateur, vous créez des agents pour
                      votre propre agence.
                    </p>
                  )}
                </div>
              </div>
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? "Création..." : "Enregistrer l'agent"}
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

      {showEditModal && editingUser && (
        <div
          className="modal-overlay"
          onClick={() => !loading && setShowEditModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => {
                setShowEditModal(false);
                resetForm();
              }}
            >
              ×
            </button>
            <div className="auth-card-header" style={{ marginBottom: "2rem" }}>
              <div className="auth-card-icon"><FiEdit2 style={{ color: 'var(--primary-color)' }} /></div>
              <h2 className="auth-card-title">Modifier l'agent</h2>
              <p className="auth-card-subtitle">
                Modifiez les informations de l'agent
              </p>
            </div>

            <form className="auth-form" onSubmit={handleEditSubmit}>
              <div className="auth-input-grid">
                {userRole === "super_admin" && (
                  <div className="auth-input-group" style={{ gridColumn: "span 2" }}>
                    <label className="auth-input-label">Filiale</label>
                    <select
                      className="auth-select"
                      value={filialeId}
                      onChange={(e) => {
                        setFilialeId(e.target.value);
                        setAgenceId("");
                      }}
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
                  <label className="auth-input-label">Nom complet</label>
                  <input
                    className="auth-input"
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-input-group">
                  <label className="auth-input-label">Email</label>
                  <input
                    className="auth-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-input-group">
                  <label className="auth-input-label">Nouveau mot de passe</label>
                  <input
                    className="auth-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Laisser vide pour ne pas changer"
                    minLength={6}
                  />
                </div>
                <div className="auth-input-group">
                  <label className="auth-input-label">Rôle</label>
                  <select
                    className="auth-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value as "user" | "admin")}
                    disabled={userRole === "admin"}
                  >
                    <option value="user">Utilisateur</option>
                    {userRole === "super_admin" && (
                      <option value="admin">Administrateur</option>
                    )}
                    {editingUser.role === "super_admin" && (
                      <option value="super_admin">Super Administrateur</option>
                    )}
                  </select>
                </div>
                <div
                  className="auth-input-group"
                  style={{ gridColumn: "span 2" }}
                >
                  <label className="auth-input-label">Agence</label>
                  <select
                    className="auth-select"
                    value={agenceId}
                    onChange={(e) => setAgenceId(e.target.value)}
                    disabled={userRole === "admin" || (userRole === "super_admin" && !filialeId)}
                    required
                  >
                    <option value="">
                      {userRole === "super_admin" && !filialeId
                        ? "Choisissez d'abord une filiale"
                        : "Sélectionner une agence..."}
                    </option>
                    {(userRole === "super_admin" || userRole === "admin" ? agencesForFiliale : _agencesFromProps).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? "Mise à jour..." : "Mettre à jour l'agent"}
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
              <th>Nom</th>
              <th>Email</th>
              {userRole === "super_admin" && <th>Filiale</th>}
              <th>Agence</th>
              <th>Rôle</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsersList.length > 0 ? (
              filteredUsersList.map((user) => (
                <tr key={user.id}>
                  <td className="font-bold">{user.nom_user}</td>
                  <td className="text-secondary">{user.email}</td>
                  {userRole === "super_admin" && <td>{(user as any).filiale?.nom || "-"}</td>}
                  <td>{user.agence?.nom || "Non assignée"}</td>
                  <td>
                    <span className={`status-badge ${user.role}`}>
                      {user.role === "super_admin"
                        ? "Super User"
                        : user.role === "admin"
                          ? "Admin"
                          : "User"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="icon-btn edit"
                      onClick={() => openEditModal(user)}
                      disabled={userRole !== "super_admin" && user.role === "super_admin"}
                      style={userRole !== "super_admin" && user.role === "super_admin" ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                      title={userRole !== "super_admin" && user.role === "super_admin" ? "Non autorisé" : "Modifier"}
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
                    <button className="icon-btn delete">
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
                  colSpan={userRole === "super_admin" ? 6 : 5}
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
                      Aucun utilisateur configuré.
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
