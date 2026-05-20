import React, { useState, useEffect, useRef } from "react";
import { apiClient } from "../../../shared/api/apiClient";
import { FiUser, FiLogOut } from "react-icons/fi";
import { FaUser } from 'react-icons/fa';

interface NavbarProps {
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    nom_user: string;
    email: string;
    role: string;
    agence_id: string | null;
  } | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [editNom, setEditNom] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editOldPassword, setEditOldPassword] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setCurrentUser(data.user);
            setEditNom(data.user.nom_user);
            setEditEmail(data.user.email);
          }
        } catch (err) {
          console.error("Erreur fetchUser Navbar:", err);
        }
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProfileEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    setMessage("");

    try {
      await apiClient.put('/auth/profile', {
        nom_user: editNom,
        email: editEmail,
        old_password: editOldPassword || undefined,
        new_password: editPassword || undefined,
      });

      setMessage("Profil mis à jour avec succès");
      setIsSuccess(true);
      setCurrentUser({ ...currentUser, email: editEmail, nom_user: editNom });
      setEditOldPassword("");
      setEditPassword("");

      setTimeout(() => {
        setIsProfileEditOpen(false);
        setMessage("");
      }, 1500);
    } catch (err) {
      const error = err as Error;
      setMessage(error.message || "Erreur lors de la mise à jour");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="navbar-breadcrumb">
          <span className="breadcrumb-item">Administration</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item active">Tableau de bord</span>
        </div>
      </div>

      <div className="navbar-right">
        <div className="navbar-user" ref={profileRef}>
          {currentUser ? (
            <div className="profile-badge-container">
              <button
                className="profile-avatar-btn"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                title="Profil"
              >
                <FiUser size={20} />
              </button>

              {isProfileOpen && (
                <div className="profile-popover">
                  <div className="profile-popover-header">
                    <div className="profile-popover-avatar">
                      <FiUser size={36} />
                    </div>
                    <div className="profile-popover-info">
                      <div className="profile-name">{currentUser.nom_user}</div>
                      <div className="profile-email">{currentUser.email}</div>
                      <span
                        className={`status-badge ${currentUser.role} popover-role`}
                      >
                        {currentUser.role === "super_admin"
                          ? "Super Admin"
                          : currentUser.role === "admin"
                            ? "Admin"
                            : "Utilisateur"}
                      </span>
                    </div>
                  </div>
                  <div className="profile-popover-actions">
                    <button onClick={() => { setIsProfileEditOpen(true); setIsProfileOpen(false); }} className="profile-signout-btn">
                      <FiUser size={18} style={{ marginRight: "0.5rem" }} />
                      <span>Mon Profil</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="profile-avatar-placeholder"></div>
          )}
        </div>

        <div className="navbar-divider"></div>

        <div className="navbar-actions">
          <button
            className="navbar-icon-btn"
            title="Se déconnecter"
            onClick={onLogout}
            style={{ width: 'auto', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}
          >
            <FiLogOut size={18} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Déconnexion</span>
          </button>
        </div>
      </div>

      {isProfileEditOpen && currentUser && (
        <div
          className="modal-overlay"
          onClick={() => !loading && setIsProfileEditOpen(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setIsProfileEditOpen(false)}
            >
              ×
            </button>
            <div className="auth-card-header" style={{ marginBottom: "2rem" }}>
              <div className="auth-card-icon"><FaUser style={{ color: 'var(--primary-color)' }} /></div>
              <h2 className="auth-card-title">Mon Profil</h2>
              <p className="auth-card-subtitle">
                Modifiez vos informations personnelles
              </p>
            </div>

            <form className="auth-form" onSubmit={handleProfileEditSubmit}>
              <div className="auth-input-grid">
                <div className="auth-input-group" style={{ gridColumn: "span 2" }}>
                  <label className="auth-input-label">Nom complet</label>
                  <input
                    className="auth-input"
                    type="text"
                    value={editNom}
                    onChange={(e) => setEditNom(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-input-group" style={{ gridColumn: "span 2" }}>
                  <label className="auth-input-label">Email</label>
                  <input
                    className="auth-input"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-input-group" style={{ gridColumn: "span 2" }}>
                  <label className="auth-input-label">Ancien mot de passe</label>
                  <input
                    className="auth-input"
                    type="password"
                    value={editOldPassword}
                    onChange={(e) => setEditOldPassword(e.target.value)}
                    placeholder="Saisissez-le pour modifier votre mot de passe"
                  />
                </div>
                <div className="auth-input-group" style={{ gridColumn: "span 2" }}>
                  <label className="auth-input-label">Nouveau mot de passe</label>
                  <input
                    className="auth-input"
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Laissez vide si vous ne souhaitez pas le changer"
                    minLength={6}
                  />
                </div>
              </div>
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? "Mise à jour..." : "Mettre à jour le profil"}
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
    </header>
  );
};
