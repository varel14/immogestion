import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CalendarClock, CalendarX2, CheckCircle2, ClipboardCheck, Pencil,
  UserRound, UserX, Building2,
} from 'lucide-react';
import { visitsApi } from '../../api/commercial.js';
import { getApiErrorMessage } from '../../api/client.js';
import { useAsync } from '../../hooks/useAsync.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card } from '../../components/ui/Card.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { ErrorState } from '../../components/ui/ErrorState.js';
import { Alert } from '../../components/ui/Alert.js';
import { Modal } from '../../components/ui/Modal.js';
import { Field, Input, Textarea } from '../../components/ui/Field.js';
import { formatDateTime, fullName } from '../../utils/format.js';
import { visitStatusBadgeClass, visitStatusLabels } from '../../utils/labels.js';

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: visit, loading, error, reload } = useAsync((signal) => visitsApi.getById(id!), [id]);

  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [newDate, setNewDate] = useState(toLocalInputValue(new Date(Date.now() + 7 * 86400000)));
  const [feedback, setFeedback] = useState('');
  const [clientObservations, setClientObservations] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading && !visit) {
    return (
      <div className="py-20">
        <Spinner size="lg" label="Chargement de la visite..." className="flex-col" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/visites')}>
          Retour à la liste
        </Button>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <ErrorState message={error} onRetry={reload} />
        </div>
      </div>
    );
  }

  if (!visit) return null;

  const isUpcoming = visit.status === 'SCHEDULED' || visit.status === 'RESCHEDULED';

  const runAction = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      setSuccessMessage(message);
      reload();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
      setRescheduleOpen(false);
      setFeedbackOpen(false);
    }
  };

  return (
    <div>
      <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/visites')}>
        Retour à la liste
      </Button>

      <div className="mt-3">
        <PageHeader
          title={`Visite du ${formatDateTime(visit.scheduledAt)}`}
          description={`${visit.property?.title ?? ''} — ${visit.client ? fullName(visit.client) : ''}`}
          actions={
            <>
              {isUpcoming && (
                <Button variant="secondary" icon={<CalendarClock className="h-4 w-4" />} onClick={() => setRescheduleOpen(true)}>
                  Reporter
                </Button>
              )}
              {(visit.status === 'COMPLETED' || isUpcoming) && (
                <Button variant="secondary" icon={<ClipboardCheck className="h-4 w-4" />} onClick={() => { setFeedback(visit.feedback ?? ''); setClientObservations(visit.notes ?? ''); setFeedbackOpen(true); }}>
                  Compte rendu
                </Button>
              )}
              {isUpcoming && (
                <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => navigate(`/visites/${visit.id}/modifier`)}>
                  Modifier
                </Button>
              )}
            </>
          }
        />
      </div>

      {(actionError || successMessage) && (
        <div className="mb-4 space-y-2">
          {actionError && <Alert variant="error">{actionError}</Alert>}
          {successMessage && <Alert variant="success">{successMessage}</Alert>}
        </div>
      )}

      {isUpcoming && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            icon={<CheckCircle2 className="h-4 w-4" />}
            loading={busy}
            onClick={() => runAction(() => visitsApi.setStatus(visit.id, 'COMPLETED'), 'Visite marquée comme effectuée.')}
          >
            Marquer comme effectuée
          </Button>
          <Button
            variant="secondary"
            icon={<UserX className="h-4 w-4" />}
            loading={busy}
            onClick={() => runAction(() => visitsApi.setStatus(visit.id, 'NO_SHOW'), 'Absence du client signalée.')}
          >
            Signaler une absence
          </Button>
          <Button
            variant="danger"
            icon={<CalendarX2 className="h-4 w-4" />}
            loading={busy}
            onClick={() => runAction(() => visitsApi.setStatus(visit.id, 'CANCELLED'), 'Visite annulée.')}
          >
            Annuler la visite
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Détails de la visite</h2>
          <dl className="grid grid-cols-1 gap-4 px-5 py-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-400">Statut</dt>
              <dd className="mt-1"><Badge className={visitStatusBadgeClass[visit.status]}>{visitStatusLabels[visit.status]}</Badge></dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Date et heure</dt>
              <dd className="mt-1 text-slate-700">{formatDateTime(visit.scheduledAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Bien</dt>
              <dd className="mt-1">
                <Link to={`/biens/${visit.propertyId}`} className="flex items-center gap-1.5 font-medium text-blue-700 hover:underline">
                  <Building2 className="h-4 w-4" />
                  {visit.property?.title}
                </Link>
                <span className="text-xs text-slate-400">{visit.property?.reference}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Client</dt>
              <dd className="mt-1">
                <Link to={`/clients/${visit.clientId}`} className="flex items-center gap-1.5 font-medium text-blue-700 hover:underline">
                  <UserRound className="h-4 w-4" />
                  {visit.client ? fullName(visit.client) : '—'}
                </Link>
                {visit.client?.phone && <span className="text-xs text-slate-400">{visit.client.phone}</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Agent en charge</dt>
              <dd className="mt-1 text-slate-700">{visit.agent ? fullName(visit.agent) : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Notes</dt>
              <dd className="mt-1 text-slate-700">{visit.notes || '—'}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Compte rendu</h2>
          <div className="px-5 py-4 text-sm">
            {visit.feedback ? (
              <p className="whitespace-pre-line text-slate-600">{visit.feedback}</p>
            ) : (
              <p className="text-slate-400">
                {visit.status === 'COMPLETED'
                  ? 'Aucun compte rendu renseigné pour cette visite effectuée.'
                  : 'Le compte rendu sera disponible après la visite.'}
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Modale de report */}
      <Modal
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        title="Reporter la visite"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRescheduleOpen(false)} disabled={busy}>Annuler</Button>
            <Button
              loading={busy}
              onClick={() => runAction(() => visitsApi.reschedule(visit.id, new Date(newDate).toISOString()), 'Visite reportée.')}
            >
              Confirmer le report
            </Button>
          </>
        }
      >
        <Field label="Nouvelle date et heure" required>
          <Input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
        </Field>
      </Modal>

      {/* Modale de compte rendu */}
      <Modal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        title="Compte rendu de visite"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFeedbackOpen(false)} disabled={busy}>Annuler</Button>
            <Button
              loading={busy}
              onClick={() => runAction(() => visitsApi.addFeedback(visit.id, feedback, clientObservations || null), 'Compte rendu enregistré.')}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Compte rendu de l'agent" required>
            <Textarea rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Impressions, réactions du client, points à suivre..." />
          </Field>
          <Field label="Observations du client">
            <Textarea rows={3} value={clientObservations} onChange={(e) => setClientObservations(e.target.value)} placeholder="Remarques exprimées par le client" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
