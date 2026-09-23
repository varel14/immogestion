import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, MapPin, Pencil, Phone, Plus, User } from 'lucide-react';
import { clientsApi } from '../../api/clients.js';
import { useAsync } from '../../hooks/useAsync.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { ErrorState } from '../../components/ui/ErrorState.js';
import { Badge } from '../../components/ui/Badge.js';
import { Alert } from '../../components/ui/Alert.js';
import { formatDate, fullName, initials } from '../../utils/format.js';
import { ClientHistorySections } from '../../components/commercial/HistorySections.js';
import { InterestModal } from '../../components/commercial/InterestModal.js';

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [interestOpen, setInterestOpen] = useState(false);

  const { data: client, loading, error, reload } = useAsync((signal) => clientsApi.getById(id!), [id]);

  if (loading && !client) {
    return (
      <div className="py-20">
        <Spinner size="lg" label="Chargement du client..." className="flex-col" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/clients')}>
          Retour à la liste
        </Button>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <ErrorState message={error} onRetry={reload} />
        </div>
      </div>
    );
  }

  if (!client) return null;

  return (
    <div>
      <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/clients')}>
        Retour à la liste
      </Button>

      <div className="mt-3">
        <PageHeader
          title={fullName(client)}
          description={`Client depuis le ${formatDate(client.createdAt)}`}
          actions={
            <>
              <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setInterestOpen(true)}>
                Enregistrer un intérêt
              </Button>
              <button
                type="button"
                onClick={() => navigate(`/clients/${client.id}/modifier`)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                <Pencil className="h-4 w-4" />
                Modifier
              </button>
            </>
          }
        />
      </div>

      {!client.isActive && (
        <div className="mb-4">
          <Alert variant="info">Ce client est archivé. Restaurez-le depuis la liste pour le réactiver.</Alert>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="font-semibold text-slate-800">Coordonnées</h2>
            {client.isActive ? (
              <Badge className="bg-emerald-100 text-emerald-700 ring-emerald-600/20">Actif</Badge>
            ) : (
              <Badge className="bg-slate-200 text-slate-600 ring-slate-500/20">Archivé</Badge>
            )}
          </div>
          <dl className="space-y-3 px-5 py-4 text-sm">
            <div className="flex items-start gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-400">Téléphone</dt>
                <dd className="text-slate-700">{client.phone ?? 'Non renseigné'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-400">Email</dt>
                <dd className="break-all text-slate-700">{client.email ?? 'Non renseigné'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-400">Adresse</dt>
                <dd className="text-slate-700">{client.address ?? 'Non renseignée'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-400">N° d'identification</dt>
                <dd className="text-slate-700">{client.identificationNumber ?? 'Non renseigné'}</dd>
              </div>
            </div>
          </dl>
          <div className="border-t border-slate-100 px-5 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-600">
              {initials(client)}
            </span>
          </div>
        </Card>

        <Card>
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Notes</h2>
          <p className="px-5 py-4 text-sm whitespace-pre-line text-slate-600">
            {client.notes || 'Aucune note enregistrée pour ce client.'}
          </p>
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
            <p>Fiche créée le {formatDate(client.createdAt)}</p>
            <p>Dernière modification le {formatDate(client.updatedAt)}</p>
          </div>
        </Card>
      </div>

      <ClientHistorySections clientId={client.id} />

      <InterestModal
        open={interestOpen}
        onClose={() => setInterestOpen(false)}
        clientId={client.id}
        onCreated={reload}
      />
    </div>
  );
}
