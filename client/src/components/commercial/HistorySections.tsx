import { Link } from 'react-router-dom';
import {
  interestStatusBadgeClass, interestStatusLabels, interestTransactionLabels,
  invoiceStatusBadgeClass, invoiceStatusLabels, leaseStatusBadgeClass, leaseStatusLabels,
  offerStatusBadgeClass, offerStatusLabels,
  paymentStatusBadgeClass, paymentStatusLabels, paymentTypeLabels,
  requestStatusBadgeClass, requestStatusLabels, requestTypeLabels,
  reservationStatusBadgeClass, reservationStatusLabels,
  saleStatusBadgeClass, saleStatusLabels,
  visitStatusBadgeClass, visitStatusLabels,
} from '../../utils/labels.js';
import { interestsApi, offersApi, requestsApi, reservationsApi, visitsApi } from '../../api/commercial.js';
import { contractsApi, invoicesApi, paymentsApi, salesApi } from '../../api/transactions.js';
import { useAsync } from '../../hooks/useAsync.js';
import { formatDate, formatDateTime, formatPrice, fullName } from '../../utils/format.js';
import { Badge } from '../ui/Badge.js';
import { Card } from '../ui/Card.js';
import type { ReactNode } from 'react';

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h2 className="font-semibold text-slate-800">{title}</h2>
        {action}
      </div>
      <div className="px-5 py-3">{children}</div>
    </Card>
  );
}

function MiniList({ items, emptyLabel, render }: { items: { key: string; node: ReactNode }[]; emptyLabel: string; render?: never }) {
  if (items.length === 0) {
    return <p className="py-3 text-center text-sm text-slate-400">{emptyLabel}</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.key} className="py-2.5">{item.node}</li>
      ))}
    </ul>
  );
}

const linkClasses = 'font-medium text-blue-700 hover:underline';

