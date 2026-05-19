import React, { useEffect, useState, useCallback } from "react";
import type { UserRole, Ticket } from "../../shared/types";
import { AgentTicketManager } from "../../features/ticket/ui/AgentTicketManager/AgentTicketManager";
import { apiClient } from "../../shared/api/apiClient";
import {
  MdSentimentVerySatisfied,
  MdSentimentNeutral,
  MdSentimentVeryDissatisfied
} from "react-icons/md";
import { FiInbox } from "react-icons/fi";


interface Props {
  userRole: UserRole;
  currentUserAgenceId: string | null;
}

type ExtendedTicket = Ticket & {
  service?: { nom_service: string };
  sous_service?: { nom_sous_service: string };
  agence?: { nom: string };
  agent_nom?: string;
  evaluation_score?: number | null;
};

export const TicketsListPage: React.FC<Props> = ({ userRole }) => {
  const [tickets, setTickets] = useState<ExtendedTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [preset, setPreset] = useState<string>("today");

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [customStartDate, setCustomStartDate] = useState<string>(getTodayString());
  const [customEndDate, setCustomEndDate] = useState<string>(getTodayString());

  const formatDateToInput = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handlePresetChange = (newPreset: string) => {
    setPreset(newPreset);

    if (newPreset !== "all") {
      const now = new Date();
      let start = new Date();
      let end = new Date();

      if (newPreset === "today") {
        // Reste sur aujourd'hui
      } else if (newPreset === "yesterday") {
        start.setDate(now.getDate() - 1);
        end.setDate(now.getDate() - 1);
      } else if (newPreset === "7days") {
        start.setDate(now.getDate() - 6);
      } else if (newPreset === "30days") {
        start.setDate(now.getDate() - 29);
      }

      setCustomStartDate(formatDateToInput(start));
      setCustomEndDate(formatDateToInput(end));
    } else {
      setCustomStartDate("");
      setCustomEndDate("");
    }
  };

  const handleCustomStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreset("custom");
    setCustomStartDate(e.target.value);
  };

  const handleCustomEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreset("custom");
    setCustomEndDate(e.target.value);
  };

  const fetchTicketsData = useCallback(async () => {
    setLoading(true);
    try {
      let query = "";
      if (preset === "all") {
        query = "?all=true";
      } else if (customStartDate && customEndDate) {
        const startParts = customStartDate.split("-").map(Number);
        const startD = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0);

        const endParts = customEndDate.split("-").map(Number);
        const endD = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999);

        query = `?startDate=${startD.toISOString()}&endDate=${endD.toISOString()}`;
      } else if (customStartDate) {
        const startParts = customStartDate.split("-").map(Number);
        const startD = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0);
        query = `?startDate=${startD.toISOString()}`;
      } else if (customEndDate) {
        const endParts = customEndDate.split("-").map(Number);
        const endD = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999);
        query = `?endDate=${endD.toISOString()}`;
      }

      // Appel au nouveau backend avec les paramètres de date
      const response = await apiClient.get(`/tickets${query}`);
      const ticketsData = response.tickets || [];

      if (ticketsData.length === 0) {
        setTickets([]);
        return;
      }

      // Le backend fournit déjà agence_nom et service_nom
      // On formate pour que ça match l'interface ExtendedTicket
      const formattedTickets: ExtendedTicket[] = ticketsData.map((t: any) => ({
        ...t,
        service: t.service ? t.service : { nom_service: t.service_nom || "---" },
        agence: t.agence ? t.agence : { nom: t.agence_nom || "---" },
        // On pourrait aussi ajouter la filiale pour le super_admin
        filiale: t.filiale_nom
      }));

      setTickets(formattedTickets);
    } catch (err) {
      console.error("Error fetching admin tickets:", err);
    } finally {
      setLoading(false);
    }
  }, [preset, customStartDate, customEndDate]);

  useEffect(() => {
    if (userRole === "admin" || userRole === "super_admin") {
      fetchTicketsData();
    }
  }, [fetchTicketsData, userRole]);

  if (userRole === "user") {
    return <AgentTicketManager />;
  }

  const getEmojiForScore = (score: any) => {
    if (score === null || score === undefined || score === "") return "---";
    const num = Number(score);
    if (num === 3) return <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><MdSentimentVerySatisfied size={20} color="#10b981" /> Très satisfait</span>;
    if (num === 2) return <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><MdSentimentNeutral size={20} color="#f59e0b" /> Neutre</span>;
    if (num === 1) return <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><MdSentimentVeryDissatisfied size={20} color="#ef4444" /> Insatisfait</span>;
    return `Note: ${score}`;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "waiting": return "priority-normal";
      case "ready": return "priority-normal";
      case "called": return "priority-vip";
      case "done": return "priority-normal";
      case "cancelled": return "priority-urgent";
      default: return "";
    }
  };

  const formatDuration = (start: Date, end: Date) => {
    const diffMs = Math.max(0, end.getTime() - start.getTime());
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 60) return `${diffSecs} s`;

    const mins = Math.floor(diffSecs / 60);
    const secs = diffSecs % 60;

    if (mins < 60) {
      return secs > 0 ? `${mins} min ${secs} s` : `${mins} min`;
    }

    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;

    if (hours < 24) {
      return remainingMins > 0 ? `${hours} h ${remainingMins} min` : `${hours} h`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    return remainingHours > 0 ? `${days} j ${remainingHours} h` : `${days} j`;
  };

  return (
    <div className="agences-page">
      <header className="page-header">
        <div className="header-text">
          <h1>Liste des Tickets</h1>
          <p>Supervisez l'historique de tous les tickets</p>
        </div>
      </header>

      {/* Barre de filtrage par date premium */}
      <div style={{
        background: '#ffffff',
        padding: '1.25rem 1.5rem',
        borderRadius: '20px',
        border: '1px solid #f1f5f9',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.5rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '-0.5rem',
        marginBottom: '0.5rem'
      }}>
        {/* Sélecteur de période pré-définie */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Période :</span>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
            {[
              { id: 'today', label: "Aujourd'hui" },
              { id: 'yesterday', label: 'Hier' },
              { id: '7days', label: '7 jours' },
              { id: '30days', label: '30 jours' },
              { id: 'all', label: 'Tout' }
            ].map(p => {
              const active = preset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  style={{
                    border: 'none',
                    background: active ? 'linear-gradient(135deg, var(--primary-color, #8b5cf6), var(--secondary-color, #d4145a))' : 'transparent',
                    color: active ? '#ffffff' : '#64748b',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: active ? '0 4px 10px rgba(139, 92, 246, 0.2)' : 'none'
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sélecteur de dates personnalisées */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>Du</span>
            <input
              type="date"
              value={customStartDate}
              onChange={handleCustomStartChange}
              disabled={preset === 'all'}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                color: '#1e293b',
                background: preset === 'all' ? '#f8fafc' : '#ffffff',
                outline: 'none',
                transition: 'border-color 0.2s',
                fontFamily: 'inherit',
                cursor: preset === 'all' ? 'not-allowed' : 'default'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>Au</span>
            <input
              type="date"
              value={customEndDate}
              onChange={handleCustomEndChange}
              disabled={preset === 'all'}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                color: '#1e293b',
                background: preset === 'all' ? '#f8fafc' : '#ffffff',
                outline: 'none',
                transition: 'border-color 0.2s',
                fontFamily: 'inherit',
                cursor: preset === 'all' ? 'not-allowed' : 'default'
              }}
            />
          </div>
        </div>
      </div>

      <div className="content-card" style={{ overflowX: "auto", overflowY: "auto", position: "relative", maxHeight: "calc(100vh - 280px)" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>Chargement des données...</div>
        ) : (
          <>
            <table className="premium-table" style={{ minWidth: "1200px" }}>
              <thead>
                <tr>
                  <th>N° Ticket</th>
                  <th>Date & Heure</th>
                  <th>Service</th>
                  <th>Sous-service</th>
                  {userRole === "super_admin" && <th>Agence</th>}
                  <th>Guichet</th>
                  <th>Agent</th>
                  <th>Statut</th>
                  <th>Priorité</th>
                  <th>Attente</th>
                  <th>Traitement</th>
                  <th>Satisfaction</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length > 0 ? (
                  tickets.map((t) => {
                    const createdAt = new Date(t.created_at);
                    const beginAt = t.date_debut ? new Date(t.date_debut) : null;
                    const endAt = t.date_fin ? new Date(t.date_fin) : null;

                    const timeString = createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                    const dateString = createdAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

                    let waitTime = "---";
                    if (beginAt) {
                      waitTime = formatDuration(createdAt, beginAt);
                    }

                    let processTime = "---";
                    if (beginAt && endAt) {
                      processTime = formatDuration(beginAt, endAt);
                    }

                    return (
                      <tr key={t.id}>
                        <td className="font-bold">{t.numero_ticket}</td>
                        <td>
                          <span className="font-medium">{dateString}</span>
                          <span className="text-secondary text-sm" style={{ marginLeft: "8px" }}>{timeString}</span>
                        </td>
                        <td>{t.service?.nom_service || "---"}</td>
                        <td className="text-secondary">{t.sous_service?.nom_sous_service || "---"}</td>
                        {userRole === "super_admin" && (
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span className="font-medium">{t.agence?.nom || "---"}</span>
                              <span className="text-xs text-secondary">{(t as any).filiale || ""}</span>
                            </div>
                          </td>
                        )}
                        <td>{t.nom_guichet || "---"}</td>
                        <td>{t.agent_nom || "---"}</td>
                        <td>
                          <span className={`priority-tag ${getStatusBadgeClass(t.status)}`} style={{ textTransform: "capitalize" }}>
                            {t.status === 'done' ? 'Terminé' : t.status === 'cancelled' ? 'Ignoré' : t.status}
                          </span>
                        </td>
                        <td>
                          <span className={`priority-tag ${t.niveau === 'VIP' ? 'priority-vip' : t.niveau === 'Urgent' ? 'priority-urgent' : 'priority-normal'}`}>
                            {t.niveau}
                          </span>
                        </td>
                        <td className="text-secondary">{waitTime}</td>
                        <td className="text-secondary">{processTime}</td>
                        <td className="font-medium" style={{ whiteSpace: "nowrap" }}>
                          {getEmojiForScore(t.evaluation_score)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={userRole === "super_admin" ? 12 : 11}
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
                          Aucun ticket trouvé.
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

          </>
        )}
      </div>
    </div>
  );
};
