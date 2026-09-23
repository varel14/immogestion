import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Save } from 'lucide-react';
import { referenceApi, requestsApi } from '../../api/commercial.js';
import { getApiErrorMessage } from '../../api/client.js';
import { useAsync } from '../../hooks/useAsync.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.js';
import { Alert } from '../../components/ui/Alert.js';
import { fullName } from '../../utils/format.js';
import { REQUEST_TYPES, type RequestType } from '../../types/index.js';
import { requestTypeLabels } from '../../utils/labels.js';

export function RequestFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const clients = useAsync(() => referenceApi.clients(), []);
  const properties = useAsync(() => referenceApi.properties(), []);

  const [clientId, setClientId] = useState(searchParams.get('clientId') ?? '');
  const [propertyId, setPropertyId] = useState(searchParams.get('propertyId') ?? '');
  const [type, setType] = useState<RequestType>('PURCHASE');
  const [proposedAmount, setProposedAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    if (!clientId) return setSubmitError('Veuillez sélectionner un client.');
    if (!propertyId) return setSubmitError('Veuillez sélectionner un bien.');

    setSubmitting(true);
    try {
      const created = await requestsApi.create({
        clientId,
        propertyId,
        type,
        proposedAmount: proposedAmount.trim() === '' ? null : Number(proposedAmount),
        notes: notes.trim() === '' ? null : notes.trim(),
      });
      navigate(`/demandes/${created.id}`);
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
          title="Nouvelle demande"
          description="Enregistrez la demande d'achat ou de location d'un client sur un bien."
        />
      </div>

      {submitError && (
        <div className="mb-4">
          <Alert variant="error">{submitError}</Alert>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <Card>
          <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">
            <ClipboardList className="h-4 w-4" />
            Détails de la demande
          </h2>
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            <Field label="Client" required>
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">— Sélectionner un client —</option>
                {(clients.data ?? []).map((client) => (
                  <option key={client.id} value={client.id}>{fullName(client)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Bien concerné" required>
              <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                <option value="">— Sélectionner un bien —</option>
                {(properties.data ?? []).map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title} ({property.reference}){property.city ? ` — ${property.city}` : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Type de demande" required>
              <Select value={type} onChange={(e) => setType(e.target.value as RequestType)}>
                {REQUEST_TYPES.map((t) => (
                  <option key={t} value={t}>{requestTypeLabels[t]}</option>
                ))}
              </Select>
            </Field>
            <Field
              label="Montant proposé (FCFA)"
              hint={type === 'PURCHASE' ? "Montant que le client propose pour l'achat." : 'Loyer mensuel souhaité.'}
            >
              <Input type="number" min="0" placeholder="Ex. : 185000000" value={proposedAmount} onChange={(e) => setProposedAmount(e.target.value)} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea rows={3} placeholder="Contexte, conditions, observations..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        </Card>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate(-1)}>Annuler</Button>
          <Button type="submit" loading={submitting} icon={<Save className="h-4 w-4" />}>Déposer la demande</Button>
        </div>
      </form>
    </div>
  );
}
