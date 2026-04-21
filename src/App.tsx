import "./App.css";
import { useState, useEffect } from "react";
import { supabase } from "./shared/api/supabaseClient";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { UserRole, Agence } from "./shared/types";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./app/layout/MainLayout";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { AgentsPage } from "./pages/Agents";
import { ServicePage } from "./pages/Services";
import { AgencePage } from "./pages/Agences";
import { TicketsListPage } from "./pages/TicketsList";
import { GuichetPage } from "./pages/Guichets";
import { SettingsPage } from "./pages/Settings";
import { KioskConfigPage } from "./pages/KioskConfig/KioskConfigPage";
import { PrioritiesPage } from "./pages/Priority/PrioritiesPage";
import { ThemeProvider } from "./shared/context/ThemeContext";

const LoadingOverlay = ({ message }: { message: string }) => (
  <div className="global-loading-overlay">
    <div className="loader-spinner"></div>
    <p className="loader-text">{message}</p>
  </div>
);

function App() {
  const [agences, setAgences] = useState<Agence[]>([]);
  const [userRole, setUserRole] = useState<UserRole | null>(
    () => localStorage.getItem("user_role") as UserRole,
  );
  const [userAgenceId, setUserAgenceId] = useState<string | null>(() =>
    localStorage.getItem("user_agence_id"),
  );
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const fetchAgences = async () => {
      try {
        const { data } = await supabase.from("agence").select("*");
        setAgences(data ?? []);
      } catch (err) {
        console.error("Erreur fetchAgences:", err);
      }
    };

    const loadProfile = async (userId: string) => {
      try {
        const { data: profile, error } = await supabase
          .from("users")
          .select("role, agence_id")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Erreur profile:", error);
          return;
        }

        if (profile) {
          const role = profile.role as UserRole;
          const agenceId = profile.agence_id;
          setUserRole(role);
          setUserAgenceId(agenceId);
          localStorage.setItem("user_role", role);
          localStorage.setItem("user_agence_id", agenceId || "");
        }
      } catch (err) {
        console.error("Exception loadProfile:", err);
      }
    };

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          await loadProfile(session.user.id);
        } else {
          console.log("No active session, keeping local cache for stability");
        }
      } catch (err) {
        console.error(
          "Session check skipped/failed, keeping local state:",
          err,
        );
      }
      setInitialLoading(false);
    };

    const safetyTimeout = setTimeout(() => setInitialLoading(false), 3000);

    fetchAgences();
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        console.log("Auth Event Debug:", event);

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (session) {
            setTimeout(() => {
              loadProfile(session.user.id).catch(console.error);
            }, 0);
          }
        }
      },
    );

    return () => {
      clearTimeout(safetyTimeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Erreur lors de la déconnexion:", err);
    } finally {
      setUserRole(null);
      setUserAgenceId(null);
      localStorage.clear();
      sessionStorage.clear();

      window.location.replace("/login");
    }
  };

  const handleLoginSuccess = (role: UserRole) => {
    setUserRole(role);
  };

  return (
    <ThemeProvider>
    <div className="App">
      {initialLoading && <LoadingOverlay message="Chargement..." />}

      <BrowserRouter>
        <Routes>

          {userRole ? (
            <Route
              element={
                <MainLayout userRole={userRole} onLogout={handleLogout} />
              }
            >
              <Route path="/" element={<DashboardPage userRole={userRole} />} />
              <Route
                path="/agents"
                element={
                  <AgentsPage
                    agences={agences}
                    userRole={userRole}
                    currentUserAgenceId={userAgenceId}
                  />
                }
              />
              <Route
                path="/services"
                element={
                  <ServicePage
                    userRole={userRole}
                    currentUserAgenceId={userAgenceId}
                  />
                }
              />
              <Route
                path="/priorities"
                element={
                  <PrioritiesPage
                    userRole={userRole}
                    currentUserAgenceId={userAgenceId}
                  />
                }
              />
              <Route path="/agences" element={<AgencePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/kiosk-config" element={<KioskConfigPage />} />
              <Route
                path="/tickets-list"
                element={
                  <TicketsListPage
                    userRole={userRole}
                    currentUserAgenceId={userAgenceId}
                  />
                }
              />
              <Route
                path="/guichets"
                element={
                  <GuichetPage
                    userRole={userRole}
                    currentUserAgenceId={userAgenceId}
                  />
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          ) : (
            <>
              <Route
                path="/login"
                element={<LoginPage onLogin={handleLoginSuccess} />}
              />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          )}
        </Routes>
      </BrowserRouter>
    </div>
    </ThemeProvider>
  );
}

export default App;
