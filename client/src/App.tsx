import { Route, Routes } from 'react-router-dom';
import { AdminRoute, ProtectedRoute } from './auth/ProtectedRoute.js';
import { Layout } from './components/layout/Layout.js';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { PropertyListPage } from './pages/properties/PropertyListPage.js';
import { PropertyDetailPage } from './pages/properties/PropertyDetailPage.js';
import { PropertyFormPage } from './pages/properties/PropertyFormPage.js';
import { OwnerListPage } from './pages/owners/OwnerListPage.js';
import { OwnerDetailPage } from './pages/owners/OwnerDetailPage.js';
import { OwnerFormPage } from './pages/owners/OwnerFormPage.js';
import { ClientListPage } from './pages/clients/ClientListPage.js';
import { ClientDetailPage } from './pages/clients/ClientDetailPage.js';
import { ClientFormPage } from './pages/clients/ClientFormPage.js';
import { UserListPage } from './pages/users/UserListPage.js';
import { UserDetailPage } from './pages/users/UserDetailPage.js';
import { UserFormPage } from './pages/users/UserFormPage.js';
import { ProfilePage } from './pages/profile/ProfilePage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

export default function App() {
  return (
    <Routes>
      {/* Route publique */}
      <Route path="/connexion" element={<LoginPage />} />

      {/* Routes privées */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />

          {/* Biens */}
          <Route path="biens">
            <Route index element={<PropertyListPage />} />
            <Route path="nouveau" element={<PropertyFormPage />} />
            <Route path=":id" element={<PropertyDetailPage />} />
            <Route path=":id/modifier" element={<PropertyFormPage />} />
          </Route>

          {/* Propriétaires */}
          <Route path="proprietaires">
            <Route index element={<OwnerListPage />} />
            <Route path="nouveau" element={<OwnerFormPage />} />
            <Route path=":id" element={<OwnerDetailPage />} />
            <Route path=":id/modifier" element={<OwnerFormPage />} />
          </Route>

          {/* Clients */}
          <Route path="clients">
            <Route index element={<ClientListPage />} />
            <Route path="nouveau" element={<ClientFormPage />} />
            <Route path=":id" element={<ClientDetailPage />} />
            <Route path=":id/modifier" element={<ClientFormPage />} />
          </Route>

          {/* Utilisateurs (administrateur uniquement) */}
          <Route element={<AdminRoute />}>
            <Route path="utilisateurs">
              <Route index element={<UserListPage />} />
              <Route path="nouveau" element={<UserFormPage />} />
              <Route path=":id" element={<UserDetailPage />} />
              <Route path=":id/modifier" element={<UserFormPage />} />
            </Route>
          </Route>

          {/* Profil personnel */}
          <Route path="profil" element={<ProfilePage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
