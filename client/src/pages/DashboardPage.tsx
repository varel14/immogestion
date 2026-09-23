import { Link } from 'react-router-dom';
import {
  Building2, CalendarClock, CalendarDays, CheckCircle2, ClipboardList, FileSignature,
  HandCoins, Home, KeyRound, MapPin, Tag, TrendingUp, Users, Wallet,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge.js';
import { visitStatusBadgeClass, visitStatusLabels } from '../utils/labels.js';
import { formatDateTime } from '../utils/format.js';
import { statsApi } from '../api/stats.js';
import { useAsync } from '../hooks/useAsync.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { StatCard } from '../components/ui/StatCard.js';
import { Card } from '../components/ui/Card.js';
import { Spinner } from '../components/ui/Spinner.js';
import { ErrorState } from '../components/ui/ErrorState.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Button } from '../components/ui/Button.js';
import { formatPrice } from '../utils/format.js';
import {
  propertyStatusBadgeClass,
  propertyStatusLabels,
  propertyTypeLabels,
  transactionTypeLabels,
} from '../utils/labels.js';

/** Tableau d'accueil — uniquement des données disponibles en Phase 1. */
export function DashboardPage() {
  const { data: stats, loading, error, reload } = useAsync(() => statsApi.dashboard(), []);

  if (loading && !stats) {
    return (
      <div className="py-20">
        <Spinner size="lg" label="Chargement du tableau de bord..." className="flex-col" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  if (!stats) return null;

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de votre portefeuille immobilier."
        actions={
          <Link to="/biens/nouveau">
            <Button icon={<Building2 className="h-4 w-4" />}>Ajouter un bien</Button>
          </Link>
        }
      />

      {/* Indicateurs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Biens au total"
          value={stats.totalProperties}
          icon={<Home className="h-5 w-5" />}
          to="/biens"
        />
        <StatCard
          label="Biens disponibles"
          value={stats.availableProperties}
          icon={<Tag className="h-5 w-5" />}
          iconClassName="bg-emerald-50 text-emerald-600"
          to="/biens?status=AVAILABLE"
        />
        <StatCard
          label="Biens réservés"
          value={stats.reservedProperties}
          icon={<CalendarClock className="h-5 w-5" />}
          iconClassName="bg-amber-50 text-amber-600"
          to="/biens?status=RESERVED"
        />
        <StatCard
          label="Propriétaires"
          value={stats.ownersCount}
          icon={<KeyRound className="h-5 w-5" />}
          iconClassName="bg-violet-50 text-violet-600"
          to="/proprietaires"
        />
        <StatCard
          label="Biens destinés à la vente"
          value={stats.forSaleCount}
          icon={<Building2 className="h-5 w-5" />}
          iconClassName="bg-blue-50 text-blue-600"
          to="/biens?transactionType=SALE"
        />
        <StatCard
          label="Biens destinés à la location"
          value={stats.forRentCount}
          icon={<KeyRound className="h-5 w-5" />}
          iconClassName="bg-cyan-50 text-cyan-600"
          to="/biens?transactionType=RENT"
        />
        <StatCard
          label="Clients actifs"
          value={stats.activeClientsCount}
          icon={<Users className="h-5 w-5" />}
          iconClassName="bg-orange-50 text-orange-600"
          to="/clients"
        />
        <StatCard
          label="Biens vendus"
          value={stats.soldProperties}
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Biens loués"
          value={stats.rentedProperties}
          icon={<KeyRound className="h-5 w-5" />}
          iconClassName="bg-cyan-50 text-cyan-600"
        />

        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:col-span-2 lg:col-span-4">
          Suivi commercial
        </p>
        <StatCard
          label="Visites programmées"
          value={stats.visitsScheduled}
          icon={<CalendarDays className="h-5 w-5" />}
          iconClassName="bg-blue-50 text-blue-600"
          to="/visites"
        />
        <StatCard
          label="Visites du jour"
          value={stats.visitsToday}
          icon={<CalendarClock className="h-5 w-5" />}
          iconClassName="bg-indigo-50 text-indigo-600"
          to="/visites"
        />
        <StatCard
          label="Demandes en attente"
          value={stats.pendingRequests}
          icon={<ClipboardList className="h-5 w-5" />}
          iconClassName="bg-amber-50 text-amber-600"
          to="/demandes"
        />

        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:col-span-2 lg:col-span-4">
          Transactions
        </p>
        <StatCard
          label="Ventes en cours"
          value={stats.salesInProgress}
          icon={<TrendingUp className="h-5 w-5" />}
          iconClassName="bg-blue-50 text-blue-600"
          to="/ventes"
        />
        <StatCard
          label="Ventes finalisées"
          value={stats.salesFinalized}
          icon={<HandCoins className="h-5 w-5" />}
          iconClassName="bg-emerald-50 text-emerald-600"
          to="/ventes"
        />
        <StatCard
          label="Contrats actifs"
          value={stats.activeContracts}
          icon={<FileSignature className="h-5 w-5" />}
          iconClassName="bg-violet-50 text-violet-600"
          to="/contrats"
        />
        <StatCard
          label="Loyers attendus (mois)"
          value={formatPrice(stats.rentsExpectedThisMonth)}
          icon={<Wallet className="h-5 w-5" />}
          iconClassName="bg-slate-100 text-slate-600"
        />
        <StatCard
          label="Loyers encaissés (mois)"
          value={formatPrice(stats.rentsCollectedThisMonth)}
          icon={<Wallet className="h-5 w-5" />}
          iconClassName="bg-emerald-50 text-emerald-600"
          to="/paiements"
        />
        <StatCard
          label={`Loyers en retard (${stats.overdueInvoicesCount})`}
          value={formatPrice(stats.overdueAmount)}
          icon={<CalendarClock className="h-5 w-5" />}
          iconClassName="bg-red-50 text-red-600"
        />
      </div>

      {/* Derniers biens ajoutés */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Derniers biens ajoutés</h2>
          <Link to="/biens" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Voir tous les biens
          </Link>
        </div>

        {stats.recentProperties.length === 0 ? (
          <Card>
            <EmptyState
              title="Aucun bien enregistré pour le moment"
              description="Commencez par créer votre premier bien immobilier."
              action={
                <Link to="/biens/nouveau">
                  <Button>Ajouter un bien</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.recentProperties.map((property) => (
              <Link key={property.id} to={`/biens/${property.id}`} className="group">
                <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
                  <div className="flex h-36 items-center justify-center bg-slate-100">
                    {property.primaryPhotoUrl ? (
                      <img src={property.primaryPhotoUrl} alt={property.title} className="h-full w-full object-cover" />
                    ) : (
                      <Home className="h-10 w-10 text-slate-300" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-400">{property.reference}</span>
                      <Badge className={propertyStatusBadgeClass[property.status]}>
                        {propertyStatusLabels[property.status]}
                      </Badge>
                    </div>
                    <h3 className="mt-1.5 truncate font-semibold text-slate-800 group-hover:text-blue-700">
                      {property.title}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {property.city ?? 'Ville non renseignée'}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-bold text-blue-700">
                        {property.price !== null && formatPrice(property.price)}
                        {property.rentPrice !== null && `${formatPrice(property.rentPrice)} / mois`}
                        {property.price === null && property.rentPrice === null && 'Prix non défini'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {propertyTypeLabels[property.propertyType]} · {transactionTypeLabels[property.transactionType]}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Prochaines visites */}
      {stats.upcomingVisits.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Prochaines visites</h2>
            <Link to="/visites" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Voir toutes les visites
            </Link>
          </div>
          <Card>
            <ul className="divide-y divide-slate-100">
              {stats.upcomingVisits.map((visit) => (
                <li key={visit.id}>
                  <Link to={`/visites/${visit.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50">
                    <span className="text-sm font-semibold text-slate-800">{formatDateTime(visit.scheduledAt)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-600">{visit.property.title}</span>
                    <span className="text-sm text-slate-500">{visit.client.firstName} {visit.client.lastName}</span>
                    <span className="hidden text-xs text-slate-400 sm:block">Agent : {visit.agent.firstName} {visit.agent.lastName}</span>
                    <Badge className={visitStatusBadgeClass[visit.status]}>{visitStatusLabels[visit.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
