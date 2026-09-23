import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, FileSignature, Plus } from 'lucide-react';
import { contractsApi, type ListContractsParams } from '../../api/transactions.js';
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
import { leaseStatusBadgeClass, leaseStatusLabels } from '../../utils/labels.js';
import { LEASE_STATUSES } from '../../types/index.js';

const PAGE_SIZE = 10;

export function ContractListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);

  const { data, loading, error, reload } = useAsync((signal) => {
    const params: ListContractsParams = { page, pageSize: PAGE_SIZE };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status) params.status = status;
    return contractsApi.list(params);
  }, [debouncedSearch, status, page]);

  return (
    <div>
      <PageHeader
        title="Contrats de location"
        description="Baux entre propriétaires et locataires, échéances et états des lieux."
        actions={
          <Link to="/contrats/nouveau">
            <Button icon={<Plus className="h-4 w-4" />}>Nouveau contrat</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Rechercher (référence, bien, locataire...)" className="w-full max-w-md" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-48" aria-label="Filtrer par statut">
          <option value="">Tous les statuts</option>
          {LEASE_STATUSES.map((s) => (
            <option key={s} value={s}>{leaseStatusLabels[s]}</option>
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
            icon={<FileSignature className="h-6 w-6" />}
            title="Aucun contrat de location"
            description="Les baux sont créés depuis une demande de location acceptée ou une réservation active."
            action={
              <Link to="/demandes">
                <Button variant="secondary">Voir les demandes</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <TableWrap>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Référence</TH>
                <TH>Bien</TH>
                <TH>Locataire</TH>
                <TH>Loyer mensuel</TH>
                <TH>Période</TH>
                <TH>Statut</TH>
                <TH className="w-10" />
              </TR>
            </THead>
            <TBody>
              {data.data.map((contract) => (
                <TR key={contract.id}>
                  <TD className="font-medium text-slate-800">{contract.reference}</TD>
                  <TD>
                    <Link to={`/biens/${contract.propertyId}`} className="block max-w-[200px] truncate hover:text-blue-700">
                      {contract.property?.title ?? '—'}
                    </Link>
                  </TD>
                  <TD>
                    <Link to={`/clients/${contract.tenantId}`} className="hover:text-blue-700">
                      {contract.tenant ? fullName(contract.tenant) : '—'}
                    </Link>
                  </TD>
                  <TD className="whitespace-nowrap font-semibold">{formatPrice(contract.monthlyRent)}</TD>
                  <TD className="whitespace-nowrap text-slate-500">
                    {formatDate(contract.startDate)} → {formatDate(contract.endDate)}
                  </TD>
                  <TD>
                    <Badge className={leaseStatusBadgeClass[contract.status]}>{leaseStatusLabels[contract.status]}</Badge>
                  </TD>
                  <TD>
                    <Link to={`/contrats/${contract.id}`} aria-label={`Voir le contrat ${contract.reference}`} className="block p-1 text-slate-400 hover:text-blue-600">
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
