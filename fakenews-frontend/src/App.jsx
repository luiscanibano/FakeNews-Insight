import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import AdminUsers from "./pages/AdminUsers";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Landing from "./pages/Landing";
import { USER_ROLE } from "./lib/accessControl";

// Controla inicializacion de sesion y routing publico/privado segun rol.
function App() {
  // Leemos si hay un usuario logueado en nuestro estado global
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const authReady = useAuthStore((state) => state.authReady);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const subscribeToAuthChanges = useAuthStore((state) => state.subscribeToAuthChanges);

  const isAdmin = role === USER_ROLE.ADMIN;
  const defaultPrivatePath = isAdmin ? "/admin" : "/dashboard";

  // Hidrata la sesion inicial y queda suscrito a cambios de auth en tiempo real.
  useEffect(() => {
    initializeAuth();
    const unsubscribe = subscribeToAuthChanges();

    return () => {
      unsubscribe();
    };
  }, [initializeAuth, subscribeToAuthChanges]);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Cargando sesion...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={!user ? <Landing /> : <Navigate to={defaultPrivatePath} replace />}
        />

        {/* Rutas Publicas */}
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to={defaultPrivatePath} replace />}
        />
        <Route
          path="/register"
          element={!user ? <Register /> : <Navigate to={defaultPrivatePath} replace />}
        />
        <Route
          path="/forgot-password"
          element={!user ? <ForgotPassword /> : <Navigate to={defaultPrivatePath} replace />}
        />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Rutas Privadas (Protegidas) */}
        <Route
          path="/dashboard"
          element={
            user ? (
              isAdmin ? <Navigate to="/admin" replace /> : <Dashboard />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin"
          element={
            user ? (
              isAdmin ? <AdminPanel /> : <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/users"
          element={
            user ? (
              isAdmin ? <AdminUsers /> : <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Redireccion por defecto */}
        <Route
          path="*"
          element={<Navigate to={user ? defaultPrivatePath : "/"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;