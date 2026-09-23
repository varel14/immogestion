import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, BadgeCheck, Ban, CheckCircle2, Eye, HandCoins, Lock, Plus, XCircle,
} from 'lucide-react';
import { offersApi, requestsApi, reservationsApi } from '../../api/commercial.js';
import { getApiErrorMessage } from '../../api/client.js';
import { useAsync } from '../../hooks/useAsync.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card } from '../../components/ui/Card.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { ErrorState } from '../../components/ui/ErrorState.js';
import { Alert } from '../../components/ui/Alert.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { Modal } from '../../components/ui/Modal.js';
import { Field, Input, Textarea } from '../../components/ui/Field.js';
import { formatDate, formatDateTime, formatPrice, fullName } from '../../utils/format.js';
import {
  offerStatusBadgeClass, offerStatusLabels, requestStatusBadgeClass,
  requestStatusLabels, requestTypeLabels,
} from '../../utils/labels.js';
import type { OfferStatus, RequestStatus } from '../../types/index.js';

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: request, loading, error, reload } = useAsync((signal) => requestsApi.getById(id!), [id]);

  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ status: RequestStatus; label: string } | null>(null);

  // Offre
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerObservations, setOfferObservations] = useState('');

  // Réservation
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reserveExpiresAt, setReserveExpiresAt] = useState(() => {
    const d = new Date(Date.now() + 30 * 86400000);
    return d.toISOString().slice(0, 10);
  });

  if (loading && !request) {
    return (
      <div className="py-20">
        <Spinner size="lg" label="Chargement de la demande..." className="flex-col" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/demandes')}>
          Retour à la liste
        </Button>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <ErrorState message={error} onRetry={reload} />
        </div>
      </div>
    );
  }

  if (!request) return null;

  const isTerminal = ['ACCEPTED', 'REFUSED', 'CANCELLED'].includes(request.status);
  const canReserve = request.status === 'ACCEPTED';

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      setSuccessMessage(message);
      setConfirmAction(null);
      setOfferModalOpen(false);
      setReserveOpen(false);
      reload();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
      setConfirmAction(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/demandes')}>
        Retour à la liste
      </Button>

      <div className="mt-3">
        <PageHeader
          title={`Demande de ${requestTypeLabels[request.type].toLowerCase()}`}
          description={`Déposée le ${formatDate(request.createdAt)}`}
          actions={
            !isTerminal && (
              <>
                <Button variant="secondary" icon={<Eye className="h-4 w-4" />} onClick={() => setConfirmAction({ status: 'UNDER_REVIEW', label: "mettre à l'étude" })}>
                  Mettre à l'étude
                </Button>
                <Button variant="danger" icon={<Ban className="h-4 w-4" />} onClick={() => setConfirmAction({ status: 'CANCELLED', label: 'annuler' })}>
                  Annuler la demande
                </Button>
              </>
            )
          }
        />
      </div>

      {(actionError || successMessage) && (
        <div className="mb-4 space-y-2">
          {actionError && <Alert variant="error">{actionError}</Alert>}
          {successMessage && <Alert variant="success">{successMessage}</Alert>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Détails de la demande */}
        <Card className="lg:col-span-2">
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Détails de la demande</h2>
          <dl className="grid grid-cols-1 gap-4 px-5 py-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-400">Statut</dt>
              <dd className="mt-1"><Badge className={requestStatusBadgeClass[request.status]}>{requestStatusLabels[request.status]}</Badge></dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Type</dt>
              <dd className="mt-1 text-slate-700">{requestTypeLabels[request.type]}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Client</dt>
              <dd className="mt-1">
                <Link to={`/clients/${request.clientId}`} className="font-medium text-blue-700 hover:underline">
                  {request.client ? fullName(request.client) : '—'}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Bien concerné</dt>
              <dd className="mt-1">
                <Link to={`/biens/${request.propertyId}`} className="font-medium text-blue-700 hover:underline">
                  {request.property?.title}
                </Link>
                <span className="block text-xs text-slate-400">{request.property?.reference}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Montant proposé</dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {request.proposedAmount !== null ? formatPrice(request.proposedAmount) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Notes</dt>
              <dd className="mt-1 text-slate-700">{request.notes || '—'}</dd>
            </div>
          </dl>
        </Card>

        {/* Actions de suivi */}
        <Card>
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Suite du parcours</h2>
          <div className="space-y-3 px-5 py-4 text-sm">
            <Button
              className="w-full"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => { setOfferAmount(request.proposedAmount !== null ? String(request.proposedAmount) : ''); setOfferObservations(''); setOfferModalOpen(true); }}
              disabled={isTerminal || request.type !== 'PURCHASE'}
            >
              Formuler une offre d'achat
            </Button>
            {request.type !== 'PURCHASE' && (
              <p className="text-xs text-slate-400">Les offres concernent uniquement les demandes d'achat.</p>
            )}
            <Button
              className="w-full"
              variant="secondary"
              icon={<Lock className="h-4 w-4" />}
              disabled={!canReserve}
              onClick={() => setReserveOpen(true)}
            >
              Réserver le bien
            </Button>
            {!canReserve && (
              <p className="text-xs text-slate-400">
                La réservation nécessite une demande acceptée (ou une offre acceptée).
              </p>
            )}
            {canReserve && (
              <Link to={`/ventes/nouveau?sourceType=REQUEST&sourceId=${request.id}`} className="block">
                <Button className="w-full" variant="secondary" icon={<HandCoins className="h-4 w-4" />}>
                  {request.type === 'PURCHASE' ? 'Créer une vente' : 'Créer un contrat de location'}
                </Button>
              </Link>
            )}
            {!isTerminal && (
              <>
                <Button className="w-full" variant="secondary" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setConfirmAction({ status: 'ACCEPTED', label: 'accepter' })}>
                  Accepter la demande
                </Button>
                <Button className="w-full" variant="danger" icon={<XCircle className="h-4 w-4" />} onClick={() => setConfirmAction({ status: 'REFUSED', label: 'refuser' })}>
                  Refuser la demande
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Offres associées */}
        <Card className="lg:col-span-3">
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">
            Offres d'achat ({request.offers?.length ?? 0})
          </h2>
          {!request.offers || request.offers.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              Aucune offre formulée pour cette demande.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {request.offers.map((offer) => (
                <li key={offer.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">{formatPrice(offer.amount)}</p>
                    <p className="text-xs text-slate-400">
                      Offre du {formatDateTime(offer.createdAt)}
                      {offer.observations ? ` — ${offer.observations}` : ''}
                    </p>
                  </div>
                  <Badge className={offerStatusBadgeClass[offer.status]}>{offerStatusLabels[offer.status]}</Badge>
                  {offer.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<BadgeCheck className="h-4 w-4" />}
                        disabled={busy}
                        onClick={() => run(() => offersApi.accept(offer.id), 'Offre acceptée : la demande est acceptée.')}
                      >
                        Accepter
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<XCircle className="h-4 w-4" />}
                        disabled={busy}
                        onClick={() => run(() => offersApi.refuse(offer.id), 'Offre refusée.')}
                      >
                        Refuser
                      </Button>
                    </div>
                  )}
                  {offer.status === 'ACCEPTED' && canReserve && (
                    <Button size="sm" icon={<Lock className="h-4 w-4" />} onClick={() => setReserveOpen(true)}>
                      Réserver le bien
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Confirmation de changement de statut */}
      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction ? `Confirmer : ${confirmAction.label} la demande ?` : ''}
        message="Cette action est enregistrée dans l'historique et ne peut pas être annulée."
        confirmLabel={confirmAction?.label ?? 'Confirmer'}
        danger={confirmAction?.status === 'REFUSED' || confirmAction?.status === 'CANCELLED'}
        loading={busy}
        onConfirm={() => confirmAction && run(() => requestsApi.updateStatus(request.id, confirmAction.status), 'Statut de la demande mis à jour.')}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Modale d'offre */}
      <Modal
        open={offerModalOpen}
        onClose={() => setOfferModalOpen(false)}
        title="Formuler une offre d'achat"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOfferModalOpen(false)} disabled={busy}>Annuler</Button>
            <Button
              loading={busy}
              onClick={() => run(
                () => offersApi.create({ requestId: request.id, amount: Number(offerAmount), observations: offerObservations || null }),
                'Offre enregistrée. Les anciennes offres sont conservées.',
              )}
            >
              Enregistrer l'offre
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Montant proposé (FCFA)" required>
            <Input type="number" min="1" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder="Ex. : 185000000" />
          </Field>
          <Field label="Observations">
            <Textarea rows={2} value={offerObservations} onChange={(e) => setOfferObservations(e.target.value)} placeholder="Conditions particulières de l'offre" />
          </Field>
        </div>
      </Modal>

      {/* Modale de réservation */}
      <Modal
        open={reserveOpen}
        onClose={() => setReserveOpen(false)}
        title="Réserver le bien"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReserveOpen(false)} disabled={busy}>Annuler</Button>
            <Button
              loading={busy}
              onClick={() => run(
                () => reservationsApi.create({ sourceType: 'REQUEST', sourceId: request.id, expiresAt: new Date(reserveExpiresAt).toISOString() }),
                'Bien réservé : le statut du bien est passé à « Réservé ».',
              )}
            >
              Confirmer la réservation
            </Button>
          </>
        }
      >
        <Field label="Date d'expiration de la réservation" hint="Passée cette date, la réservation expire et le bien redevient disponible.">
          <Input type="date" value={reserveExpiresAt} onChange={(e) => setReserveExpiresAt(e.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}
