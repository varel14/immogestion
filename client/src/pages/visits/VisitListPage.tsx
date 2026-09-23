import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, Plus } from 'lucide-react';
import { visitsApi, type ListVisitsParams } from '../../api/commercial.js';
import { referenceApi } from '../../api/commercial.js';
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
import { formatDateTime } from '../../utils/format.js';
import { visitStatusBadgeClass, visitStatusLabels } from '../../utils/labels.js';
import { fullName } from '../../utils/format.js';
import { VISIT_STATUSES } from '../../types/index.js';

const PAGE_SIZE = 10;

export function VisitListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [agentId, setAgentId] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);

  const agents = useAsync(() => referenceApi.agents(), []);
  const { data, loading, error, reload } = useAsync((signal) => {
    const params: ListVisitsParams = { page, pageSize: PAGE_SIZE };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status) params.status = status;
    if (agentId) params.agentId = agentId;
    return visitsApi.list(params);
  }, [debouncedSearch, status, agentId, page]);

  return (
    <div>
      <PageHeader
        title="Visites"
        description="Organisez et suivez les visites des biens par les clients."
        actions={
          <>
            <Link to="/visites/calendrier">
              <Button variant="secondary" icon={<CalendarDays className="h-4 w-4" />}>Calendrier</Button>
            </Link>
            <Link to="/visites/nouveau">
              <Button icon={<Plus className="h-4 w-4" />}>Programmer une visite</Button>
            </Link>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Rechercher (bien, client...)" />
        <Select value={agentId} onChange={(e) => { setAgentId(e.target.value); setPage(1); }} aria-label="Filtrer par agent">
          <option value="">Tous les agents</option>
          {(agents.data ?? []).map((agent) => (
            <option key={agent.id} value={agent.id}>{fullName(agent)}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filtrer par statut">
          <option value="">Tous les statuts</option>
          {VISIT_STATUSES.map((s) => (
            <option key={s} value={s}>{visitStatusLabels[s]}</option>
          ))}
        </Select>
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
            icon={<CalendarDays className="h-6 w-6" />}
            title="Aucune visite trouvée"
            description="Programmez la première visite d'un bien."
            action={
              <Link to="/visites/nouveau">
                <Button icon={<Plus className="h-4 w-4" />}>Programmer une visite</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <TableWrap>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Date et heure</TH>
                <TH>Bien</TH>
                <TH>Client</TH>
                <TH>Agent</TH>
                <TH>Statut</TH>
                <TH className="w-10" />
              </TR>
            </THead>
            <TBody>
              {data.data.map((visit) => (
                <TR key={visit.id}>
                  <TD className="whitespace-nowrap font-medium text-slate-800">{formatDateTime(visit.scheduledAt)}</TD>
                  <TD>
                    <Link to={`/biens/${visit.propertyId}`} className="block max-w-[220px] truncate hover:text-blue-700">
                      {visit.property?.title ?? 'Bien supprimé'}
                    </Link>
                    <span className="text-xs text-slate-400">{visit.property?.reference}</span>
                  </TD>
                  <TD>
                    <Link to={`/clients/${visit.clientId}`} className="hover:text-blue-700">
                      {visit.client ? fullName(visit.client) : '—'}
                    </Link>
                  </TD>
                  <TD>{visit.agent ? fullName(visit.agent) : '—'}</TD>
                  <TD>
                    <Badge className={visitStatusBadgeClass[visit.status]}>{visitStatusLabels[visit.status]}</Badge>
                  </TD>
                  <TD>
                    <Link to={`/visites/${visit.id}`} aria-label="Voir la visite" className="block p-1 text-slate-400 hover:text-blue-600">
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
