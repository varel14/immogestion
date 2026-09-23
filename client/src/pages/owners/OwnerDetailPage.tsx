import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, ChevronRight, Mail, MapPin, Pencil, Phone, User } from 'lucide-react';
import { ownersApi } from '../../api/owners.js';
import { useAsync } from '../../hooks/useAsync.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { ErrorState } from '../../components/ui/ErrorState.js';
import { Badge } from '../../components/ui/Badge.js';
import { formatDate, formatPrice, fullName, initials } from '../../utils/format.js';
import { OwnerHistorySections } from '../../components/commercial/HistorySections.js';
import { propertyStatusBadgeClass, propertyStatusLabels } from '../../utils/labels.js';

export function OwnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const owner = useAsync((signal) => ownersApi.getById(id!), [id]);
  const properties = useAsync((signal) => ownersApi.getProperties(id!), [id]);

  if (owner.loading && !owner.data) {
    return (
      <div className="py-20">
        <Spinner size="lg" label="Chargement du propriétaire..." className="flex-col" />
      </div>
    );
  }

  if (owner.error) {
    return (
      <div>
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/proprietaires')}>
          Retour à la liste
        </Button>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <ErrorState message={owner.error} onRetry={owner.reload} />
        </div>
      </div>
    );
  }

  if (!owner.data) return null;

  const ownerData = owner.data;

  return (
    <div>
      <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/proprietaires')}>
        Retour à la liste
      </Button>

      <div className="mt-3">
        <PageHeader
          title={fullName(ownerData)}
          description={`Propriétaire depuis le ${formatDate(ownerData.createdAt)}`}
          actions={
            <Link to={`/proprietaires/${ownerData.id}/modifier`}>
              <Button icon={<Pencil className="h-4 w-4" />}>Modifier</Button>
            </Link>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Informations personnelles */}
        <Card className="h-fit lg:col-span-1">
          <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-lg font-semibold text-violet-600">
              {initials(ownerData)}
            </span>
            <div>
              <p className="font-semibold text-slate-800">{fullName(ownerData)}</p>
              <p className="text-xs text-slate-400">Propriétaire</p>
            </div>
          </div>
          <dl className="space-y-3 px-5 py-4 text-sm">
            <div className="flex items-start gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-400">Téléphone</dt>
                <dd className="text-slate-700">{ownerData.phone ?? 'Non renseigné'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-400">Email</dt>
                <dd className="break-all text-slate-700">{ownerData.email ?? 'Non renseigné'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-400">Adresse</dt>
                <dd className="text-slate-700">{ownerData.address ?? 'Non renseignée'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-400">N° d'identification</dt>
                <dd className="text-slate-700">{ownerData.identificationNumber ?? 'Non renseigné'}</dd>
              </div>
            </div>
          </dl>
          {ownerData.notes && (
            <div className="border-t border-slate-100 px-5 py-4">
              <p className="mb-1 text-xs font-medium text-slate-400">Notes</p>
              <p className="text-sm whitespace-pre-line text-slate-600">{ownerData.notes}</p>
            </div>
          )}
        </Card>

        {/* Biens du propriétaire */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h2 className="font-semibold text-slate-800">Biens de ce propriétaire</h2>
              {properties.data && (
                <Badge className="bg-blue-50 text-blue-700 ring-blue-600/20">
                  {properties.data.length} bien{properties.data.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {properties.loading && !properties.data ? (
              <div className="py-10">
                <Spinner label="Chargement des biens..." />
              </div>
            ) : properties.error ? (
              <ErrorState message={properties.error} onRetry={properties.reload} />
            ) : !properties.data || properties.data.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-400">
                Ce propriétaire ne possède aucun bien pour le moment.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {properties.data.map((property) => (
                  <li key={property.id}>
                    <Link to={`/biens/${property.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50">
                      <span className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                        {property.primaryPhotoUrl ? (
                          <img src={property.primaryPhotoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Building2 className="h-5 w-5 text-slate-300" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">{property.title}</span>
                        <span className="text-xs text-slate-400">
                          {property.reference} · {property.city ?? 'Ville non renseignée'}
                        </span>
                      </span>
                      <span className="hidden text-sm font-semibold text-blue-700 sm:block">
                        {property.price !== null && formatPrice(property.price)}
                        {property.rentPrice !== null && `${formatPrice(property.rentPrice)} / mois`}
                        {property.price === null && property.rentPrice === null && '—'}
                      </span>
                      <Badge className={propertyStatusBadgeClass[property.status]}>
                        {propertyStatusLabels[property.status]}
                      </Badge>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <OwnerHistorySections ownerId={ownerData.id} />
    </div>
  );
}
