import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileSignature, Save } from 'lucide-react';
import { contractsApi } from '../../api/transactions.js';
import { getApiErrorMessage } from '../../api/client.js';
import { useAsync } from '../../hooks/useAsync.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.js';
import { Alert } from '../../components/ui/Alert.js';
import { fullName } from '../../utils/format.js';

export function ContractFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceType = (searchParams.get('sourceType') ?? 'REQUEST') as 'REQUEST' | 'RESERVATION';
  const sourceId = searchParams.get('sourceId') ?? '';
  const presetRent = searchParams.get('amount');

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10));
  const [monthlyRent, setMonthlyRent] = useState(presetRent ?? '');
  const [depositAmount, setDepositAmount] = useState(presetRent ?? '');
  const [paymentDay, setPaymentDay] = useState('5');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    if (!sourceId) {
      setSubmitError('Aucune source valide : ouvrez une demande acceptée ou une réservation active pour créer un contrat.');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setSubmitError('La date de fin de bail doit être postérieure à la date de début.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await contractsApi.create({
        sourceType,
        sourceId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        monthlyRent: monthlyRent.trim() === '' ? undefined : Number(monthlyRent),
        depositAmount: depositAmount.trim() === '' ? undefined : Number(depositAmount),
        paymentDay: Number(paymentDay),
        notes: notes.trim() === '' ? null : notes.trim(),
      });
      navigate(`/contrats/${created.id}`);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate(-1)}>
        Retour
      </Button>

      <div className="mt-3">
        <PageHeader
          title="Nouveau contrat de location"
          description="Définissez le bail : durée, loyer, caution et jour d'échéance. L'activation créera automatiquement les échéances de loyer."
        />
      </div>

      {submitError && (
        <div className="mb-4">
          <Alert variant="error">{submitError}</Alert>
        </div>
      )}

      {!sourceId && (
        <div className="mb-4">
          <Alert variant="info">
            Ouvrez une demande de location acceptée ou une réservation active puis utilisez l'action de création de contrat.
          </Alert>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <Card>
          <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">
            <FileSignature className="h-4 w-4" />
            Conditions du bail
          </h2>
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            <Field label="Date de début" required>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="Date de fin" required>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
            <Field label="Loyer mensuel (FCFA)" required hint="Pré-rempli depuis la demande ou le bien.">
              <Input type="number" min="1" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} placeholder="Ex. : 510000" />
            </Field>
            <Field label="Caution (FCFA)" hint="Souvent égale à un mois de loyer.">
              <Input type="number" min="0" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="Ex. : 510000" />
            </Field>
            <Field label="Jour d'échéance du loyer" hint="Jour du mois compris entre 1 et 28.">
              <Select value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </Select>
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea rows={3} placeholder="Particularités du bail, clauses..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        </Card>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate(-1)}>Annuler</Button>
          <Button type="submit" loading={submitting} icon={<Save className="h-4 w-4" />} disabled={!sourceId}>
            Créer le contrat
          </Button>
        </div>
      </form>
    </div>
  );
}
