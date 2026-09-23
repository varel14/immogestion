import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Ban, CalendarPlus, CheckCircle2, ClipboardCheck, Download,
  Plus, Trash2, Wallet,
} from 'lucide-react';
import { auditApi, contractsApi, invoicesApi } from '../../api/transactions.js';
import { referenceApi } from '../../api/commercial.js';
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
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.js';
import { formatDate, formatDateTime, formatPrice, fullName } from '../../utils/format.js';
import {
  auditActionLabels, invoiceStatusBadgeClass, invoiceStatusLabels,
  inspectionTypeLabels, leaseStatusBadgeClass, leaseStatusLabels,
  paymentMethodLabels,
} from '../../utils/labels.js';
import { INSPECTION_TYPES, PAYMENT_METHODS } from '../../types/index.js';

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contract, loading, error, reload } = useAsync((signal) => contractsApi.getById(id!), [id]);
  const audit = useAsync((signal) => auditApi.list({ entityType: 'RentalContract', entityId: id! }), [id]);
  const agents = useAsync(() => referenceApi.agents(), []);

  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [renewOpen, setRenewOpen] = useState(false);
  const [newEndDate, setNewEndDate] = useState(() => new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10));
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminateNotes, setTerminateNotes] = useState('');

  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [inspectionType, setInspectionType] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().slice(0, 10));
  const [inspectionObservations, setInspectionObservations] = useState('');
  const [inspectionCondition, setInspectionCondition] = useState('');
  const [inspectorId, setInspectorId] = useState('');

  const [itemTarget, setItemTarget] = useState<string | null>(null);
  const [itemObservation, setItemObservation] = useState('');
  const [itemPhoto, setItemPhoto] = useState<File | null>(null);

  // Paiement d'échéance
  const [payTarget, setPayTarget] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('MOBILE_MONEY');

  if (loading && !contract) {
    return (
      <div className="py-20">
        <Spinner size="lg" label="Chargement du contrat..." className="flex-col" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/contrats')}>
          Retour à la liste
        </Button>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <ErrorState message={error} onRetry={reload} />
        </div>
      </div>
    );
  }

  if (!contract) return null;

  const run = async (action: () => Promise<unknown>, message: string, closeAll = true) => {
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
      if (closeAll) {
        setRenewOpen(false);
        setTerminateOpen(false);
        setInspectionOpen(false);
        setItemTarget(null);
        setPayTarget(null);
      }
    }
  };

  return (
    <div>
      <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/contrats')}>
        Retour à la liste
      </Button>

      <div className="mt-3">
        <PageHeader
          title={`Bail ${contract.reference}`}
          description={`${contract.property?.title ?? ''} — ${contract.tenant ? fullName(contract.tenant) : ''}`}
          actions={
            <>
              {contract.status === 'DRAFT' && (
                <>
                  <Button variant="danger" icon={<Ban className="h-4 w-4" />} onClick={() => run(() => contractsApi.cancel(contract.id), 'Contrat annulé.')}>Annuler</Button>
                  <Button icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => run(() => contractsApi.activate(contract.id), 'Bail activé : le bien est passé en « Loué » et les échéances ont été générées.')}>
                    Activer le contrat
                  </Button>
                </>
              )}
              {contract.status === 'ACTIVE' && (
                <>
                  <Button variant="danger" icon={<Ban className="h-4 w-4" />} onClick={() => setTerminateOpen(true)}>Résilier</Button>
                  <Button variant="secondary" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setRenewOpen(true)}>Renouveler</Button>
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
        {/* Informations du bail */}
        <Card>
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Conditions du bail</h2>
          <dl className="space-y-3 px-5 py-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Statut</span>
              <Badge className={leaseStatusBadgeClass[contract.status]}>{leaseStatusLabels[contract.status]}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Loyer mensuel</span>
              <span className="font-semibold text-slate-800">{formatPrice(contract.monthlyRent)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Caution</span>
              <span className="text-slate-700">{formatPrice(contract.depositAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Période</span>
              <span className="text-slate-700">{formatDate(contract.startDate)} → {formatDate(contract.endDate)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Échéance le</span>
              <span className="text-slate-700">{contract.paymentDay} du mois</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Signé le</span>
              <span className="text-slate-700">{contract.signedAt ? formatDate(contract.signedAt) : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Locataire</span>
              <Link to={`/clients/${contract.tenantId}`} className="font-medium text-blue-700 hover:underline">
                {contract.tenant ? fullName(contract.tenant) : '—'}
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Propriétaire</span>
              <Link to={`/proprietaires/${contract.ownerId}`} className="font-medium text-blue-700 hover:underline">
                {contract.owner ? fullName(contract.owner) : '—'}
              </Link>
            </div>
            <div>
              <span className="text-slate-500">Bien</span>
              <Link to={`/biens/${contract.propertyId}`} className="mt-1 block font-medium text-blue-700 hover:underline">
                {contract.property?.title}
              </Link>
            </div>
            {contract.notes && <p className="text-slate-600">{contract.notes}</p>}
          </dl>
        </Card>

        {/* Échéances de loyer */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="flex items-center gap-2 font-semibold text-slate-800"><Wallet className="h-4 w-4" /> Échéances de loyer ({contract.invoices?.length ?? 0})</h2>
          </div>
          {!contract.invoices || contract.invoices.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              Les échéances sont générées automatiquement à l'activation du bail.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Échéance</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Attendu</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Payé</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Restant</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Statut</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contract.invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-4 py-2.5 text-slate-700">{formatDate(invoice.dueDate)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{formatPrice(invoice.expectedAmount)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-emerald-700">{formatPrice(invoice.paidAmount)}</td>
                      <td className="px-4 py-2.5 text-right text-amber-700">{formatPrice(invoice.expectedAmount - invoice.paidAmount)}</td>
                      <td className="px-4 py-2.5"><Badge className={invoiceStatusBadgeClass[invoice.status]}>{invoiceStatusLabels[invoice.status]}</Badge></td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {invoice.status !== 'PAID' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => { setPayTarget(invoice.id); setPayAmount(String(invoice.expectedAmount - invoice.paidAmount)); }}
                            >
                              Encaisser
                            </Button>
                          )}
                          {invoice.receipt ? (
                            <a
                              href={receiptsDownloadUrl(invoice.receipt.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                              title={`Quittance ${invoice.receipt.reference}`}
                            >
                              <Download className="h-3.5 w-3.5" /> Quittance
                            </a>
                          ) : invoice.status === 'PAID' ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busy}
                              onClick={() => run(() => invoicesApi.createReceipt(invoice.id), 'Quittance générée.')}
                            >
                              Générer la quittance
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* États des lieux */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="flex items-center gap-2 font-semibold text-slate-800"><ClipboardCheck className="h-4 w-4" /> États des lieux</h2>
            <Button
              size="sm"
              variant="secondary"
              icon={<Plus className="h-4 w-4" />}
              disabled={busy}
              onClick={() => { setInspectionType('ENTRY'); setInspectionDate(new Date().toISOString().slice(0, 10)); setInspectionObservations(''); setInspectionCondition(''); setInspectionOpen(true); }}
            >
              Ajouter un état des lieux
            </Button>
          </div>
          {!contract.inspections || contract.inspections.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              Aucun état des lieux enregistré (entrée ou sortie).
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {contract.inspections.map((inspection) => (
                <li key={inspection.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">{inspectionTypeLabels[inspection.type]}</span>
                    <span className="text-xs text-slate-400">{formatDate(inspection.inspectionDate)}</span>
                  </div>
                  {inspection.condition && <p className="mt-1 text-sm text-slate-600">État du bien : {inspection.condition}</p>}
                  {inspection.generalObservations && <p className="text-sm text-slate-500">{inspection.generalObservations}</p>}
                  {inspection.inspector && <p className="mt-1 text-xs text-slate-400">Réalisé par {fullName(inspection.inspector)}</p>}

                  <ul className="mt-2 space-y-1.5">
                    {(inspection.items ?? []).map((item) => (
                      <li key={item.id} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        {item.photoUrl && (
                          <img src={item.photoUrl} alt="" className="h-10 w-10 rounded object-cover" />
                        )}
                        <span className="flex-1 text-slate-600">{item.observation}</span>
                        <button
                          type="button"
                          aria-label="Supprimer l'observation"
                          className="text-slate-400 hover:text-red-500"
                          onClick={() => run(() => contractsApi.deleteInspectionItem(item.id), 'Observation supprimée.', false)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="mt-2 text-xs font-medium text-blue-600 hover:underline"
                    onClick={() => { setItemTarget(inspection.id); setItemObservation(''); setItemPhoto(null); }}
                  >
                    + Ajouter une observation
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Historique */}
        <Card>
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Historique</h2>
          <ul className="divide-y divide-slate-100">
            {(audit.data ?? []).slice(0, 10).map((entry) => (
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

      {/* Modale de renouvellement */}
      <Modal
        open={renewOpen}
        onClose={() => setRenewOpen(false)}
        title="Renouveler le bail"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenewOpen(false)} disabled={busy}>Annuler</Button>
            <Button loading={busy} onClick={() => run(() => contractsApi.renew(contract.id, new Date(newEndDate).toISOString()), 'Bail renouvelé : nouvelles échéances générées.')}>
              Renouveler
            </Button>
          </>
        }
      >
        <Field label="Nouvelle date de fin" required>
          <Input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} />
        </Field>
      </Modal>

      {/* Modale de résiliation */}
      <Modal
        open={terminateOpen}
        onClose={() => setTerminateOpen(false)}
        title="Résilier le bail"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTerminateOpen(false)} disabled={busy}>Annuler</Button>
            <Button variant="danger" loading={busy} onClick={() => run(() => contractsApi.terminate(contract.id, terminateNotes || null), 'Bail résilié : le bien redevient disponible si aucune autre opération ne le bloque.')}>
              Résilier
            </Button>
          </>
        }
      >
        <Field label="Motif de résiliation">
          <Textarea rows={3} value={terminateNotes} onChange={(e) => setTerminateNotes(e.target.value)} placeholder="Ex. : départ du locataire, congé donné par le propriétaire..." />
        </Field>
      </Modal>

      {/* Modale d'état des lieux */}
      <Modal
        open={inspectionOpen}
        onClose={() => setInspectionOpen(false)}
        title="Nouvel état des lieux"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInspectionOpen(false)} disabled={busy}>Annuler</Button>
            <Button
              loading={busy}
              onClick={() => run(
                () => contractsApi.addInspection(contract.id, {
                  type: inspectionType,
                  inspectionDate: new Date(inspectionDate).toISOString(),
                  generalObservations: inspectionObservations || null,
                  condition: inspectionCondition || null,
                  inspectorId: inspectorId || null,
                }),
                'État des lieux enregistré. Ajoutez les observations détaillées si besoin.',
              )}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Type" required>
            <Select value={inspectionType} onChange={(e) => setInspectionType(e.target.value as 'ENTRY' | 'EXIT')}>
              {INSPECTION_TYPES.map((t) => (
                <option key={t} value={t}>{inspectionTypeLabels[t]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Date" required>
            <Input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} />
          </Field>
          <Field label="Réalisé par">
            <Select value={inspectorId} onChange={(e) => setInspectorId(e.target.value)}>
              <option value="">— Non renseigné —</option>
              {(agents.data ?? []).map((agent) => (
                <option key={agent.id} value={agent.id}>{fullName(agent)}</option>
              ))}
            </Select>
          </Field>
          <Field label="État général du bien">
            <Input value={inspectionCondition} onChange={(e) => setInspectionCondition(e.target.value)} placeholder="Ex. : bon état, quelques traces aux murs" />
          </Field>
          <Field label="Observations générales">
            <Textarea rows={3} value={inspectionObservations} onChange={(e) => setInspectionObservations(e.target.value)} />
          </Field>
        </div>
      </Modal>

      {/* Modale d'observation détaillée */}
      <Modal
        open={itemTarget !== null}
        onClose={() => setItemTarget(null)}
        title="Ajouter une observation"
        footer={
          <>
            <Button variant="secondary" onClick={() => setItemTarget(null)} disabled={busy}>Annuler</Button>
            <Button
              loading={busy}
              onClick={() => itemTarget && run(
                () => contractsApi.addInspectionItem(itemTarget, itemObservation, itemPhoto ?? undefined),
                'Observation ajoutée.',
              )}
            >
              Ajouter
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Observation" required>
            <Textarea rows={3} value={itemObservation} onChange={(e) => setItemObservation(e.target.value)} placeholder="Ex. : fissure au plafond du salon" />
          </Field>
          <Field label="Photo (facultatif)">
            <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setItemPhoto(e.target.files?.[0] ?? null)} />
          </Field>
        </div>
      </Modal>

      {/* Modale d'encaissement d'échéance */}
      <Modal
        open={payTarget !== null}
        onClose={() => setPayTarget(null)}
        title="Encaisser le loyer"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayTarget(null)} disabled={busy}>Annuler</Button>
            <Button
              loading={busy}
              onClick={() => payTarget && run(
                () => invoicesApi.pay(payTarget, { amount: Number(payAmount), paymentMethod: payMethod }),
                'Paiement enregistré : l\'échéance a été mise à jour.',
              )}
            >
              Enregistrer le paiement
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Un paiement partiel est possible : l'échéance passera en « Partiellement payé » jusqu'à règlement complet.
          </p>
          <Field label="Montant (FCFA)" required>
            <Input type="number" min="1" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          </Field>
          <Field label="Mode de paiement" required>
            <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>{paymentMethodLabels[method]}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function receiptsDownloadUrl(receiptId: string): string {
  return `/api/contracts/receipts/${receiptId}/download`;
}
