import React, { useState } from "react";
import { FiLock } from "react-icons/fi";

import type { UserRole } from "../../../shared/types";

interface Props {
  onLogin: (role: UserRole, agenceId: string | null) => void;
}

export const LoginForm: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Email ou mot de passe incorrect");
      }

      // Stocker les informations reçues
      localStorage.setItem("token", data.token);
      localStorage.setItem("user_role", data.user.role);
      localStorage.setItem("user_agence_id", data.user.agence_id || "");

      setMessage("Connexion réussie !");
      setIsError(false);
      onLogin(data.user.role as UserRole, data.user.agence_id || null);
    } catch (err) {
      setIsError(true);
      if (err instanceof Error) setMessage(err.message);
      else setMessage("Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-card-icon"><FiLock style={{ color: 'var(--primary-color)' }} /></div>
          <h2 className="auth-card-title">Connexion</h2>
          <p className="auth-card-subtitle">
            Gérez vos tickets en toute simplicité
          </p>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="auth-input-group">
            <label className="auth-input-label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className="auth-input"
              type="email"
              placeholder="jean@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-input-label" htmlFor="login-password">
              Mot de passe
            </label>
            <input
              id="login-password"
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className={`auth-button ${loading ? "auth-button--loading" : ""}`}
            disabled={loading}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          {message && (
            <div
              className={`auth-message ${isError ? "auth-message--error" : "auth-message--success"}`}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