/** Sections d'historique affichées sur la fiche d'un client. */
export function ClientHistorySections({ clientId }: { clientId: string }) {
  const interests = useAsync(() => interestsApi.list({ clientId, pageSize: 10 }), [clientId]);
  const visits = useAsync(() => visitsApi.list({ clientId, pageSize: 10 }), [clientId]);
  const requests = useAsync(() => requestsApi.list({ clientId, pageSize: 10 }), [clientId]);
  const offers = useAsync(() => offersApi.list({ clientId, pageSize: 10 }), [clientId]);
  const reservations = useAsync(() => reservationsApi.list({ clientId, pageSize: 10 }), [clientId]);
  const sales = useAsync(() => salesApi.list({ buyerId: clientId, pageSize: 10 }), [clientId]);
  const leases = useAsync(() => contractsApi.list({ tenantId: clientId, pageSize: 10 }), [clientId]);
  const payments = useAsync(() => paymentsApi.list({ clientId, pageSize: 10 }), [clientId]);

  return (
    <div className="mt-6 space-y-6">
      <Section title="Biens qui l'intéressent">
        <MiniList
          emptyLabel="Aucun intérêt enregistré pour ce client."
          items={(interests.data?.data ?? []).map((interest) => ({
            key: interest.id,
            node: (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link to={`/biens/${interest.propertyId}`} className={linkClasses}>
                  {interest.property?.title ?? 'Bien'}
                </Link>
                <Badge className="bg-slate-100 text-slate-600 ring-slate-500/20">{interestTransactionLabels[interest.transactionType]}</Badge>
                <Badge className={interestStatusBadgeClass[interest.status]}>{interestStatusLabels[interest.status]}</Badge>
              </div>
            ),
          }))}
        />
      </Section>

      <Section title="Visites">
        <MiniList
          emptyLabel="Aucune visite pour ce client."
          items={(visits.data?.data ?? []).map((visit) => ({
            key: visit.id,
            node: (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link to={`/visites/${visit.id}`} className={linkClasses}>{formatDateTime(visit.scheduledAt)}</Link>
                <span className="text-slate-600">{visit.property?.title}</span>
                <Badge className={visitStatusBadgeClass[visit.status]}>{visitStatusLabels[visit.status]}</Badge>
              </div>
            ),
          }))}
        />
      </Section>

      <Section title="Demandes">
        <MiniList
          emptyLabel="Aucune demande déposée."
          items={(requests.data?.data ?? []).map((request) => ({
            key: request.id,
            node: (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link to={`/demandes/${request.id}`} className={linkClasses}>{requestTypeLabels[request.type]}</Link>
                <span className="text-slate-600">{request.property?.title}</span>
                {request.proposedAmount !== null && <span className="font-medium text-slate-700">{formatPrice(request.proposedAmount)}</span>}
                <Badge className={requestStatusBadgeClass[request.status]}>{requestStatusLabels[request.status]}</Badge>
              </div>
            ),
          }))}
        />
      </Section>

      <Section title="Offres d'achat">
        <MiniList
          emptyLabel="Aucune offre formulée."
          items={(offers.data?.data ?? []).map((offer) => ({
            key: offer.id,
            node: (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-slate-800">{formatPrice(offer.amount)}</span>
                <span className="text-slate-500">{formatDate(offer.createdAt)}</span>
                <Badge className={offerStatusBadgeClass[offer.status]}>{offerStatusLabels[offer.status]}</Badge>
              </div>
            ),
          }))}
        />
      </Section>

      <Section title="Réservations">
        <MiniList
          emptyLabel="Aucune réservation."
          items={(reservations.data?.data ?? []).map((reservation) => ({
            key: reservation.id,
            node: (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link to={`/biens/${reservation.propertyId}`} className={linkClasses}>{reservation.property?.title}</Link>
                <span className="text-slate-500">jusqu'au {formatDate(reservation.expiresAt)}</span>
                <Badge className={reservationStatusBadgeClass[reservation.status]}>{reservationStatusLabels[reservation.status]}</Badge>
              </div>
            ),
          }))}
        />
      </Section>

      <Section title="Achats">
        <MiniList
          emptyLabel="Aucun achat."
          items={(sales.data?.data ?? []).map((sale) => ({
            key: sale.id,
            node: (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link to={`/ventes/${sale.id}`} className={linkClasses}>{sale.reference}</Link>
                <span className="font-semibold text-slate-700">{formatPrice(sale.salePrice)}</span>
                <Badge className={saleStatusBadgeClass[sale.status]}>{saleStatusLabels[sale.status]}</Badge>
              </div>
            ),
          }))}
        />
      </Section>

      <Section title="Contrats de location">
        <MiniList
          emptyLabel="Aucun contrat de location."
          items={(leases.data?.data ?? []).map((contract) => ({
            key: contract.id,
            node: (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link to={`/contrats/${contract.id}`} className={linkClasses}>{contract.reference}</Link>
                <span className="font-semibold text-slate-700">{formatPrice(contract.monthlyRent)} / mois</span>
                <Badge className={leaseStatusBadgeClass[contract.status]}>{leaseStatusLabels[contract.status]}</Badge>
              </div>
            ),
          }))}
        />
      </Section>

      <Section title="Paiements">
        <MiniList
          emptyLabel="Aucun paiement."
          items={(payments.data?.data ?? []).map((payment) => ({
            key: payment.id,
            node: (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-slate-800">{formatPrice(payment.amount)}</span>
                <span className="text-slate-500">{paymentTypeLabels[payment.paymentType]}</span>
                <span className="text-slate-400">{formatDate(payment.paymentDate)}</span>
                <Badge className={paymentStatusBadgeClass[payment.status]}>{paymentStatusLabels[payment.status]}</Badge>
              </div>
            ),
          }))}
        />
      </Section>
    </div>
  );
}

