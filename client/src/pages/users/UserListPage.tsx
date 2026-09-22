import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Plus, ShieldCheck, UserCog } from 'lucide-react';
import { usersApi } from '../../api/users.js';
import { getApiErrorMessage } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.js';
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
import { formatDate, fullName, initials } from '../../utils/format.js';
import { roleBadgeClass, roleLabels } from '../../utils/labels.js';
import { ROLES } from '../../types/index.js';
import type { User } from '../../types/index.js';

const PAGE_SIZE = 10;

export function UserListPage() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<User | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search);

  const { data, loading, error, reload } = useAsync(
    (signal) =>
      usersApi.list({
        search: debouncedSearch || undefined,
        role: roleFilter || undefined,
        isActive: statusFilter === '' ? undefined : (statusFilter as 'true' | 'false'),
        page,
        pageSize: PAGE_SIZE,
      }),
    [debouncedSearch, roleFilter, statusFilter, page],
  );

  const handleStatusChange = async () => {
    if (!target) return;
    setStatusLoading(true);
    setActionError(null);
    try {
      await usersApi.updateStatus(target.id, !target.isActive);
      // Si l'administrateur désactive son propre compte, forcer la reconnexion.
      if (currentUser?.id === target.id) {
        window.location.href = '/connexion';
        return;
      }
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
        title="Utilisateurs"
        description="Comptes des personnes autorisées à utiliser l'application."
        actions={
          <Link to="/utilisateurs/nouveau">
            <Button icon={<Plus className="h-4 w-4" />}>Nouvel utilisateur</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Rechercher (nom, email, téléphone...)"
          className="w-full max-w-md"
        />
        <Select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="w-44" aria-label="Filtrer par rôle">
          <option value="">Tous les rôles</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>{roleLabels[role]}</option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-44" aria-label="Filtrer par statut">
          <option value="">Tous les statuts</option>
          <option value="true">Actifs</option>
          <option value="false">Désactivés</option>
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
            icon={<UserCog className="h-6 w-6" />}
            title={search || roleFilter || statusFilter ? 'Aucun utilisateur ne correspond à votre recherche' : 'Aucun utilisateur enregistré'}
            description={
              search || roleFilter || statusFilter
                ? 'Essayez de modifier vos critères de recherche ou vos filtres.'
                : "Créez le premier compte utilisateur de l'application."
            }
            action={
              !search && !roleFilter && !statusFilter && (
                <Link to="/utilisateurs/nouveau">
                  <Button icon={<Plus className="h-4 w-4" />}>Ajouter un utilisateur</Button>
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
                <TH>Utilisateur</TH>
                <TH>Email</TH>
                <TH>Téléphone</TH>
                <TH>Rôle</TH>
                <TH>Statut</TH>
                <TH className="w-44 text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {data.data.map((user) => (
                <TR key={user.id}>
                  <TD>
                    <Link to={`/utilisateurs/${user.id}`} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
                        {initials(user)}
                      </span>
                      <span>
                        <span className="block font-medium text-slate-800 hover:text-blue-700">{fullName(user)}</span>
                        <span className="text-xs text-slate-400">Créé le {formatDate(user.createdAt)}</span>
                      </span>
                    </Link>
                  </TD>
                  <TD className="break-all">{user.email}</TD>
                  <TD>{user.phone ?? <span className="text-slate-400">—</span>}</TD>
                  <TD>
                    <Badge className={roleBadgeClass[user.role]}>{roleLabels[user.role]}</Badge>
                  </TD>
                  <TD>
                    {user.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-700 ring-emerald-600/20">Actif</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 ring-red-600/20">Désactivé</Badge>
                    )}
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setTarget(user)}
                        disabled={currentUser?.id === user.id}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30"
                        title={
                          currentUser?.id === user.id
                            ? 'Vous ne pouvez pas désactiver votre propre compte'
                            : user.isActive
                              ? 'Désactiver ce compte'
                              : 'Réactiver ce compte'
                        }
                        aria-label={user.isActive ? 'Désactiver ce compte' : 'Réactiver ce compte'}
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </button>
                      <Link
                        to={`/utilisateurs/${user.id}`}
                        aria-label={`Voir ${user.firstName} ${user.lastName}`}
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
        title={target?.isActive ? 'Désactiver ce compte' : 'Réactiver ce compte'}
        message={
          target?.isActive
            ? `Voulez-vous désactiver le compte de « ${target ? fullName(target) : ''} » ? Cette personne ne pourra plus se connecter.`
            : `Voulez-vous réactiver le compte de « ${target ? fullName(target) : ''} » ?`
        }
        confirmLabel={target?.isActive ? 'Désactiver' : 'Réactiver'}
        danger={target?.isActive}
        loading={statusLoading}
        onConfirm={handleStatusChange}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
