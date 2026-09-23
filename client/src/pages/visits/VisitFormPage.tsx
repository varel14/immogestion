import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { referenceApi, visitsApi } from '../../api/commercial.js';
import { getApiErrorMessage } from '../../api/client.js';
import { useAsync } from '../../hooks/useAsync.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.js';
import { Alert } from '../../components/ui/Alert.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { ErrorState } from '../../components/ui/ErrorState.js';
import { fullName } from '../../utils/format.js';

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function VisitFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const clients = useAsync(() => referenceApi.clients(), []);
  const properties = useAsync(() => referenceApi.properties(), []);
  const agents = useAsync(() => referenceApi.agents(), []);
  const existing = useAsync((signal) => (id ? visitsApi.getById(id) : Promise.resolve(undefined)), [id]);

  const [propertyId, setPropertyId] = useState(searchParams.get('propertyId') ?? '');
  const [clientId, setClientId] = useState(searchParams.get('clientId') ?? '');
  const [agentId, setAgentId] = useState('');
  const [scheduledAt, setScheduledAt] = useState(toLocalInputValue(new Date(Date.now() + 86400000)));
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isEdit && existing.data) {
      setPropertyId(existing.data.propertyId);
      setClientId(existing.data.clientId);
      setAgentId(existing.data.agentId);
      setScheduledAt(toLocalInputValue(new Date(existing.data.scheduledAt)));
      setNotes(existing.data.notes ?? '');
    } else if (!isEdit) {
      const defaultAgent = agents.data?.[0]?.id;
      if (defaultAgent && !agentId) setAgentId(defaultAgent);
    }
  }, [isEdit, existing.data, agents.data]);

  if (isEdit && existing.loading && !existing.data) {
    return (
      <div className="py-20">
        <Spinner size="lg" label="Chargement de la visite..." className="flex-col" />
      </div>
    );
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    if (!propertyId) return setSubmitError('Veuillez sélectionner un bien.');
    if (!clientId) return setSubmitError('Veuillez sélectionner un client.');
    if (!agentId) return setSubmitError("Veuillez sélectionner un agent.");

    const payload = {
      propertyId,
      clientId,
      agentId,
      scheduledAt: new Date(scheduledAt).toISOString(),
      notes: notes.trim() === '' ? null : notes.trim(),
    };
    try {
      if (isEdit && id) {
        await visitsApi.update(id, payload);
        navigate(`/visites/${id}`);
      } else {
        const created = await visitsApi.create(payload);
        navigate(`/visites/${created.id}`);
      }
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    }
  };

  return (
    <div>
      <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate(-1)}>
        Retour
      </Button>

      <div className="mt-3">
        <PageHeader
          title={isEdit ? 'Modifier la visite' : 'Programmer une visite'}
          description="Associez un client, un bien et un agent, puis fixez la date de la visite."
        />
      </div>

      {submitError && (
        <div className="mb-4">
          <Alert variant="error">{submitError}</Alert>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <Card>
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Informations de la visite</h2>
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            <Field label="Bien à visiter" required className="sm:col-span-2">
              <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                <option value="">— Sélectionner un bien —</option>
                {(properties.data ?? []).map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title} ({property.reference}){property.city ? ` — ${property.city}` : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Client" required>
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">— Sélectionner un client —</option>
                {(clients.data ?? []).map((client) => (
                  <option key={client.id} value={client.id}>{fullName(client)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Agent en charge" required>
              <Select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                <option value="">— Sélectionner un agent —</option>
                {(agents.data ?? []).map((agent) => (
                  <option key={agent.id} value={agent.id}>{fullName(agent)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Date et heure" required>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea rows={3} placeholder="Consignes pour la visite, point de rendez-vous..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        </Card>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate(-1)}>Annuler</Button>
          <Button type="submit" icon={<Save className="h-4 w-4" />}>
            {isEdit ? 'Enregistrer les modifications' : 'Programmer la visite'}
          </Button>
        </div>
      </form>
    </div>
  );
}
