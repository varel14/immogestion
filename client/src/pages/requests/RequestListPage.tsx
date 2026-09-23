import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ClipboardList, Plus } from 'lucide-react';
import { requestsApi, type ListRequestsParams } from '../../api/commercial.js';
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
import { formatDate, formatPrice, fullName } from '../../utils/format.js';
import { requestStatusBadgeClass, requestStatusLabels, requestTypeLabels } from '../../utils/labels.js';
import { REQUEST_STATUSES, REQUEST_TYPES } from '../../types/index.js';

const PAGE_SIZE = 10;

export function RequestListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);

  const { data, loading, error, reload } = useAsync((signal) => {
    const params: ListRequestsParams = { page, pageSize: PAGE_SIZE };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status) params.status = status as never;
    if (type) params.type = type as never;
    return requestsApi.list(params);
  }, [debouncedSearch, status, type, page]);

  return (
    <div>
      <PageHeader
        title="Demandes des clients"
        description="Demandes d'achat et de location déposées sur les biens."
        actions={
          <Link to="/demandes/nouveau">
            <Button icon={<Plus className="h-4 w-4" />}>Nouvelle demande</Button>
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Rechercher (bien, client...)" />
        <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Filtrer par type">
          <option value="">Tous les types</option>
          {REQUEST_TYPES.map((t) => (
            <option key={t} value={t}>{requestTypeLabels[t]}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filtrer par statut">
          <option value="">Tous les statuts</option>
          {REQUEST_STATUSES.map((s) => (
            <option key={s} value={s}>{requestStatusLabels[s]}</option>
          ))}
        </Select>
      </div>

      {loading && !data ? (
        <TableSkeleton rows={6} cols={6} />
      ) : error ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title="Aucune demande trouvée"
            description="Les demandes d'achat et de location des clients apparaîtront ici."
            action={
              <Link to="/demandes/nouveau">
                <Button icon={<Plus className="h-4 w-4" />}>Créer une demande</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <TableWrap>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Client</TH>
                <TH>Bien</TH>
                <TH>Type</TH>
                <TH>Montant proposé</TH>
                <TH>Statut</TH>
                <TH>Déposée le</TH>
                <TH className="w-10" />
              </TR>
            </THead>
            <TBody>
              {data.data.map((request) => (
                <TR key={request.id}>
                  <TD>
                    <Link to={`/clients/${request.clientId}`} className="font-medium text-slate-800 hover:text-blue-700">
                      {request.client ? fullName(request.client) : '—'}
                    </Link>
                  </TD>
                  <TD>
                    <Link to={`/biens/${request.propertyId}`} className="block max-w-[220px] truncate hover:text-blue-700">
                      {request.property?.title ?? '—'}
                    </Link>
                    <span className="text-xs text-slate-400">{request.property?.reference}</span>
                  </TD>
                  <TD>{requestTypeLabels[request.type]}</TD>
                  <TD>{request.proposedAmount !== null ? formatPrice(request.proposedAmount) : <span className="text-slate-400">—</span>}</TD>
                  <TD>
                    <Badge className={requestStatusBadgeClass[request.status]}>{requestStatusLabels[request.status]}</Badge>
                  </TD>
                  <TD className="whitespace-nowrap text-slate-500">{formatDate(request.createdAt)}</TD>
                  <TD>
                    <Link to={`/demandes/${request.id}`} aria-label="Voir la demande" className="block p-1 text-slate-400 hover:text-blue-600">
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </TableWrap>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <Pagination meta={data.pagination} onPageChange={setPage} />
          </div>
        </>
      )}
    </div>
  );
}