/** Sections d'historique affichées sur la fiche d'un bien. */
export function PropertyHistorySections({ propertyId }: { propertyId: string }) {
  const interests = useAsync(() => interestsApi.list({ propertyId, pageSize: 10 }), [propertyId]);
  const visits = useAsync(() => visitsApi.list({ propertyId, pageSize: 10 }), [propertyId]);
  const requests = useAsync(() => requestsApi.list({ propertyId, pageSize: 10 }), [propertyId]);
  const reservations = useAsync(() => reservationsApi.list({ propertyId, pageSize: 10 }), [propertyId]);
  const sales = useAsync(() => salesApi.list({ propertyId, pageSize: 10 }), [propertyId]);
  const leases = useAsync(() => contractsApi.list({ propertyId, pageSize: 10 }), [propertyId]);

  return (
    <div className="mt-6 space-y-6">
      <Section title="Clients intéressés">
        <MiniList
          emptyLabel="Aucun client intéressé par ce bien pour le moment."
          items={(interests.data?.data ?? []).map((interest) => ({
            key: interest.id,
            node: (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {interest.client ? (
                  <Link to={`/clients/${interest.client.id}`} className={linkClasses}>{fullName(interest.client)}</Link>
                ) : (
                  <span>Client</span>
                )}
                <Badge className="bg-slate-100 text-slate-600 ring-slate-500/20">{interestTransactionLabels[interest.transactionType]}</Badge>
                <Badge className={interestStatusBadgeClass[interest.status]}>{interestStatusLabels[interest.status]}</Badge>
              </div>
            ),
          }))}
        />
      </Section>

      <Section title="Visites">
        <MiniList
          emptyLabel="Aucune visite programmée pour ce bien."
          items={(visits.data?.data ?? []).map((visit) => ({
            key: visit.id,
            node: (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link to={`/visites/${visit.id}`} className={linkClasses}>{formatDateTime(visit.scheduledAt)}</Link>
                <span className="text-slate-600">{visit.client ? fullName(visit.client) : ''}</span>
                <Badge className={visitStatusBadgeClass[visit.status]}>{visitStatusLabels[visit.status]}</Badge>
              </div>
            ),
          }))}
        />
      </Section>

      <Section title="Demandes et offres">
        <MiniList
          emptyLabel="Aucune demande déposée sur ce bien."
          items={(requests.data?.data ?? []).map((request) => ({
            key: request.id,
            node: (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link to={`/demandes/${request.id}`} className={linkClasses}>
                  {requestTypeLabels[request.type]} — {request.client ? fullName(request.client) : ''}
                </Link>
                {request.proposedAmount !== null && <span className="font-medium text-slate-700">{formatPrice(request.proposedAmount)}</span>}
                <Badge className={requestStatusBadgeClass[request.status]}>{requestStatusLabels[request.status]}</Badge>
                {(request.offersCount ?? 0) > 0 && <span className="text-xs text-slate-400">{request.offersCount} offre(s)</span>}
              </div>
            ),
          }))}
        />
      </Section>

      <Section title="Réservations">
        <MiniList
          emptyLabel="Aucune réservation pour ce bien."
          items={(reservations.data?.data ?? []).map((reservation) => ({
            key: reservation.id,
            node: (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-slate-600">{reservation.client ? fullName(reservation.client) : ''}</span>
                <span className="text-slate-500">expire le {formatDate(reservation.expiresAt)}</span>
                <Badge className={reservationStatusBadgeClass[reservation.status]}>{reservationStatusLabels[reservation.status]}</Badge>
              </div>
            ),
          }))}
        />
      </Section>

      <Section title="Vente">
        <MiniList
          emptyLabel="Aucune vente enregistrée pour ce bien."
          items={(sales.data?.data ?? []).map((sale) => ({
            key: sale.id,
            node: (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link to={`/ventes/${sale.id}`} className={linkClasses}>{sale.reference}</Link>
                <span className="font-semibold text-slate-700">{formatPrice(sale.salePrice)}</span>
                <Badge className={saleStatusBadgeClass[sale.status]}>{saleStatusLabels[sale.status]}</Badge>
              </div>
            ),
          }))}
        />
      </Section>

      <Section title="Contrats de location (historique d'occupation)">
        <MiniList
          emptyLabel="Aucun contrat de location pour ce bien."
          items={(leases.data?.data ?? []).map((contract) => ({
            key: contract.id,
            node: (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link to={`/contrats/${contract.id}`} className={linkClasses}>{contract.reference}</Link>
                <span className="text-slate-600">{contract.tenant ? fullName(contract.tenant) : ''}</span>
                <span className="text-slate-500">{formatDate(contract.startDate)} → {formatDate(contract.endDate)}</span>
                <Badge className={leaseStatusBadgeClass[contract.status]}>{leaseStatusLabels[contract.status]}</Badge>
              </div>
            ),
          }))}
        />
      </Section>
    </div>
  );
}

