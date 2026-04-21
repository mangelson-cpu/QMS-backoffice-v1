import React, { useEffect, useState, useRef, useCallback } from "react";
import { MdPhone, MdSkipNext, MdCheckCircle } from "react-icons/md";
import { TbDatabaseOff } from "react-icons/tb";
import { FaCoffee } from "react-icons/fa";
import { FiBriefcase, FiInbox, FiLogOut } from "react-icons/fi";
import "./AgentTicketManager.css";
import { supabase } from "../../../../shared/api/supabaseClient";
import type { Ticket, SousService } from "../../../../shared/types";
import { sortByPriority } from "../../../../shared/utils/priorityUtils";
import { RealtimeChannel } from "@supabase/supabase-js";

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

  const broadcastChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    broadcastChannelRef.current = supabase.channel("public_dashboard_tickets");
    broadcastChannelRef.current.subscribe();

    return () => {
      if (broadcastChannelRef.current) {
        supabase.removeChannel(broadcastChannelRef.current);
      }
    };
  }, []);

  const releaseGuichet = async (agentId: string) => {
    try {
      await supabase.from("active_guichets").delete().eq("user_id", agentId);
    } catch (error) {
      console.error("Erreur lors de la libération du guichet:", error);
    }
  };

  useEffect(() => {
    const fetchUserAndGuichets = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);

        const { data: userData } = await supabase
          .from("users")
          .select("nom_user, agence_id")
          .eq("id", user.id)
          .single();

        if (userData) {
          setAgentName(userData.nom_user);
          setUserAgenceId(userData.agence_id);

          if (userData.agence_id) {
            setIsLoadingGuichets(true);

            const { data: appData } = await supabase
              .from("guichet")
              .select("nom_guichet, appellation")
              .eq("agence_id", userData.agence_id);

            if (appData) {
              const mapping: Record<string, string> = {};
              appData.forEach((item) => {
                if (item.appellation) {
                  mapping[item.nom_guichet] = item.appellation;
                }
              });
              setGuichetAppellations(mapping);
            }

            const { data: activeData } = await supabase
              .from("active_guichets")
              .select("nom_guichet, user_id")
              .eq("agence_id", userData.agence_id);

            if (appData) {
              const distinctGuichets = Array.from(
                new Set(appData.map((g) => g.nom_guichet)),
              );
              setAvailableGuichets(distinctGuichets);
            }
            if (activeData) {
              setActiveGuichets(activeData.map((a) => a.nom_guichet));

              const myActiveGuichet = activeData.find(
                (a) => a.user_id === user.id,
              );
              if (myActiveGuichet) {
                const { data: servicesData } = await supabase
                  .from("guichet_service")
                  .select("service_id")
                  .eq("nom_guichet", myActiveGuichet.nom_guichet)
                  .eq("agence_id", userData.agence_id);

                if (servicesData && servicesData.length > 0) {
                  setGuichetName(myActiveGuichet.nom_guichet);
                  setGuichetServices(servicesData.map((s) => s.service_id));
                } else {
                  releaseGuichet(user.id);
                  setActiveGuichets((prev) =>
                    prev.filter((g) => g !== myActiveGuichet.nom_guichet),
                  );
                }
              }
            }
          }

          setIsLoadingGuichets(false);
        } else {
          setIsLoadingGuichets(false);
        }
      } else {
        setIsLoadingGuichets(false);
      }
    };
    fetchUserAndGuichets();
  }, []);

  useEffect(() => {
    if (!userAgenceId) return;

    const channel = supabase
      .channel("active_guichets_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "active_guichets",
        },
        async () => {
          const { data } = await supabase
            .from("active_guichets")
            .select("nom_guichet")
            .eq("agence_id", userAgenceId);

          if (data) {
            setActiveGuichets(data.map((a) => a.nom_guichet));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userAgenceId]);

  const handleSelectGuichet = async (selectedName: string) => {
    if (!userAgenceId || !userId) return;

    setActiveGuichets((prev) => [...prev, selectedName]);

    const { error: lockError } = await supabase.from("active_guichets").insert({
      nom_guichet: selectedName,
      agence_id: userAgenceId,
      user_id: userId,
    });

    if (lockError) {
      console.error("Impossible de prendre ce guichet:", lockError);
      alert(
        "Ce guichet est déjà occupé par un autre agent ou une erreur est survenue.",
      );
      return;
    }

    const { data: servicesData } = await supabase
      .from("guichet_service")
      .select("service_id")
      .eq("nom_guichet", selectedName)
      .eq("agence_id", userAgenceId);

    if (servicesData && servicesData.length > 0) {
      setGuichetName(selectedName);
      setGuichetServices(servicesData.map((s) => s.service_id));
    } else {
      console.warn("Aucun service trouvé pour ce guichet");
      setGuichetServices([]);
      releaseGuichet(userId);
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

  const fetchTickets = useCallback(async () => {
    if (guichetServices.length === 0) return [];
    
    const { data: dataTicket, error: dataError } = await supabase
      .from("ticket")
      .select("*, service(nom_service), priority(*)")
      .in("status", ["waiting", "ready", "called"])
      .in("service_id", guichetServices)
      .order("created_at", { ascending: true });

    if (dataTicket) {
      const sorted = sortByPriority(dataTicket as Ticket[]);
      setTickets(sorted);
      return sorted;
    } else if (dataError) {
      console.error("Erreur lors de la récupération des tickets:", dataError);
    }
    return [];
  }, [guichetServices]);

  const handleStatusChange = async (newStatus: "pret" | "pause") => {
    if (newStatus === "pret" && agentStatus === "pause") {
      setAgentStatus("pret");
      setIsSearching(true);

      const freshTickets = await fetchTickets();
      const waitingTicket = freshTickets.find((t) => t.status === "waiting");
      if (waitingTicket && userId) {
        const { error } = await supabase
          .from("ticket")
          .update({
            status: "ready",
            user_id: userId,
            nom_guichet: guichetName,
          })
          .eq("id", waitingTicket.id)
          .eq("status", "waiting");

        if (!error) {
          setTickets((prev) =>
            prev.map((t) =>
              t.id === waitingTicket.id
                ? {
                  ...t,
                  status: "ready" as const,
                  user_id: userId,
                  nom_guichet: guichetName,
                }
                : t,
            ),
          );
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

    const channel = supabase
      .channel("ticket_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ticket",
          filter: `service_id=in.(${guichetServices.join(",")})`,
        },
        () => {
          fetchTickets();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
        const { data, error } = await supabase
          .from("sous_service")
          .select("*")
          .eq("service_id", currentTicket.service_id)
          .order("nom_sous_service", { ascending: true });

        if (data && !error) {
          setCurrentSousServices(data as SousService[]);
        } else {
          setCurrentSousServices([]);
        }
      } else {
        setCurrentSousServices([]);
      }
    };

    loadSousServicesForCurrentTicket();
  }, [currentTicket]);

  useEffect(() => {
    setPersistentReaction(null);

    if (currentTicket?.numero_ticket) {
      const fetchExistingEvaluation = async () => {
        const { data } = await supabase
          .from("evaluations")
          .select("score")
          .eq("ticket_numero", currentTicket.numero_ticket)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (data) {
          const score = data.score;

          let emoji = "✅";
          if (score) emoji;

          //let emoji = "👍";
          //if (score === 1) emoji = "😍";
          //else if (score === 2) emoji = "😐";
          //else if (score === 3) emoji = "😡";
          setPersistentReaction(emoji);
        }
      };

      fetchExistingEvaluation();
    }
  }, [currentTicket?.numero_ticket]);

  useEffect(() => {
    if (!currentTicket?.numero_ticket) return;

    console.log(
      "Abonnement Realtime activé pour le ticket:",
      currentTicket.numero_ticket,
    );

    const channel = supabase
      .channel(`evaluations_${currentTicket.numero_ticket}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "evaluations",
        },
        (payload) => {
          console.log("NOUVEAU VOTE/MISE A JOUR REÇU :", payload);

          if (!("new" in payload) || !payload.new) return;

          const newData = payload.new as {
            ticket_numero?: string;
            score?: number;
            id?: string;
          };

          if (newData.ticket_numero !== currentTicket.numero_ticket) {
            return;
          }

          const score = newData.score;
          if (score === undefined) return;

          let emoji = "✅";
          if (score) emoji;

          const newReaction = {
            id: newData.id || Date.now().toString(),
            emoji,
            left: 20 + Math.random() * 60,
          };
          setReactions((prev) => [...prev, newReaction]);

          setTimeout(() => {
            setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
            setPersistentReaction(emoji);
          }, 2000);
        },
      )
      .subscribe((status) => {
        console.log("Statut de la connexion Realtime :", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTicket?.numero_ticket]);

  const handleAppeler = async (ticket: Ticket) => {
    if (!userId) return;

    if (ticket.status === "waiting" || ticket.status === "ready") {
      const dateDebut = ticket.date_debut || new Date().toISOString();
      const updatePayload: Partial<Ticket> = {
        status: "called" as const,
        user_id: userId,
        nom_guichet: guichetName ?? undefined,
        date_debut: dateDebut,
      };

      const { error } = await supabase
        .from("ticket")
        .update(updatePayload)
        .eq("id", ticket.id);

      if (!error) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticket.id
              ? {
                ...t,
                ...updatePayload,
              }
              : t,
          ),
        );
      }
    } else if (ticket.status === "called") {
      console.log("Rappel du ticket:", ticket.numero_ticket);
      setJustCalledId(ticket.id);
      setTimeout(() => setJustCalledId(null), 1500);

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.send({
          type: "broadcast",
          event: "rappel_ticket",
          payload: { ticket },
        });
      }
    }
  };

  const handleIgnorer = async (ticket: Ticket) => {
    setExitType("ignore");
    setAnimatingOutId(ticket.id);

    setTimeout(async () => {
      const { error } = await supabase
        .from("ticket")
        .update({ status: "cancelled" })
        .eq("id", ticket.id);

      if (!error) {
        setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
        setAgentStatus("pause");
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

      const updatePayload: Partial<Ticket> = {
        status: "done" as const,
        date_fin: dateFin,
      };

      if (!ticket.date_debut) {
        updatePayload.date_debut = dateFin;
      }

      if (selectedSousServiceId) {
        updatePayload.sous_service_id = selectedSousServiceId;
      }

      const { error } = await supabase
        .from("ticket")
        .update(updatePayload)
        .eq("id", ticket.id);

      if (!error) {
        setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
        setAgentStatus("pause");
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
                  const customName = guichetAppellations[g]
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
                      {g} {customName} {isTaken && "[Occupé]"}
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
