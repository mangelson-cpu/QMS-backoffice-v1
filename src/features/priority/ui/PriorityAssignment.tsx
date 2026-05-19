import React, { useEffect, useState, useCallback } from "react";
import { apiClient } from "../../../shared/api/apiClient";
import type { Priority, AgencePriority, UserRole } from "../../../shared/types";
import { FiInbox } from "react-icons/fi";

interface Props {
  userRole: UserRole;
  currentUserAgenceId: string | null;
}

const getIconEmoji = (icone?: string | null) => {
  if (icone === "urgent") return "🔴";
  if (icone === "vip") return "⭐";
  if (icone === "normal") return "🟢";
  return "🔹";
};

export const PriorityAssignment: React.FC<Props> = ({ userRole, currentUserAgenceId }) => {
  const [globalPriorities, setGlobalPriorities] = useState<Priority[]>([]);
  const [agencyPriorities, setAgencyPriorities] = useState<AgencePriority[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState("");

  const fetchPriorities = useCallback(async () => {
    if (!currentUserAgenceId) return;
    setFetchError("");
    try {
      const globalRes = await apiClient.get("/priorities");
      const agencyRes = await apiClient.get(`/priorities/agence?agence_id=${currentUserAgenceId}`);

      setGlobalPriorities(globalRes.priorities || []);
      setAgencyPriorities(agencyRes.agencePriorities || []);
    } catch (err) {
      const error = err as Error;
      setFetchError(error.message || "Erreur lors du chargement des données");
    }
  }, [currentUserAgenceId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchPriorities();
      setLoading(false);
    };
    load();
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

  const activeCount = agencyPriorities.filter(ap => ap.is_active).length;

  if (userRole !== "admin") {
    return <div className="auth-permission-denied">Accès réservé aux administrateurs.</div>;
  }

  return (
    <div className="services-page">
      <header className="page-header">
        <div className="header-text">
          <h1>Affectation des priorités</h1>
          <p>Activez ou désactivez les priorités pour votre agence</p>
        </div>
        <div style={{
          background: "linear-gradient(135deg, #8b5cf6, #d4145a)",
          padding: "8px 16px",
          borderRadius: "12px",
          color: "white",
          fontWeight: 700,
          fontSize: "0.9rem"
        }}>
          {activeCount} / {globalPriorities.length} activée(s)
        </div>
      </header>

      <div className="content-card" style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 240px)", position: "relative" }}>
        {fetchError && (
          <div className="auth-message auth-message--error" style={{ marginBottom: "1.5rem" }}>
            {fetchError}
          </div>
        )}

        <table className="premium-table">
          <thead>
            <tr>
              <th>Priorité</th>
              <th>Poids</th>
              <th>Couleur</th>
              <th style={{ textAlign: "right" }}>État / Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3].map(i => (
                <tr key={i} style={{ opacity: 0.5 }}>
                  <td colSpan={4} style={{ textAlign: "center", padding: "1rem" }}>Chargement...</td>
                </tr>
              ))
            ) : globalPriorities.length > 0 ? (
              globalPriorities.map((p) => {
                const active = isActive(p.id);
                return (
                  <tr key={p.id}>
                    <td className="font-bold">
                      <span style={{ marginRight: "8px" }}>{getIconEmoji(p.icone)}</span>
                      {p.nom}
                    </td>
                    <td>
                      <span style={{ 
                        padding: "4px 10px", 
                        borderRadius: "12px", 
                        background: "#f1f5f9", 
                        fontSize: "0.85rem",
                        fontWeight: 600
                      }}>
                        Niveau {p.valeur}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ 
                          width: "16px", 
                          height: "16px", 
                          borderRadius: "4px", 
                          background: p.couleur,
                          border: "1px solid rgba(0,0,0,0.1)"
                        }} />
                        <span style={{ color: "#64748b", fontSize: "0.85rem" }}>{p.couleur}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className={`auth-button ${active ? "" : "secondary"}`}
                        onClick={() => togglePriority(p.id)}
                        disabled={toggling === p.id}
                        style={{
                          padding: "6px 16px",
                          fontSize: "0.85rem",
                          width: "auto",
                          minWidth: "110px",
                          background: active ? "linear-gradient(135deg, #22c55e, #16a34a)" : "#f1f5f9",
                          color: active ? "white" : "#64748b",
                          border: active ? "none" : "1px solid #e2e8f0"
                        }}
                      >
                        {toggling === p.id ? "Attente..." : (active ? "✔ Activée" : "○ Désactivée")}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={4}
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
                      Aucune priorité disponible.
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
