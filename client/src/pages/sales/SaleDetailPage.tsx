import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Ban, CheckCircle2, HandCoins, Pencil, User, UserRound, Wallet,
} from 'lucide-react';
import { paymentsApi, salesApi } from '../../api/transactions.js';
import { getApiErrorMessage } from '../../api/client.js';
import { auditApi } from '../../api/transactions.js';
import { useAsync } from '../../hooks/useAsync.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card } from '../../components/ui/Card.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { ErrorState } from '../../components/ui/ErrorState.js';
import { Alert } from '../../components/ui/Alert.js';
import { Modal } from '../../components/ui/Modal.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.js';
import { formatDate, formatDateTime, formatPrice, fullName } from '../../utils/format.js';
import { auditActionLabels, paymentMethodLabels, paymentStatusBadgeClass, paymentStatusLabels, saleStatusBadgeClass, saleStatusLabels } from '../../utils/labels.js';
import { PAYMENT_METHODS } from '../../types/index.js';

export function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sale, loading, error, reload } = useAsync((signal) => salesApi.getById(id!), [id]);
  const audit = useAsync((signal) => auditApi.list({ entityType: 'Sale', entityId: id! }), [id]);

  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [transactionReference, setTransactionReference] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [finalizeOpen, setFinalizeOpen] = useState(false);

  if (loading && !sale) {
    return (
      <div className="py-20">
        <Spinner size="lg" label="Chargement de la vente..." className="flex-col" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/ventes')}>
          Retour à la liste
        </Button>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <ErrorState message={error} onRetry={reload} />
        </div>
      </div>
    );
  }

  if (!sale) return null;

  const paidPercent = sale.salePrice > 0 ? Math.min(100, Math.round(((sale.paidAmount ?? 0) / sale.salePrice) * 100)) : 0;
  const canEdit = sale.status !== 'FINALIZED' && sale.status !== 'CANCELLED';

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      setSuccessMessage(message);
      setPayOpen(false);
      setCancelOpen(false);
      setFinalizeOpen(false);
      reload();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
      setPayOpen(false);
      setCancelOpen(false);
      setFinalizeOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/ventes')}>
        Retour à la liste
      </Button>

      <div className="mt-3">
        <PageHeader
          title={`Vente ${sale.reference}`}
          description={`Créée le ${formatDate(sale.createdAt)}`}
          actions={
            <>
              {sale.status !== 'FINALIZED' && sale.status !== 'CANCELLED' && (
                <>
                  <Button variant="danger" icon={<Ban className="h-4 w-4" />} onClick={() => setCancelOpen(true)}>Annuler</Button>
                  <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => run(() => salesApi.update(sale.id, { status: 'IN_PROGRESS' }), 'Vente passée en cours.')}>
                    Passer en cours
                  </Button>
                  <Button icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setFinalizeOpen(true)}>Finaliser la vente</Button>
                </>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Suivi financier */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="flex items-center gap-2 font-semibold text-slate-800"><Wallet className="h-4 w-4" /> Suivi des paiements</h2>
            {canEdit && (
              <Button size="sm" icon={<HandCoins className="h-4 w-4" />} onClick={() => { setAmount(sale.remainingAmount !== undefined && sale.remainingAmount > 0 ? String(sale.remainingAmount) : ''); setPayOpen(true); }}>
                Enregistrer un versement
              </Button>
            )}
          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 px-2 py-3">
                <p className="text-lg font-bold text-slate-800">{formatPrice(sale.salePrice)}</p>
                <p className="text-xs text-slate-500">Prix final</p>
              </div>
              <div className="rounded-lg bg-emerald-50 px-2 py-3">
                <p className="text-lg font-bold text-emerald-700">{formatPrice(sale.paidAmount ?? 0)}</p>
                <p className="text-xs text-slate-500">Total payé</p>
              </div>
              <div className="rounded-lg bg-amber-50 px-2 py-3">
                <p className="text-lg font-bold text-amber-700">{formatPrice(sale.remainingAmount ?? 0)}</p>
                <p className="text-xs text-slate-500">Solde restant</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Progression du paiement</span>
                <span>{paidPercent} %</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${paidPercent}%` }} />
              </div>
            </div>

            <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-700">Historique des versements</h3>
            {!sale.payments || sale.payments.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Aucun versement enregistré pour le moment.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                {sale.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="font-semibold text-slate-800">{formatPrice(payment.amount)}</span>
                    <Badge className={paymentStatusBadgeClass[payment.status]}>{paymentStatusLabels[payment.status]}</Badge>
                    <span className="text-slate-500">{paymentMethodLabels[payment.paymentMethod]}</span>
                    <span className="ml-auto text-xs text-slate-400">{formatDate(payment.paymentDate)}</span>
                    {payment.status === 'CONFIRMED' && canEdit && (
                      <button
                        type="button"
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => run(() => paymentsApi.cancel(payment.id, 'Annulé depuis la fiche vente'), 'Versement annulé : le solde a été recalculé.')}
                      >
                        Annuler
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Informations de la vente */}
        <div className="space-y-6">
          <Card>
            <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Informations</h2>
            <dl className="space-y-3 px-5 py-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Statut</span>
                <Badge className={saleStatusBadgeClass[sale.status]}>{saleStatusLabels[sale.status]}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Bien</span>
                <Link to={`/biens/${sale.propertyId}`} className="font-medium text-blue-700 hover:underline">
                  {sale.property?.reference}
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Acheteur</span>
                <Link to={`/clients/${sale.buyerId}`} className="flex items-center gap-1 font-medium text-blue-700 hover:underline">
                  <UserRound className="h-3.5 w-3.5" /> {sale.buyer ? fullName(sale.buyer) : '—'}
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Vendeur</span>
                <Link to={`/proprietaires/${sale.ownerId}`} className="flex items-center gap-1 font-medium text-blue-700 hover:underline">
                  <User className="h-3.5 w-3.5" /> {sale.owner ? fullName(sale.owner) : '—'}
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Agent</span>
                <span className="text-slate-700">{sale.agent ? fullName(sale.agent) : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Date de vente</span>
                <span className="text-slate-700">{sale.saleDate ? formatDate(sale.saleDate) : '—'}</span>
              </div>
              {sale.notes && (
                <div>
                  <span className="text-slate-500">Notes</span>
                  <p className="mt-1 text-slate-700">{sale.notes}</p>
                </div>
              )}
            </dl>
          </Card>

          <Card>
            <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Historique</h2>
            <ul className="divide-y divide-slate-100">
              {(audit.data ?? []).slice(0, 8).map((entry) => (
                <li key={entry.id} className="px-5 py-2.5 text-xs">
                  <p className="font-medium text-slate-700">{auditActionLabels[entry.action] ?? entry.action}</p>
                  <p className="text-slate-400">{entry.userName} — {formatDateTime(entry.createdAt)}</p>
                  {entry.details && <p className="text-slate-500">{entry.details}</p>}
                </li>
              ))}
              {(!audit.data || audit.data.length === 0) && (
                <li className="px-5 py-4 text-center text-xs text-slate-400">Aucune opération enregistrée.</li>
              )}
            </ul>
          </Card>
        </div>
      </div>

      {/* Modale de versement */}
      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Enregistrer un versement"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayOpen(false)} disabled={busy}>Annuler</Button>
            <Button
              loading={busy}
              onClick={() => run(
                () => salesApi.pay(sale.id, {
                  amount: Number(amount),
                  paymentMethod,
                  transactionReference: transactionReference || null,
                }),
                'Versement enregistré.',
              )}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Solde restant : <strong className="text-slate-800">{formatPrice(sale.remainingAmount ?? 0)}</strong>
          </p>
          <Field label="Montant (FCFA)" required>
            <Input type="number" min="1" max={sale.remainingAmount} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Mode de paiement" required>
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>{paymentMethodLabels[method]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Référence de transaction">
            <Input value={transactionReference} onChange={(e) => setTransactionReference(e.target.value)} placeholder="N° de reçu, référence bancaire..." />
          </Field>
        </div>
      </Modal>

      {/* Confirmation de finalisation */}
      <ConfirmDialog
        open={finalizeOpen}
        title="Finaliser la vente ?"
        message="Le bien passera définitivement au statut « Vendu ». Cette opération ne doit être effectuée qu'une fois la vente réellement conclue."
        confirmLabel="Finaliser"
        loading={busy}
        onConfirm={() => run(() => salesApi.finalize(sale.id), 'Vente finalisée : le bien est maintenant vendu.')}
        onCancel={() => setFinalizeOpen(false)}
      />

      {/* Confirmation d'annulation */}
      <ConfirmDialog
        open={cancelOpen}
        title="Annuler la vente ?"
        message="La vente sera marquée comme annulée et le bien retrouvera son statut précédent. Les versements enregistrés doivent d'abord être annulés."
        confirmLabel="Annuler la vente"
        danger
        loading={busy}
        onConfirm={() => run(() => salesApi.cancel(sale.id, cancelReason || null), 'Vente annulée.')}
        onCancel={() => setCancelOpen(false)}
      >
        <Field label="Motif d'annulation">
          <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Ex. : désistement de l'acheteur" />
        </Field>
      </ConfirmDialog>
    </div>
  );
}
