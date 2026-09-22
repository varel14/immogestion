import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, KeyRound, Plus } from 'lucide-react';
import { ownersApi } from '../../api/owners.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { SearchInput } from '../../components/ui/SearchInput.js';
import { TableWrap, THead, TH, TBody, TR, TD, TableSkeleton } from '../../components/ui/Table.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { ErrorState } from '../../components/ui/ErrorState.js';
import { Pagination } from '../../components/ui/Pagination.js';
import { Badge } from '../../components/ui/Badge.js';
import { formatDate } from '../../utils/format.js';

const PAGE_SIZE = 10;

export function OwnerListPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);

  const { data, loading, error, reload } = useAsync(
    (signal) => ownersApi.list({ search: debouncedSearch || undefined, page, pageSize: PAGE_SIZE }),
    [debouncedSearch, page],
  );

  return (
    <div>
      <PageHeader
        title="Propriétaires"
        description="Personnes possédant un ou plusieurs biens gérés par l'agence."
        actions={
          <Link to="/proprietaires/nouveau">
            <Button icon={<Plus className="h-4 w-4" />}>Nouveau propriétaire</Button>
          </Link>
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Rechercher (nom, téléphone, email...)"
          className="max-w-md"
        />
      </div>

      {loading && !data ? (
        <TableSkeleton rows={6} cols={5} />
      ) : error ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon={<KeyRound className="h-6 w-6" />}
            title={search ? 'Aucun propriétaire ne correspond à votre recherche' : 'Aucun propriétaire enregistré'}
            description={
              search
                ? 'Essayez de modifier vos critères de recherche.'
                : 'Ajoutez le premier propriétaire pour pouvoir créer des biens.'
            }
            action={
              !search && (
                <Link to="/proprietaires/nouveau">
                  <Button icon={<Plus className="h-4 w-4" />}>Ajouter un propriétaire</Button>
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
                <TH>Propriétaire</TH>
                <TH>Téléphone</TH>
                <TH>Email</TH>
                <TH>Biens</TH>
                <TH>Ajouté le</TH>
                <TH className="w-10" />
              </TR>
            </THead>
            <TBody>
              {data.data.map((owner) => (
                <TR key={owner.id}>
                  <TD>
                    <Link to={`/proprietaires/${owner.id}`} className="block">
                      <span className="block font-medium text-slate-800 hover:text-blue-700">
                        {owner.firstName} {owner.lastName}
                      </span>
                      {owner.identificationNumber && (
                        <span className="text-xs text-slate-400">N° ident. : {owner.identificationNumber}</span>
                      )}
                    </Link>
                  </TD>
                  <TD>{owner.phone ?? <span className="text-slate-400">—</span>}</TD>
                  <TD>{owner.email ?? <span className="text-slate-400">—</span>}</TD>
                  <TD>
                    {owner.propertiesCount !== undefined && owner.propertiesCount > 0 ? (
                      <Badge className="bg-blue-50 text-blue-700 ring-blue-600/20">
                        {owner.propertiesCount} bien{owner.propertiesCount > 1 ? 's' : ''}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap text-slate-500">{formatDate(owner.createdAt)}</TD>
                  <TD>
                    <Link to={`/proprietaires/${owner.id}`} aria-label={`Voir ${owner.firstName} ${owner.lastName}`} className="block p-1 text-slate-400 hover:text-blue-600">
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
