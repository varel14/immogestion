import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, HandCoins, Save } from 'lucide-react';
import { referenceApi } from '../../api/commercial.js';
import { salesApi } from '../../api/transactions.js';
import { getApiErrorMessage } from '../../api/client.js';
import { useAsync } from '../../hooks/useAsync.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.js';
import { Alert } from '../../components/ui/Alert.js';
import { fullName } from '../../utils/format.js';

/**
 * Création d'une vente depuis une demande acceptée ou une réservation active.
 * L'identifiant de la source est passé dans l'URL (?sourceType=&sourceId=)
 * depuis la fiche d'une demande ou d'une réservation.
 */
export function SaleFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceType = (searchParams.get('sourceType') ?? 'REQUEST') as 'REQUEST' | 'RESERVATION';
  const sourceId = searchParams.get('sourceId') ?? '';
  const presetPrice = searchParams.get('amount');

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState('');
  const [salePrice, setSalePrice] = useState(presetPrice ?? '');
  const [saleDate, setSaleDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const agents = useAsync(() => referenceApi.agents(), []);

  useEffect(() => {
    if (agents.data && agents.data.length > 0 && !agentId) {
      setAgentId(agents.data[0].id);
    }
  }, [agents.data, agentId]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    if (!sourceId) {
      setSubmitError('Aucune source valide : ouvrez une demande acceptée ou une réservation active pour créer une vente.');
      return;
    }
    if (!agentId) {
      setSubmitError("Veuillez sélectionner l'agent responsable.");
      return;
    }
    if (salePrice.trim() === '' || Number(salePrice) <= 0) {
      setSubmitError('Veuillez renseigner le prix final de la vente.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await salesApi.create({
        sourceType,
        sourceId,
        agentId,
        salePrice: Number(salePrice),
        saleDate: saleDate ? new Date(saleDate).toISOString() : null,
        notes: notes.trim() === '' ? null : notes.trim(),
      });
      navigate(`/ventes/${created.id}`);
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
          title="Nouvelle vente"
          description="Transformez une demande acceptée ou une réservation en transaction de vente."
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
            Ouvrez une demande acceptée ou une réservation active puis utilisez l'action de création de vente.
          </Alert>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <Card>
          <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">
            <HandCoins className="h-4 w-4" />
            Conditions de la vente
          </h2>
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            <Field label="Source" hint={`Type : ${sourceType === 'RESERVATION' ? 'Réservation' : 'Demande acceptée'}`}>
              <Input value={sourceId ? (sourceType === 'RESERVATION' ? 'Réservation sélectionnée' : 'Demande sélectionnée') : 'Aucune source'} disabled />
            </Field>
            <Field label="Agent responsable" required>
              <Select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                <option value="">— Sélectionner un agent —</option>
                {(agents.data ?? []).map((agent) => (
                  <option key={agent.id} value={agent.id}>{fullName(agent)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Prix final de la vente (FCFA)" required>
              <Input type="number" min="1" placeholder="Ex. : 189500000" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            </Field>
            <Field label="Date de vente prévue">
              <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea rows={3} placeholder="Conditions suspensives, observations..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        </Card>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate(-1)}>Annuler</Button>
          <Button type="submit" loading={submitting} icon={<Save className="h-4 w-4" />} disabled={!sourceId}>
            Créer la vente
          </Button>
        </div>
      </form>
    </div>
  );
}
