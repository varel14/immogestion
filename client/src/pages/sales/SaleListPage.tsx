import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, HandCoins, Plus } from 'lucide-react';
import { salesApi, type ListSalesParams } from '../../api/transactions.js';
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
import { saleStatusBadgeClass, saleStatusLabels } from '../../utils/labels.js';
import { SALE_STATUSES } from '../../types/index.js';

const PAGE_SIZE = 10;

export function SaleListPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);

  const { data, loading, error, reload } = useAsync((signal) => {
    const params: ListSalesParams = { page, pageSize: PAGE_SIZE };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status) params.status = status;
    return salesApi.list(params);
  }, [debouncedSearch, status, page]);

  void searchParams;

  return (
    <div>
      <PageHeader
        title="Ventes"
        description="Transactions de vente immobilière et suivi des paiements."
        actions={
          <Link to="/ventes/nouveau">
            <Button icon={<Plus className="h-4 w-4" />}>Nouvelle vente</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Rechercher (référence, bien, acheteur...)" className="w-full max-w-md" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-44" aria-label="Filtrer par statut">
          <option value="">Tous les statuts</option>
          {SALE_STATUSES.map((s) => (
            <option key={s} value={s}>{saleStatusLabels[s]}</option>
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
            icon={<HandCoins className="h-6 w-6" />}
            title="Aucune vente enregistrée"
            description="Les ventes sont créées depuis une demande acceptée ou une réservation active."
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
                <TH>Acheteur</TH>
                <TH>Prix de vente</TH>
                <TH>Statut</TH>
                <TH>Créée le</TH>
                <TH className="w-10" />
              </TR>
            </THead>
            <TBody>
              {data.data.map((sale) => (
                <TR key={sale.id}>
                  <TD className="font-medium text-slate-800">{sale.reference}</TD>
                  <TD>
                    <Link to={`/biens/${sale.propertyId}`} className="block max-w-[200px] truncate hover:text-blue-700">
                      {sale.property?.title ?? '—'}
                    </Link>
                  </TD>
                  <TD>
                    <Link to={`/clients/${sale.buyerId}`} className="hover:text-blue-700">
                      {sale.buyer ? fullName(sale.buyer) : '—'}
                    </Link>
                  </TD>
                  <TD className="whitespace-nowrap font-semibold">{formatPrice(sale.salePrice)}</TD>
                  <TD>
                    <Badge className={saleStatusBadgeClass[sale.status]}>{saleStatusLabels[sale.status]}</Badge>
                  </TD>
                  <TD className="whitespace-nowrap text-slate-500">{formatDate(sale.createdAt)}</TD>
                  <TD>
                    <Link to={`/ventes/${sale.id}`} aria-label={`Voir la vente ${sale.reference}`} className="block p-1 text-slate-400 hover:text-blue-600">
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
