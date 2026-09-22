import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.js';
import { Spinner } from '../components/ui/Spinner.js';

/** Protège les routes privées : redirige vers la page de connexion
 *  si aucun utilisateur n'est authentifié. */
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" label="Chargement de votre session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

/** Restreint une route aux administrateurs. */
export function AdminRoute() {
  const { user } = useAuth();

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
