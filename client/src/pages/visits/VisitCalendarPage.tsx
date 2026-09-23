import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { referenceApi, visitsApi, type ListVisitsParams } from '../../api/commercial.js';
import { useAsync } from '../../hooks/useAsync.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Select } from '../../components/ui/Field.js';
import { Badge } from '../../components/ui/Badge.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { ErrorState } from '../../components/ui/ErrorState.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { fullName } from '../../utils/format.js';
import { visitStatusBadgeClass, visitStatusLabels } from '../../utils/labels.js';
import { cn } from '../../utils/cn.js';
import { VISIT_STATUSES } from '../../types/index.js';
import type { Visit } from '../../types/index.js';

const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

const WEEKDAYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

interface DayCell {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
}

export function VisitCalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [agentFilter, setAgentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  const agents = useAsync(() => referenceApi.agents(), []);

  // Visites couvrant la fenêtre affichée (grille + marge d'une semaine).
  const range = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = new Date(first);
    gridStart.setDate(1 - ((first.getDay() + 6) % 7));
    const gridEnd = new Date(gridStart);
    gridEnd.setDate(gridStart.getDate() + 41);
    return { from: gridStart.toISOString(), to: gridEnd.toISOString() };
  }, [cursor]);

  const visits = useAsync((signal) => {
    const params: ListVisitsParams = { from: range.from, to: range.to, pageSize: 100 };
    if (agentFilter) params.agentId = agentFilter;
    if (statusFilter) params.status = statusFilter;
    return visitsApi.list(params);
  }, [range.from, range.to, agentFilter, statusFilter]);

  const grid = useMemo<DayCell[]>(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    const today = new Date();
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return {
        date,
        inMonth: date.getMonth() === cursor.getMonth(),
        isToday: date.toDateString() === today.toDateString(),
      };
    });
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, Visit[]>();
    for (const visit of visits.data?.data ?? []) {
      const key = new Date(visit.scheduledAt).toDateString();
      map.set(key, [...(map.get(key) ?? []), visit]);
    }
    return map;
  }, [visits.data]);

  const dayVisits = byDay.get(selectedDay.toDateString()) ?? [];

  const statusColor: Record<string, string> = {
    SCHEDULED: 'bg-blue-500',
    RESCHEDULED: 'bg-amber-500',
    COMPLETED: 'bg-emerald-500',
    CANCELLED: 'bg-slate-400',
    NO_SHOW: 'bg-red-500',
  };

  return (
    <div>
      <PageHeader
        title="Calendrier des visites"
        description="Visualisez les visites du jour, de la semaine et à venir."
        actions={
          <Link to="/visites/nouveau">
            <Button icon={<Plus className="h-4 w-4" />}>Programmer une visite</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" aria-label="Mois précédent" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[190px] text-center text-sm font-semibold capitalize text-slate-800">
            {monthFormatter.format(cursor)}
          </span>
          <Button variant="secondary" size="sm" aria-label="Mois suivant" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { const now = new Date(); setCursor(new Date(now.getFullYear(), now.getMonth(), 1)); setSelectedDay(now); }}>
            Aujourd'hui
          </Button>
        </div>
        <Select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className="w-44" aria-label="Filtrer par agent">
          <option value="">Tous les agents</option>
          {(agents.data ?? []).map((agent) => (
            <option key={agent.id} value={agent.id}>{fullName(agent)}</option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-44" aria-label="Filtrer par statut">
          <option value="">Tous les statuts</option>
          {VISIT_STATUSES.map((status) => (
            <option key={status} value={status}>{visitStatusLabels[status]}</option>
          ))}
        </Select>
      </div>

      {visits.loading && !visits.data ? (
        <div className="py-16"><Spinner size="lg" label="Chargement du calendrier..." className="flex-col" /></div>
      ) : visits.error ? (
        <Card><ErrorState message={visits.error} onRetry={visits.reload} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Grille du mois */}
          <Card className="overflow-hidden lg:col-span-2">
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
              {WEEKDAYS.map((day) => (
                <div key={day} className="px-2 py-2 text-center text-xs font-semibold text-slate-500 uppercase">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {grid.map((cell, index) => {
                const dayVisitsList = byDay.get(cell.date.toDateString()) ?? [];
                const isSelected = cell.date.toDateString() === selectedDay.toDateString();
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedDay(cell.date)}
                    className={cn(
                      'min-h-[84px] border-b border-r border-slate-100 p-1.5 text-left align-top transition-colors hover:bg-slate-50',
                      !cell.inMonth && 'bg-slate-50/60 text-slate-300',
                      isSelected && 'bg-blue-50 ring-2 ring-blue-600 ring-inset',
                    )}
                  >
                    <span className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                      cell.isToday ? 'bg-blue-600 text-white' : cell.inMonth ? 'text-slate-700' : 'text-slate-300',
                    )}>
                      {cell.date.getDate()}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-0.5">
                      {dayVisitsList.slice(0, 3).map((visit) => (
                        <span key={visit.id} className={cn('h-1.5 w-1.5 rounded-full', statusColor[visit.status])} title={visitStatusLabels[visit.status]} />
                      ))}
                      {dayVisitsList.length > 3 && <span className="text-[10px] text-slate-400">+{dayVisitsList.length - 3}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Visites du jour sélectionné */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 capitalize">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              {dayFormatter.format(selectedDay)}
            </h2>
            <Card>
              {dayVisits.length === 0 ? (
                <EmptyState title="Aucune visite ce jour" description="Sélectionnez un autre jour ou programmez une visite." />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {dayVisits.map((visit) => (
                    <li key={visit.id}>
                      <Link to={`/visites/${visit.id}`} className="block px-4 py-3 transition-colors hover:bg-slate-50">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-800">{timeFormatter.format(new Date(visit.scheduledAt))}</span>
                          <Badge className={visitStatusBadgeClass[visit.status]}>{visitStatusLabels[visit.status]}</Badge>
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-600">{visit.property?.title}</p>
                        <p className="text-xs text-slate-400">
                          {visit.client ? fullName(visit.client) : ''} · {visit.agent ? fullName(visit.agent) : ''}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