/** Sections de gestion affichées sur la fiche d'un propriétaire. */
export function OwnerHistorySections({ ownerId }: { ownerId: string }) {
  const contracts = useAsync(() => contractsApi.list({ ownerId, pageSize: 10 }), [ownerId]);
  const invoices = useAsync(() => invoicesApi.list({ ownerId, pageSize: 100 }), [ownerId]);

  const paidTotal = (invoices.data?.data ?? []).reduce((sum, invoice) => sum + invoice.paidAmount, 0);
  const expectedTotal = (invoices.data?.data ?? []).reduce((sum, invoice) => sum + invoice.expectedAmount, 0);

  return (
    <div className="mt-6 space-y-6">
      <Section title="Revenus locatifs associés">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg bg-slate-50 px-3 py-3">
            <p className="text-lg font-bold text-slate-800">{formatPrice(expectedTotal)}</p>
            <p className="text-xs text-slate-500">Loyers facturés (échéances)</p>
          </div>
          <div className="rounded-lg bg-emerald-50 px-3 py-3">
            <p className="text-lg font-bold text-emerald-700">{formatPrice(paidTotal)}</p>
            <p className="text-xs text-slate-500">Loyers encaissés</p>
          </div>
        </div>
      </Section>

      <Section title="Contrats de location de ses biens">
        <MiniList
          emptyLabel="Aucun contrat de location sur les biens de ce propriétaire."
          items={(contracts.data?.data ?? []).map((contract) => ({
            key: contract.id,
            node: (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link to={`/contrats/${contract.id}`} className={linkClasses}>{contract.reference}</Link>
                <span className="text-slate-600">{contract.property?.title}</span>
                <span className="font-medium text-slate-700">{formatPrice(contract.monthlyRent)} / mois</span>
                <Badge className={leaseStatusBadgeClass[contract.status]}>{leaseStatusLabels[contract.status]}</Badge>
              </div>
            ),
          }))}
        />
      </Section>

      <Section title="Ventes de ses biens">
        <OwnerSales ownerId={ownerId} />
      </Section>
    </div>
  );
}

function OwnerSales({ ownerId }: { ownerId: string }) {
  // La liste générale est filtrée par propriétaire via la relation du bien.
  const sales = useAsync(async () => {
    const result = await salesApi.list({ pageSize: 100 });
    return result.data.filter((sale) => sale.ownerId === ownerId);
  }, [ownerId]);

  if (sales.loading) return <p className="py-3 text-center text-sm text-slate-400">Chargement...</p>;

  return (
    <MiniList
      emptyLabel="Aucune vente sur les biens de ce propriétaire."
      items={(sales.data ?? []).map((sale) => ({
        key: sale.id,
        node: (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link to={`/ventes/${sale.id}`} className={linkClasses}>{sale.reference}</Link>
            <span className="font-semibold text-slate-700">{formatPrice(sale.salePrice)}</span>
            <Badge className={saleStatusBadgeClass[sale.status]}>{saleStatusLabels[sale.status]}</Badge>
          </div>
        ),
      }))}
    />
  );
}
