import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArchiveX, CheckCircle2, Lock, Search } from 'lucide-react';
import { reservationsApi, type ListReservationsParams } from '../../api/commercial.js';
import { getApiErrorMessage } from '../../api/client.js';
import { toast } from '../../utils/toast.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { SearchInput } from '../../components/ui/SearchInput.js';
import { Select } from '../../components/ui/Field.js';
import { Badge } from '../../components/ui/Badge.js';
import { TableWrap, THead, TH, TBody, TR, TD, TableSkeleton } from '../../components/ui/Table.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { ErrorState } from '../../components/ui/ErrorState.js';
import { Pagination } from '../../components/ui/Pagination.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { formatDate } from '../../utils/format.js';
import { reservationStatusBadgeClass, reservationStatusLabels } from '../../utils/labels.js';
import { RESERVATION_STATUSES } from '../../types/index.js';
import type { Reservation } from '../../types/index.js';

const PAGE_SIZE = 10;

export function ReservationListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<{ reservation: Reservation; action: 'confirm' | 'cancel' } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const debouncedSearch = useDebounce(search);

  const { data, loading, error, reload } = useAsync((signal) => {
    const params: ListReservationsParams = { page, pageSize: PAGE_SIZE };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status) params.status = status;
    return reservationsApi.list(params);
  }, [debouncedSearch, status, page]);

  const handleAction = async () => {
    if (!target) return;
    setBusy(true);
    setActionError(null);
    try {
      if (target.action === 'confirm') {
        await reservationsApi.confirm(target.reservation.id);
        toast.success('La réservation a été confirmée.');
      } else {
        await reservationsApi.cancel(target.reservation.id, null);
        toast.success('La réservation a été annulée : le bien redevient disponible.');
      }
      setTarget(null);
      reload();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
      setTarget(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Réservations"
        description="Biens réservés temporairement dans l'attente de la vente ou du bail."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Rechercher (bien, client...)" className="w-full max-w-md" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-44" aria-label="Filtrer par statut">
          <option value="">Tous les statuts</option>
          {RESERVATION_STATUSES.map((s) => (
            <option key={s} value={s}>{reservationStatusLabels[s]}</option>
          ))}
        </Select>
      </div>

      {actionError && (
        <div className="mb-4">
          <ErrorState message={actionError} onRetry={reload} />
        </div>
      )}

      {loading && !data ? (
        <TableSkeleton rows={6} cols={6} />
      ) : error ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon={<Lock className="h-6 w-6" />}
            title="Aucune réservation"
            description="Les réservations sont créées depuis une demande ou une offre acceptée."
            action={
              <Link to="/demandes">
                <Button variant="secondary" icon={<Search className="h-4 w-4" />}>Voir les demandes</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <TableWrap>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Bien</TH>
                <TH>Client</TH>
                <TH>Source</TH>
                <TH>Réservée le</TH>
                <TH>Expire le</TH>
                <TH>Statut</TH>
                <TH className="w-44 text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {data.data.map((reservation) => {
                const isActive = reservation.status === 'ACTIVE' || reservation.status === 'CONFIRMED';
                return (
                  <TR key={reservation.id}>
                    <TD>
                      <Link to={`/biens/${reservation.propertyId}`} className="block max-w-[220px] truncate font-medium text-slate-800 hover:text-blue-700">
                        {reservation.property?.title ?? '—'}
                      </Link>
                      <span className="text-xs text-slate-400">{reservation.property?.reference}</span>
                    </TD>
                    <TD>
                      <Link to={`/clients/${reservation.clientId}`} className="hover:text-blue-700">
                        {reservation.client ? `${reservation.client.firstName} ${reservation.client.lastName}` : '—'}
                      </Link>
                    </TD>
                    <TD>{reservation.sourceType === 'OFFER' ? 'Offre acceptée' : 'Demande acceptée'}</TD>
                    <TD className="whitespace-nowrap text-slate-500">{formatDate(reservation.reservedAt)}</TD>
                    <TD className="whitespace-nowrap text-slate-500">{formatDate(reservation.expiresAt)}</TD>
                    <TD>
                      <Badge className={reservationStatusBadgeClass[reservation.status]}>{reservationStatusLabels[reservation.status]}</Badge>
                    </TD>
                    <TD>
                      {isActive && (
                        <div className="flex items-center justify-end gap-1">
                          {reservation.status === 'ACTIVE' && (
                            <button
                              type="button"
                              onClick={() => setTarget({ reservation, action: 'confirm' })}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-600"
                              title="Confirmer la réservation"
                              aria-label="Confirmer la réservation"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setTarget({ reservation, action: 'cancel' })}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Annuler la réservation"
                            aria-label="Annuler la réservation"
                          >
                            <ArchiveX className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </TableWrap>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <Pagination meta={data.pagination} onPageChange={setPage} />
          </div>
        </>
      )}

      <ConfirmDialog
        open={target !== null}
        title={target?.action === 'confirm' ? 'Confirmer la réservation ?' : 'Annuler la réservation ?'}
        message={
          target?.action === 'confirm'
            ? 'La réservation sera marquée comme confirmée.'
            : 'Le bien redeviendra disponible si aucune autre opération ne le bloque.'
        }
        confirmLabel={target?.action === 'confirm' ? 'Confirmer' : 'Annuler la réservation'}
        danger={target?.action === 'cancel'}
        loading={busy}
        onConfirm={handleAction}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
