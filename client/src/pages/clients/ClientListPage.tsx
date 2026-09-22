import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ArchiveRestore, ChevronRight, Plus, Users } from 'lucide-react';
import { clientsApi } from '../../api/clients.js';
import { getApiErrorMessage } from '../../api/client.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { SearchInput } from '../../components/ui/SearchInput.js';
import { Select } from '../../components/ui/Field.js';
import { TableWrap, THead, TH, TBody, TR, TD, TableSkeleton } from '../../components/ui/Table.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { ErrorState } from '../../components/ui/ErrorState.js';
import { Pagination } from '../../components/ui/Pagination.js';
import { Badge } from '../../components/ui/Badge.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { formatDate } from '../../utils/format.js';
import type { Client } from '../../types/index.js';

const PAGE_SIZE = 10;

export function ClientListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<Client | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search);

  const { data, loading, error, reload } = useAsync(
    (signal) =>
      clientsApi.list({
        search: debouncedSearch || undefined,
        isActive: statusFilter === '' ? undefined : (statusFilter as 'true' | 'false'),
        page,
        pageSize: PAGE_SIZE,
      }),
    [debouncedSearch, statusFilter, page],
  );

  const handleStatusChange = async () => {
    if (!target) return;
    setStatusLoading(true);
    setActionError(null);
    try {
      await clientsApi.updateStatus(target.id, !target.isActive);
      setTarget(null);
      reload();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
      setTarget(null);
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Personnes intéressées par un achat ou une location auprès de l'agence."
        actions={
          <Link to="/clients/nouveau">
            <Button icon={<Plus className="h-4 w-4" />}>Nouveau client</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Rechercher (nom, téléphone, email...)"
          className="w-full max-w-md"
        />
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="w-44"
          aria-label="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          <option value="true">Actifs</option>
          <option value="false">Archivés</option>
        </Select>
      </div>

      {actionError && (
        <div className="mb-4">
          <ErrorState message={actionError} onRetry={reload} />
        </div>
      )}

      {loading && !data ? (
        <TableSkeleton rows={6} cols={5} />
      ) : error ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title={search || statusFilter ? 'Aucun client ne correspond à votre recherche' : 'Aucun client enregistré'}
            description={
              search || statusFilter
                ? 'Essayez de modifier vos critères de recherche ou vos filtres.'
                : "Ajoutez le premier client du fichier de l'agence."
            }
            action={
              !search && !statusFilter && (
                <Link to="/clients/nouveau">
                  <Button icon={<Plus className="h-4 w-4" />}>Ajouter un client</Button>
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
                <TH>Client</TH>
                <TH>Téléphone</TH>
                <TH>Email</TH>
                <TH>Statut</TH>
                <TH>Ajouté le</TH>
                <TH className="w-40 text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {data.data.map((client) => (
                <TR key={client.id}>
                  <TD>
                    <Link to={`/clients/${client.id}`} className="block">
                      <span className="block font-medium text-slate-800 hover:text-blue-700">
                        {client.firstName} {client.lastName}
                      </span>
                      {client.identificationNumber && (
                        <span className="text-xs text-slate-400">N° ident. : {client.identificationNumber}</span>
                      )}
                    </Link>
                  </TD>
                  <TD>{client.phone ?? <span className="text-slate-400">—</span>}</TD>
                  <TD>{client.email ?? <span className="text-slate-400">—</span>}</TD>
                  <TD>
                    {client.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-700 ring-emerald-600/20">Actif</Badge>
                    ) : (
                      <Badge className="bg-slate-200 text-slate-600 ring-slate-500/20">Archivé</Badge>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap text-slate-500">{formatDate(client.createdAt)}</TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setTarget(client)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title={client.isActive ? 'Archiver ce client' : 'Restaurer ce client'}
                        aria-label={client.isActive ? 'Archiver ce client' : 'Restaurer ce client'}
                      >
                        {client.isActive ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                      </button>
                      <Link
                        to={`/clients/${client.id}`}
                        aria-label={`Voir ${client.firstName} ${client.lastName}`}
                        className="block p-1.5 text-slate-400 hover:text-blue-600"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
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

      <ConfirmDialog
        open={target !== null}
        title={target?.isActive ? 'Archiver ce client' : 'Restaurer ce client'}
        message={
          target?.isActive
            ? `Voulez-vous archiver « ${target?.firstName} ${target?.lastName} » ? Il ne apparaîtra plus dans les listes actives mais restera consultable.`
            : `Voulez-vous restaurer « ${target?.firstName} ${target?.lastName} » comme client actif ?`
        }
        confirmLabel={target?.isActive ? 'Archiver' : 'Restaurer'}
        danger={target?.isActive}
        loading={statusLoading}
        onConfirm={handleStatusChange}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
