import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, ChevronRight, Home, Plus } from 'lucide-react';
import { propertiesApi, type ListPropertiesParams } from '../../api/properties.js';
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
import { formatPrice } from '../../utils/format.js';
import {
  propertyStatusBadgeClass,
  propertyStatusLabels,
  propertyTypeLabels,
  transactionTypeLabels,
} from '../../utils/labels.js';
import { PROPERTY_TYPES, PROPERTY_STATUSES, TRANSACTION_TYPES } from '../../types/index.js';
import type { Property } from '../../types/index.js';

const PAGE_SIZE = 10;

export function PropertyListPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [propertyType, setPropertyType] = useState(searchParams.get('propertyType') ?? '');
  const [transactionType, setTransactionType] = useState(searchParams.get('transactionType') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [city, setCity] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search);
  const debouncedCity = useDebounce(city);

  const { data, loading, error, reload } = useAsync(
    (signal) => {
      const params: ListPropertiesParams = { page, pageSize: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      if (propertyType) params.propertyType = propertyType;
      if (transactionType) params.transactionType = transactionType;
      if (status) params.status = status;
      if (debouncedCity) params.city = debouncedCity;
      if (showArchived) params.isArchived = 'true';
      return propertiesApi.list(params);
    },
    [debouncedSearch, propertyType, transactionType, status, debouncedCity, showArchived, page],
  );

  const hasFilters = Boolean(search || propertyType || transactionType || status || city || showArchived);

  return (
    <div>
      <PageHeader
        title="Biens immobiliers"
        description="Consultez, recherchez et gérez le catalogue de biens de l'agence."
        actions={
          <Link to="/biens/nouveau">
            <Button icon={<Plus className="h-4 w-4" />}>Nouveau bien</Button>
          </Link>
        }
      />

      {/* Filtres */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Rechercher (titre, référence, ville...)" className="lg:col-span-2" />
        <Select value={propertyType} onChange={(e) => { setPropertyType(e.target.value); setPage(1); }} aria-label="Filtrer par type de bien">
          <option value="">Tous les types</option>
          {PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>{propertyTypeLabels[type]}</option>
          ))}
        </Select>
        <Select value={transactionType} onChange={(e) => { setTransactionType(e.target.value); setPage(1); }} aria-label="Filtrer par type de transaction">
          <option value="">Toutes les transactions</option>
          {TRANSACTION_TYPES.map((type) => (
            <option key={type} value={type}>{transactionTypeLabels[type]}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filtrer par statut">
          <option value="">Tous les statuts</option>
          {PROPERTY_STATUSES.map((s) => (
            <option key={s} value={s}>{propertyStatusLabels[s]}</option>
          ))}
        </Select>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => { setShowArchived(e.target.checked); setPage(1); }}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
          />
          Afficher les biens archivés
        </label>
      </div>

      {/* Résultats */}
      {loading && !data ? (
        <TableSkeleton rows={6} cols={6} />
      ) : error ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon={<Home className="h-6 w-6" />}
            title={hasFilters ? 'Aucun bien ne correspond à votre recherche' : 'Aucun bien enregistré'}
            description={
              hasFilters
                ? 'Essayez de modifier vos critères de recherche ou vos filtres.'
                : 'Commencez par ajouter le premier bien du catalogue.'
            }
            action={
              !hasFilters && (
                <Link to="/biens/nouveau">
                  <Button icon={<Plus className="h-4 w-4" />}>Ajouter un bien</Button>
                </Link>
              )
            }
          />
        </div>
      ) : (
        <>
          <TableWrap>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Bien</TH>
                <TH>Type</TH>
                <TH>Transaction</TH>
                <TH>Prix</TH>
                <TH>Ville</TH>
                <TH>Statut</TH>
                <TH className="w-10" />
              </TR>
            </THead>
            <TBody>
              {data.data.map((property) => (
                <PropertyRow key={property.id} property={property} />
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

function PropertyRow({ property }: { property: Property }) {
  const photo = property.primaryPhotoUrl ?? property.media?.find((m) => m.kind === 'PHOTO' && m.isPrimary)?.url ?? null;

  return (
    <TR>
      <TD>
        <Link to={`/biens/${property.id}`} className="flex items-center gap-3">
          <span className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
            {photo ? (
              <img src={photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-5 w-5 text-slate-300" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block max-w-[260px] truncate font-medium text-slate-800">{property.title}</span>
            <span className="text-xs text-slate-400">{property.reference}</span>
            {property.isArchived && (
              <Badge className="ml-2 bg-slate-200 text-slate-600 ring-slate-500/20">Archivé</Badge>
            )}
          </span>
        </Link>
      </TD>
      <TD>{propertyTypeLabels[property.propertyType]}</TD>
      <TD>{transactionTypeLabels[property.transactionType]}</TD>
      <TD>
        {property.price !== null && <span className="block">{formatPrice(property.price)}</span>}
        {property.rentPrice !== null && <span className="block text-slate-500">{formatPrice(property.rentPrice)} / mois</span>}
        {property.price === null && property.rentPrice === null && <span className="text-slate-400">—</span>}
      </TD>
      <TD>{property.city ?? <span className="text-slate-400">—</span>}</TD>
      <TD>
        <Badge className={propertyStatusBadgeClass[property.status]}>{propertyStatusLabels[property.status]}</Badge>
      </TD>
      <TD>
        <Link to={`/biens/${property.id}`} aria-label={`Voir le bien ${property.title}`} className="block p-1 text-slate-400 hover:text-blue-600">
          <ChevronRight className="h-5 w-5" />
        </Link>
      </TD>
    </TR>
  );
}
