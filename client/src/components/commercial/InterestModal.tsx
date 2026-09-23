import { useState } from 'react';
import { referenceApi, interestsApi } from '../../api/commercial.js';
import { getApiErrorMessage } from '../../api/client.js';
import { useAsync } from '../../hooks/useAsync.js';
import { Modal } from '../ui/Modal.js';
import { Button } from '../ui/Button.js';
import { Field, Select, Textarea } from '../ui/Field.js';
import { Alert } from '../ui/Alert.js';
import { fullName } from '../../utils/format.js';
import { INTEREST_TRANSACTION_TYPES } from '../../types/index.js';
import type { InterestTransactionType } from '../../types/index.js';
import { interestTransactionLabels } from '../../utils/labels.js';

interface InterestModalProps {
  open: boolean;
  onClose: () => void;
  /** Pré-renseigné lorsque la modale est ouverte depuis une fiche client. */
  clientId?: string;
  /** Pré-renseigné lorsque la modale est ouverte depuis une fiche bien. */
  propertyId?: string;
  onCreated: () => void;
}

/** Enregistrement de l'intérêt d'un client pour un bien. */
export function InterestModal({ open, onClose, clientId: presetClientId, propertyId: presetPropertyId, onCreated }: InterestModalProps) {
  const clients = useAsync(() => referenceApi.clients(), []);
  const properties = useAsync(() => referenceApi.properties(), []);

  const [clientId, setClientId] = useState(presetClientId ?? '');
  const [propertyId, setPropertyId] = useState(presetPropertyId ?? '');
  const [transactionType, setTransactionType] = useState<InterestTransactionType>('SALE');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const effectiveClientId = presetClientId ?? clientId;
  const effectivePropertyId = presetPropertyId ?? propertyId;

  const handleCreate = async () => {
    setError(null);
    if (!effectiveClientId) {
      setError('Veuillez sélectionner un client.');
      return;
    }
    if (!effectivePropertyId) {
      setError('Veuillez sélectionner un bien.');
      return;
    }
    setBusy(true);
    try {
      await interestsApi.create({ clientId: effectiveClientId, propertyId: effectivePropertyId, transactionType, notes: notes || null });
      onCreated();
      onClose();
      setNotes('');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enregistrer un intérêt"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Annuler</Button>
          <Button loading={busy} onClick={handleCreate}>Enregistrer</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {!presetClientId && (
          <Field label="Client" required>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">— Sélectionner un client —</option>
              {(clients.data ?? []).map((client) => (
                <option key={client.id} value={client.id}>{fullName(client)}</option>
              ))}
            </Select>
          </Field>
        )}
        {!presetPropertyId && (
          <Field label="Bien" required>
            <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              <option value="">— Sélectionner un bien —</option>
              {(properties.data ?? []).map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title} ({property.reference})
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Type de transaction" required hint="Indique si le client souhaite acheter ou louer ce bien.">
          <Select value={transactionType} onChange={(e) => setTransactionType(e.target.value as InterestTransactionType)}>
            {INTEREST_TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>{interestTransactionLabels[t]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Notes">
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Précisions sur le souhait du client..." />
        </Field>
      </div>
    </Modal>
  );
}
