import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Plus, Wallet } from 'lucide-react';
import { paymentsApi, type ListPaymentsParams } from '../../api/transactions.js';
import { referenceApi } from '../../api/commercial.js';
import { getApiErrorMessage } from '../../api/client.js';
import { toast } from '../../utils/toast.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { SearchInput } from '../../components/ui/SearchInput.js';
import { Field, Input, Select } from '../../components/ui/Field.js';
import { Badge } from '../../components/ui/Badge.js';
import { TableWrap, THead, TH, TBody, TR, TD, TableSkeleton } from '../../components/ui/Table.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { ErrorState } from '../../components/ui/ErrorState.js';
import { Pagination } from '../../components/ui/Pagination.js';
import { Modal } from '../../components/ui/Modal.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { formatDate, formatPrice, fullName } from '../../utils/format.js';
import {
  paymentMethodLabels, paymentStatusBadgeClass, paymentStatusLabels, paymentTypeLabels,
} from '../../utils/labels.js';
import { PAYMENT_METHODS, PAYMENT_STATUSES, PAYMENT_TYPES } from '../../types/index.js';
import type { Payment } from '../../types/index.js';

const PAGE_SIZE = 10;

export function PaymentListPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);

  const [createOpen, setCreateOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Payment | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Formulaire de création manuelle
  const [formError, setFormError] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'DEPOSIT' | 'OTHER'>('OTHER');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');

  const clients = useAsync(() => referenceApi.clients(), []);

  const { data, loading, error, reload } = useAsync((signal) => {
    const params: ListPaymentsParams = { page, pageSize: PAGE_SIZE };
    if (debouncedSearch) params.search = debouncedSearch;
    if (type) params.paymentType = type;
    if (method) params.paymentMethod = method;
    if (status) params.status = status;
    return paymentsApi.list(params);
  }, [debouncedSearch, type, method, status, page]);

  const handleCreate = async () => {
    setFormError(null);
    if (!clientId) return setFormError('Veuillez sélectionner un client.');
    if (!amount || Number(amount) <= 0) return setFormError('Veuillez renseigner un montant valide.');
    setBusy(true);
    try {
      await paymentsApi.createManual({
        clientId,
        amount: Number(amount),
        paymentType,
        paymentMethod,
        paymentDate: new Date(paymentDate).toISOString(),
        transactionReference: transactionReference || null,
        notes: notes || null,
      });
      toast.success('Le paiement a été enregistré.');
      setCreateOpen(false);
      setClientId(''); setAmount(''); setTransactionReference(''); setNotes('');
      reload();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setBusy(true);
    setActionError(null);
    try {
      await paymentsApi.cancel(cancelTarget.id, 'Annulé depuis la liste des paiements');
      toast.success('Le paiement a été annulé : les montants dus ont été recalculés.');
      setCancelTarget(null);
      reload();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
      setCancelTarget(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Paiements"
        description="Historique de tous les paiements : loyers, ventes, cautions et autres frais."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Enregistrement manuel
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Rechercher (référence, client...)" />
        <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Filtrer par type">
          <option value="">Tous les types</option>
          {PAYMENT_TYPES.map((t) => (
            <option key={t} value={t}>{paymentTypeLabels[t]}</option>
          ))}
        </Select>
        <Select value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }} aria-label="Filtrer par mode">
          <option value="">Tous les modes</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>{paymentMethodLabels[m]}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filtrer par statut">
          <option value="">Tous les statuts</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{paymentStatusLabels[s]}</option>
          ))}
        </Select>
      </div>

      {actionError && (
        <div className="mb-4">
          <ErrorState message={actionError} onRetry={reload} />
        </div>
      )}

      {loading && !data ? (
        <TableSkeleton rows={8} cols={6} />
      ) : error ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon={<Wallet className="h-6 w-6" />}
            title="Aucun paiement enregistré"
            description="Les loyers encaissés et les versements de vente apparaîtront ici."
          />
        </div>
      ) : (
        <>
          <TableWrap>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Référence</TH>
                <TH>Client</TH>
                <TH>Type</TH>
                <TH>Montant</TH>
                <TH>Mode</TH>
                <TH>Date</TH>
                <TH>Statut</TH>
                <TH className="w-12" />
              </TR>
            </THead>
            <TBody>
              {data.data.map((payment) => (
                <TR key={payment.id}>
                  <TD className="font-medium text-slate-800">{payment.reference}</TD>
                  <TD>
                    <Link to={`/clients/${payment.clientId}`} className="hover:text-blue-700">
                      {payment.client ? fullName(payment.client) : '—'}
                    </Link>
                  </TD>
                  <TD>
                    {paymentTypeLabels[payment.paymentType]}
                    {payment.sale && (
                      <Link to={`/ventes/${payment.sale.id}`} className="ml-1 text-xs text-blue-600 hover:underline">
                        ({payment.sale.reference})
                      </Link>
                    )}
                    {payment.invoice?.contract && (
                      <Link to={`/contrats/${payment.invoice.contract.id}`} className="ml-1 text-xs text-blue-600 hover:underline">
                        ({payment.invoice.contract.reference})
                      </Link>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap font-semibold">{formatPrice(payment.amount)}</TD>
                  <TD>{paymentMethodLabels[payment.paymentMethod]}</TD>
                  <TD className="whitespace-nowrap text-slate-500">{formatDate(payment.paymentDate)}</TD>
                  <TD>
                    <Badge className={paymentStatusBadgeClass[payment.status]}>{paymentStatusLabels[payment.status]}</Badge>
                  </TD>
                  <TD>
                    {payment.status === 'CONFIRMED' && payment.paymentType !== 'SALE' && (
                      <button
                        type="button"
                        aria-label="Annuler le paiement"
                        title="Annuler ce paiement"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        onClick={() => setCancelTarget(payment)}
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
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

      {/* Modale d'enregistrement manuel */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Enregistrement manuel d'un paiement"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={busy}>Annuler</Button>
            <Button loading={busy} onClick={handleCreate}>Enregistrer</Button>
          </>
        }
      >
        {formError && <div className="mb-4"><ErrorState message={formError} /></div>}
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Pour un loyer, utilisez l'action « Encaisser » sur l'échéance du contrat. Pour une vente, utilisez la fiche de la vente.
          </p>
          <Field label="Client" required>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">— Sélectionner un client —</option>
              {(clients.data ?? []).map((client) => (
                <option key={client.id} value={client.id}>{fullName(client)}</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Montant (FCFA)" required>
              <Input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Type" required>
              <Select value={paymentType} onChange={(e) => setPaymentType(e.target.value as 'DEPOSIT' | 'OTHER')}>
                <option value="OTHER">Autre frais</option>
                <option value="DEPOSIT">Caution</option>
              </Select>
            </Field>
            <Field label="Mode de paiement" required>
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{paymentMethodLabels[m]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Date de paiement" required>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Référence de transaction">
            <Input value={transactionReference} onChange={(e) => setTransactionReference(e.target.value)} placeholder="N° de reçu, référence bancaire..." />
          </Field>
          <Field label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Objet du paiement..." />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={cancelTarget !== null}
        title="Annuler ce paiement ?"
        message={`Le paiement ${cancelTarget?.reference ?? ''} sera marqué comme annulé. L'historique est conservé et les montants dus seront recalculés.`}
        confirmLabel="Annuler le paiement"
        danger
        loading={busy}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
