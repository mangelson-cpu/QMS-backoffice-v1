import React, { useEffect, useState, useRef, useCallback } from "react";
import { MdPhone, MdSkipNext, MdCheckCircle } from "react-icons/md";
import { TbDatabaseOff } from "react-icons/tb";
import { FaCoffee } from "react-icons/fa";
import { FiBriefcase, FiInbox, FiLogOut } from "react-icons/fi";
import "./AgentTicketManager.css";
import { apiClient } from "../../../../shared/api/apiClient";
import type { Ticket, SousService } from "../../../../shared/types";
import { sortByPriority } from "../../../../shared/utils/priorityUtils";

export const AgentTicketManager: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userAgenceId, setUserAgenceId] = useState<string | null>(null);
  const [animatingOutId, setAnimatingOutId] = useState<string | null>(null);
  const [exitType, setExitType] = useState<"ignore" | "done" | null>(null);
  const [justCalledId, setJustCalledId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [guichetName, setGuichetName] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<"pret" | "pause">("pause");
  const [isSearching, setIsSearching] = useState(false);
  const [guichetServices, setGuichetServices] = useState<string[]>([]);
  const [availableGuichets, setAvailableGuichets] = useState<string[]>([]);
  const [guichetAppellations, setGuichetAppellations] = useState<
    Record<string, string>
  >({});
  const [activeGuichets, setActiveGuichets] = useState<string[]>([]);
  const [isLoadingGuichets, setIsLoadingGuichets] = useState(true);

  const [currentSousServices, setCurrentSousServices] = useState<SousService[]>(
    [],
  );
  const [selectedSousServiceId, setSelectedSousServiceId] =
    useState<string>("");

  const [reactions, setReactions] = useState<
    { id: string; emoji: string; left: number }[]
  >([]);
  const [persistentReaction, setPersistentReaction] = useState<string | null>(
    null,
  );

  const releaseGuichet = async (agentId: string) => {
    try {
      await apiClient.delete(`/guichets/active?user_id=${agentId}`);
    } catch (error) {
      console.error("Erreur lors de la libération du guichet:", error);
    }
  };

  const fetchTickets = useCallback(async () => {
    if (guichetServices.length === 0) return [];
    
    try {
      const response = await apiClient.get('/tickets');
      const allTickets = response.tickets || [];
      
      const filtered = allTickets.filter((t: any) => 
        guichetServices.includes(t.service_id) && 
        ["waiting", "ready", "called"].includes(t.status)
      );

      const sorted = sortByPriority(filtered as Ticket[]);
      setTickets(sorted);
      return sorted;
    } catch (err) {
      console.error("Erreur lors de la récupération des tickets:", err);
    }
    return [];
  }, [guichetServices]);

  const fetchUserAndGuichets = useCallback(async () => {
    setIsLoadingGuichets(true);
    try {
      const meRes = await apiClient.get('/auth/me');
      const user = meRes.user;
      
      if (user) {
        setUserId(user.id);
        setAgentName(user.nom_user);
        setUserAgenceId(user.agence_id);

        if (user.agence_id) {
          const [guichetRes, activeRes] = await Promise.all([
            apiClient.get(`/guichets?agence_id=${user.agence_id}`),
            apiClient.get(`/guichets/active?agence_id=${user.agence_id}`)
          ]);

          const mapping: Record<string, string> = {};
          (guichetRes.guichets || []).forEach((item: any) => {
            if (item.appellation) mapping[item.nom_guichet] = item.appellation;
          });
          setGuichetAppellations(mapping);

          const distinctGuichets = (guichetRes.guichets || []).map((g: any) => g.nom_guichet);
          setAvailableGuichets(distinctGuichets);

          const activeGuichetsData = activeRes.activeGuichets || [];
          setActiveGuichets(activeGuichetsData.map((a: any) => a.nom_guichet));

          const myActive = activeGuichetsData.find((a: any) => a.user_id === user.id);
          if (myActive) {
            const servicesRes = await apiClient.get(`/guichets/services?nom_guichet=${encodeURIComponent(myActive.nom_guichet)}&agence_id=${user.agence_id}`);
            const srvs = servicesRes.guichetServices || [];
            
            if (srvs.length > 0) {
              setGuichetName(myActive.nom_guichet);
              setGuichetServices(srvs.map((s: any) => s.service_id));
            } else {
              await releaseGuichet(user.id);
              setActiveGuichets(prev => prev.filter(g => g !== myActive.nom_guichet));
            }
          }
        }
      }
    } catch (err) {
      console.error("Erreur fetchUserAndGuichets:", err);
    } finally {
      setIsLoadingGuichets(false);
    }
  }, []);

  useEffect(() => {
    // Le Realtime sera migré vers Socket.io plus tard. 
    const interval = setInterval(async () => {
      if (guichetName && agentStatus === "pret") {
        fetchTickets();
      } else if (!guichetName && userAgenceId) {
        try {
          const activeRes = await apiClient.get(`/guichets/active?agence_id=${userAgenceId}`);
          const activeGuichetsData = activeRes.activeGuichets || [];
          setActiveGuichets(activeGuichetsData.map((a: any) => a.nom_guichet));
        } catch (err) {
          console.error("Erreur polling active guichets:", err);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [guichetName, agentStatus, fetchTickets, userAgenceId]);

  useEffect(() => {
    fetchUserAndGuichets();
  }, [fetchUserAndGuichets]);



  const handleSelectGuichet = async (selectedName: string) => {
    if (!userAgenceId || !userId) return;

    setActiveGuichets((prev) => [...prev, selectedName]);

    try {
      await apiClient.post('/guichets/active', {
        nom_guichet: selectedName,
        agence_id: userAgenceId,
        user_id: userId,
      });

      const servicesRes = await apiClient.get(`/guichets/services?nom_guichet=${encodeURIComponent(selectedName)}&agence_id=${userAgenceId}`);
      const srvs = servicesRes.guichetServices || [];

      if (srvs.length > 0) {
        setGuichetName(selectedName);
        setGuichetServices(srvs.map((s: any) => s.service_id));
      } else {
        console.warn("Aucun service trouvé pour ce guichet");
        setGuichetServices([]);
        await releaseGuichet(userId);
        setActiveGuichets((prev) => prev.filter((g) => g !== selectedName));
      }
    } catch (err: any) {
      console.error("Impossible de prendre ce guichet:", err);
      alert(err.message || "Ce guichet est déjà occupé ou une erreur est survenue.");
      setActiveGuichets((prev) => prev.filter((g) => g !== selectedName));
    }
  };

  const handleLeaveGuichet = async () => {
    if (!userId) return;

    if (guichetName) {
      setActiveGuichets((prev) => prev.filter((g) => g !== guichetName));
    }

    await releaseGuichet(userId);
    setGuichetName(null);
    setAgentStatus("pause");
    setGuichetServices([]);
  };



  const handleStatusChange = async (newStatus: "pret" | "pause") => {
    if (newStatus === "pret" && agentStatus === "pause") {
      setAgentStatus("pret");
      setIsSearching(true);

      const freshTickets = await fetchTickets();
      const waitingTicket = freshTickets.find((t) => t.status === "waiting");
      if (waitingTicket && userId) {
        try {
          await apiClient.patch(`/tickets/${waitingTicket.id}/status`, {
            status: "ready",
            nom_guichet: guichetName,
          });

          setTickets((prev) =>
            prev.map((t) =>
              t.id === waitingTicket.id
                ? {
                  ...t,
                  status: "ready" as const,
                  user_id: userId,
                  nom_guichet: guichetName as string,
                }
                : t,
            ),
          );
        } catch (err) {
          console.error("Erreur statusChange:", err);
        }
      }

      setTimeout(() => {
        setIsSearching(false);
      }, 1000);
    } else {
      setAgentStatus(newStatus);
      setIsSearching(false);
    }
  };

  const formatTicketNumber = (ticketNumber: string | undefined) => {
    if (!ticketNumber) return "";
    return ticketNumber;
  };

  const getPriorityClass = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "vip":
        return "priority-vip";
      case "urgent":
        return "priority-urgent";
      default:
        return "priority-normal";
    }
  };

  useEffect(() => {
    if (guichetServices.length === 0) return;
    fetchTickets();
  }, [guichetServices, fetchTickets]);

  const activeTicket = tickets.find(
    (t) =>
      (t.status === "called" || t.status === "ready") && t.user_id === userId,
  );
  const firstWaitingTicket = tickets.find((t) => t.status === "waiting");
  const currentTicket =
    activeTicket || (isSearching ? null : firstWaitingTicket);

  useEffect(() => {
    const loadSousServicesForCurrentTicket = async () => {
      setSelectedSousServiceId("");
      if (currentTicket && currentTicket.service_id) {
        try {
          const res = await apiClient.get(`/services/${currentTicket.service_id}/sous-services`);
          setCurrentSousServices(res.sousServices || []);
        } catch (err) {
          console.error("Erreur loadSousServices:", err);
          setCurrentSousServices([]);
        }
      } else {
        setCurrentSousServices([]);
      }
    };

    loadSousServicesForCurrentTicket();
  }, [currentTicket?.id, currentTicket?.service_id]);

  useEffect(() => {
    setPersistentReaction(null);

    if (currentTicket?.numero_ticket) {
      const fetchExistingEvaluation = async () => {
        try {
          const res = await apiClient.get(`/evaluations?ticket_numero=${currentTicket.numero_ticket}`);
          if (res.evaluation) {
            setPersistentReaction("✅");
          }
        } catch (err) {
          // Pas d'évaluation, c'est normal
        }
      };

      fetchExistingEvaluation();
    }
  }, [currentTicket?.numero_ticket]);

  const handleAppeler = async (ticket: Ticket) => {
    if (!userId) return;

    if (ticket.status === "waiting" || ticket.status === "ready") {
      const dateDebut = ticket.date_debut || new Date().toISOString();
      try {
        await apiClient.patch(`/tickets/${ticket.id}/status`, {
          status: "called",
          nom_guichet: guichetName ?? undefined,
          date_debut: dateDebut,
        });

        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticket.id
              ? {
                ...t,
                status: "called" as const,
                user_id: userId,
                nom_guichet: guichetName ?? undefined,
                date_debut: dateDebut,
              }
              : t,
          ),
        );
      } catch (err) {
        console.error("Erreur handleAppeler:", err);
      }
    } else if (ticket.status === "called") {
      console.log("Rappel du ticket:", ticket.numero_ticket);
      setJustCalledId(ticket.id);
      setTimeout(() => setJustCalledId(null), 1500);

      try {
        await apiClient.post(`/tickets/${ticket.id}/rappel`);
      } catch (err) {
        console.error("Erreur lors du rappel:", err);
      }
    }
  };

  const handleIgnorer = async (ticket: Ticket) => {
    setExitType("ignore");
    setAnimatingOutId(ticket.id);

    setTimeout(async () => {
      try {
        await apiClient.patch(`/tickets/${ticket.id}/status`, { status: "cancelled" });
        setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
        setAgentStatus("pause");
      } catch (err) {
        console.error("Erreur handleIgnorer:", err);
      }
      setAnimatingOutId(null);
      setExitType(null);
    }, 500);
  };

  const handleTerminer = async (ticket: Ticket) => {
    setExitType("done");
    setAnimatingOutId(ticket.id);

    setTimeout(async () => {
      const dateFin = new Date().toISOString();
      try {
        const updatePayload: any = {
          status: "done",
          date_fin: dateFin,
        };

        if (!ticket.date_debut) {
          updatePayload.date_debut = dateFin;
        }

        if (selectedSousServiceId) {
          updatePayload.sous_service_id = selectedSousServiceId;
        }

        await apiClient.patch(`/tickets/${ticket.id}/status`, updatePayload);
        
        setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
        setAgentStatus("pause");
      } catch (err) {
        console.error("Erreur handleTerminer:", err);
      }
      setAnimatingOutId(null);
      setExitType(null);
    }, 500);
  };

  const isTicketCalled = currentTicket?.status === "called";

  const isTerminerDisabled = !isTicketCalled;
  const isIgnorerDisabled = !isTicketCalled;

  return (
    <div className="agent-ticket-manager">
      {!guichetName ? (
        <div
          className="atm-main-container"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            position: "relative",
          }}
        >
          {isLoadingGuichets ? (
            <div className="status-placeholder searching-mode">
              <div className="searching-pulse"></div>
              <h3>Recherche des postes...</h3>
              <p>Veuillez patienter quelques instants.</p>
            </div>
          ) : availableGuichets.length > 0 ? (
            <div className="status-placeholder">
              <div className="placeholder-icon"><FiBriefcase style={{ color: 'var(--primary-color)' }} /></div>
              <h3>Sélectionnez votre poste de travail</h3>
              <p style={{ marginBottom: "2rem" }}>
                Veuillez choisir le guichet sur lequel vous êtes connecté
                aujourd'hui.
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  width: "100%",
                  maxWidth: "300px",
                }}
              >
                {availableGuichets.map((g) => {
                  const isTaken = activeGuichets.includes(g);
                  const customName = (guichetAppellations[g] && guichetAppellations[g] !== g)
                    ? `(${guichetAppellations[g]})`
                    : "";
                  return (
                    <button
                      key={g}
                      className={`primary-gradient-btn ${isTaken ? "disabled-btn" : ""}`}
                      onClick={() => !isTaken && handleSelectGuichet(g)}
                      style={{
                        opacity: isTaken ? 0.5 : 1,
                        cursor: isTaken ? "not-allowed" : "pointer",
                      }}
                      disabled={isTaken}
                      title={isTaken ? "Déjà occupé par un autre agent" : ""}
                    >
                      {g} {customName} {isTaken && "( occupé )"}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="status-placeholder empty-mode">
              <div
                className="placeholder-icon"
                style={{ fontSize: "3rem", opacity: 0.5 }}
              >
                <FiInbox style={{ color: 'var(--primary-color)' }} />
              </div>
              <h3>Aucun poste libre</h3>
              <p>Aucun guichet n'est configuré pour cette agence.</p>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="atm-main-container" style={{ position: "relative" }}>
            <header className="page-header">
              <div className="header-text">
                <h1>Appel Tickets</h1>
                <p>Gérez et appelez les tickets de votre guichet</p>
              </div>
              <div
                className="agent-info-badge"
                style={{ cursor: "pointer" }}
                onClick={handleLeaveGuichet}
                title="Quitter ce guichet"
              >
                <span className="agent-name">{agentName || "Agent"}</span>
                <span className="guichet-badge">
                  {guichetName
                    ? `${guichetName} ${guichetAppellations[guichetName] ? `(${guichetAppellations[guichetName]})` : ""}`
                    : "Guichet non assigné"}{" "}
                  <FiLogOut style={{ marginLeft: '8px', verticalAlign: 'middle', color: 'var(--danger-color)' }} />
                </span>
              </div>
            </header>

            <div className="ticket-display-area">
              {agentStatus === "pause" ? (
                <div className="status-placeholder pause-mode">
                  <div className="placeholder-icon">
                    <FaCoffee />
                  </div>
                  <h3>En Pause</h3>
                  <p>
                    Cliquez sur "Prêt" pour commencer à recevoir des tickets.
                  </p>
                </div>
              ) : isSearching ? (
                <div className="status-placeholder searching-mode">
                  <div className="searching-pulse"></div>
                  <h3>Recherche du prochain ticket...</h3>
                  <p>Veuillez patienter quelques instants.</p>
                </div>
              ) : currentTicket ? (
                <div
                  key={currentTicket.id}
                  className={`ticket-card ticket-card--active ticket-appear
                                ${animatingOutId === currentTicket.id ? (exitType === "ignore" ? "ticket-exit-left" : "ticket-exit-right") : ""} 
                                ${currentTicket.status === "called" || justCalledId === currentTicket.id ? "ticket-calling" : ""}`}
                >
                  <div className="ticket-card-left">
                    <div className="ticket-header-group">
                      <span className="ticket-label">Ticket en cours</span>
                      <div className="ticket-number-row">
                        <span className="ticket-number">
                          {formatTicketNumber(currentTicket.numero_ticket)}
                        </span>
                        <span
                          className={`priority-tag ${currentTicket.priority ? "" : getPriorityClass(currentTicket.niveau)}`}
                          style={currentTicket.priority ? { 
                            backgroundColor: currentTicket.priority.couleur,
                            color: "#fff",
                            boxShadow: `0 2px 8px ${currentTicket.priority.couleur}44`
                          } : {}}
                        >
                          {currentTicket.priority ? currentTicket.priority.nom : currentTicket.niveau}
                        </span>
                      </div>
                    </div>
                    <div className="ticket-actions-left">
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <button
                          className="action-btn-small"
                          onClick={() => handleAppeler(currentTicket)}
                        >
                          <MdPhone />{" "}
                          {currentTicket.status === "called"
                            ? "Rappeler"
                            : "Appeler"}
                        </button>
                        <button
                          className="action-btn-small btn-ignore"
                          onClick={() => handleIgnorer(currentTicket)}
                          disabled={isIgnorerDisabled}
                          style={{
                            opacity: isIgnorerDisabled ? 0.5 : 1,
                            cursor: isIgnorerDisabled ? "not-allowed" : "pointer",
                          }}
                        >
                          <MdSkipNext /> Ignorer
                        </button>

                        {currentSousServices.length > 0 &&
                          (currentTicket.status === "called" ||
                            currentTicket.status === "ready") && (
                            <div
                              className="ticket-sous-service-inline"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                marginLeft: "auto",
                              }}
                            >
                              <label
                                htmlFor="sous-service-select"
                                className="ticket-label"
                                style={{
                                  marginBottom: 0,
                                  fontSize: "0.8rem",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Sous-service{" "}
                                <span style={{ color: "var(--danger-color)" }}>
                                  *
                                </span>{" "}
                                :
                              </label>
                              <select
                                id="sous-service-select"
                                value={selectedSousServiceId}
                                onChange={(e) =>
                                  setSelectedSousServiceId(e.target.value)
                                }
                                className="auth-input"
                                style={{
                                  padding: "0.4rem",
                                  fontSize: "0.85rem",
                                  backgroundColor: "var(--bg-glass)",
                                  width: "auto",
                                  minWidth: "150px",
                                }}
                              >
                                <option value="" disabled>
                                  --- Choisir ---
                                </option>
                                {currentSousServices.map((ss) => (
                                  <option key={ss.id} value={ss.id}>
                                    {ss.nom_sous_service}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                  <div className="ticket-card-right">
                    <div
                      className="ticket-service-group"
                      style={{ flexGrow: 1 }}
                    >
                      <span className="ticket-label">Service</span>
                      <span className="ticket-service">
                        {currentTicket.service?.nom_service || "N/A"}
                      </span>
                    </div>

                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        gap: "1.5rem",
                      }}
                    >
                      {persistentReaction && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontWeight: 700,
                            animation: "ticketAppear 0.4s ease-out",
                            background: "#f8fafc",
                            padding: "0.5rem 1rem",
                            borderRadius: "12px",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <span
                            style={{
                              color: "#64748b",
                              fontSize: "0.85rem",
                              letterSpacing: "0.05em",
                            }}
                          >
                            SC :
                          </span>
                          <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>
                            {persistentReaction}
                          </span>
                        </div>
                      )}

                      <div className="reactions-container">
                        {reactions.map((r) => (
                          <div
                            key={r.id}
                            className="floating-emoji"
                            style={{ left: `${r.left}%` }}
                          >
                            {r.emoji}
                          </div>
                        ))}
                      </div>

                      <button
                        className="btn-terminer-mockup"
                        onClick={() => handleTerminer(currentTicket)}
                        disabled={isTerminerDisabled}
                        style={{
                          opacity: isTerminerDisabled ? 0.5 : 1,
                          cursor: isTerminerDisabled
                            ? "not-allowed"
                            : "pointer",
                        }}
                        title={
                          isTerminerDisabled
                            ? "Veuillez cliquer sur 'Appeler' en premier"
                            : ""
                        }
                      >
                        <MdCheckCircle /> Terminer
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="status-placeholder empty-mode">
                  <div className="placeholder-icon">
                    <TbDatabaseOff />
                  </div>
                  <h3>Aucun ticket en attente</h3>
                  <p>Tous les tickets de vos services ont été traités.</p>
                </div>
              )}
            </div>
          </div>

          <div className="atm-status-footer">
            <div className="status-footer-content">
              <span className="status-label">Statut :</span>
              <div className="status-buttons">
                <button
                  className={`status-btn btn-pause ${agentStatus === "pause" ? "active" : ""}`}
                  onClick={() => handleStatusChange("pause")}
                >
                  <span className="status-dot"></span>
                  Pause
                </button>
                <button
                  className={`status-btn btn-pret ${agentStatus === "pret" ? "active" : ""}`}
                  onClick={() => handleStatusChange("pret")}
                >
                  <span className="status-dot"></span>
                  Prêt
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
