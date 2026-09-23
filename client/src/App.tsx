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
import { VisitListPage } from './pages/visits/VisitListPage.js';
import { VisitFormPage } from './pages/visits/VisitFormPage.js';
import { VisitDetailPage } from './pages/visits/VisitDetailPage.js';
import { VisitCalendarPage } from './pages/visits/VisitCalendarPage.js';
import { RequestListPage } from './pages/requests/RequestListPage.js';
import { RequestFormPage } from './pages/requests/RequestFormPage.js';
import { RequestDetailPage } from './pages/requests/RequestDetailPage.js';
import { ReservationListPage } from './pages/reservations/ReservationListPage.js';
import { SaleListPage } from './pages/sales/SaleListPage.js';
import { SaleFormPage } from './pages/sales/SaleFormPage.js';
import { SaleDetailPage } from './pages/sales/SaleDetailPage.js';
import { ContractListPage } from './pages/contracts/ContractListPage.js';
import { ContractFormPage } from './pages/contracts/ContractFormPage.js';
import { ContractDetailPage } from './pages/contracts/ContractDetailPage.js';
import { PaymentListPage } from './pages/payments/PaymentListPage.js';

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

          {/* Visites et calendrier */}
          <Route path="visites">
            <Route index element={<VisitListPage />} />
            <Route path="calendrier" element={<VisitCalendarPage />} />
            <Route path="nouveau" element={<VisitFormPage />} />
            <Route path=":id" element={<VisitDetailPage />} />
            <Route path=":id/modifier" element={<VisitFormPage />} />
          </Route>

          {/* Demandes */}
          <Route path="demandes">
            <Route index element={<RequestListPage />} />
            <Route path="nouveau" element={<RequestFormPage />} />
            <Route path=":id" element={<RequestDetailPage />} />
          </Route>

          {/* Réservations */}
          <Route path="reservations" element={<ReservationListPage />} />

          {/* Ventes */}
          <Route path="ventes">
            <Route index element={<SaleListPage />} />
            <Route path="nouveau" element={<SaleFormPage />} />
            <Route path=":id" element={<SaleDetailPage />} />
          </Route>

          {/* Contrats de location */}
          <Route path="contrats">
            <Route index element={<ContractListPage />} />
            <Route path="nouveau" element={<ContractFormPage />} />
            <Route path=":id" element={<ContractDetailPage />} />
          </Route>

          {/* Paiements */}
          <Route path="paiements" element={<PaymentListPage />} />

          {/* Profil personnel */}
          <Route path="profil" element={<ProfilePage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
