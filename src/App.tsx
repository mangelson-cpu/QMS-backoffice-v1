import "./App.css";
import { useState, useEffect } from "react";
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
import { FilialesPage } from "./pages/Filiales/FilialesPage";
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
        // Les agences ne seront chargées que quand on est connecté et que le tenant est résolu
        // Pour l'instant on laisse un tableau vide, les pages qui en ont besoin les chargent elles-mêmes
        setAgences([]);
      } catch (err) {
        console.error("Erreur fetchAgences:", err);
      }
    };

    const checkSession = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (res.ok) {
            const data = await res.json();
            const role = data.user.role as UserRole;
            const agenceId = data.user.agence_id;
            
            setUserRole(role);
            setUserAgenceId(agenceId);
            localStorage.setItem("user_role", role);
            localStorage.setItem("user_agence_id", agenceId || "");
          } else {
            console.warn("Token invalide ou expiré");
            localStorage.removeItem("token");
            setUserRole(null);
          }
        }
      } catch (err) {
        console.error("Erreur lors de la vérification de session:", err);
      }
      setInitialLoading(false);
    };

    const safetyTimeout = setTimeout(() => setInitialLoading(false), 3000);

    fetchAgences();
    checkSession();

    return () => {
      clearTimeout(safetyTimeout);
    };
  }, []);

  const handleLogout = async () => {
    setUserRole(null);
    setUserAgenceId(null);
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace("/login");
  };

  const handleLoginSuccess = (role: UserRole, agenceId: string | null) => {
    setUserRole(role);
    setUserAgenceId(agenceId);
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
              <Route path="/filiales" element={<FilialesPage />} />
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
