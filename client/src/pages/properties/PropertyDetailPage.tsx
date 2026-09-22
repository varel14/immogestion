import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  CheckCircle2,
  Download,
  FileText,
  ImagePlus,
  MapPin,
  Pencil,
  Star,
  Trash2,
  User,
} from 'lucide-react';
import { propertiesApi } from '../../api/properties.js';
import { getApiErrorMessage } from '../../api/client.js';
import { useAsync } from '../../hooks/useAsync.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card } from '../../components/ui/Card.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { ErrorState } from '../../components/ui/ErrorState.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { Alert } from '../../components/ui/Alert.js';
import { formatFileSize, formatPrice, formatSurface, fullName } from '../../utils/format.js';
import {
  propertyStatusBadgeClass,
  propertyStatusLabels,
  propertyTypeLabels,
  transactionTypeLabels,
} from '../../utils/labels.js';
import type { PropertyMedia } from '../../types/index.js';

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: property, loading, error, reload } = useAsync((signal) => propertiesApi.getById(id!), [id]);

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  if (loading && !property) {
    return (
      <div className="py-20">
        <Spinner size="lg" label="Chargement du bien..." className="flex-col" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/biens')}>
          Retour à la liste
        </Button>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <ErrorState message={error} onRetry={reload} />
        </div>
      </div>
    );
  }

  if (!property) return null;

  const photos = (property.media ?? []).filter((m) => m.kind === 'PHOTO');
  const documents = (property.media ?? []).filter((m) => m.kind === 'DOCUMENT');
  const primaryPhoto = photos.find((p) => p.isPrimary) ?? photos[0] ?? null;

  const handleUpload = async (files: FileList | null, kind: 'PHOTO' | 'DOCUMENT') => {
    if (!files || files.length === 0 || !property) return;
    setUploading(true);
    setPageError(null);
    try {
      const fileList = Array.from(files);
      if (kind === 'PHOTO') {
        await propertiesApi.uploadPhotos(property.id, fileList);
      } else {
        await propertiesApi.uploadDocuments(property.id, fileList);
      }
      setSuccessMessage(kind === 'PHOTO' ? 'Photos ajoutées avec succès.' : 'Documents ajoutés avec succès.');
      reload();
    } catch (err) {
      setPageError(getApiErrorMessage(err));
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (documentInputRef.current) documentInputRef.current.value = '';
    }
  };

  const handleSetPrimary = async (media: PropertyMedia) => {
    setPageError(null);
    try {
      await propertiesApi.setPrimaryPhoto(media.id);
      reload();
    } catch (err) {
      setPageError(getApiErrorMessage(err));
    }
  };

  const handleDeleteMedia = async (media: PropertyMedia) => {
    setPageError(null);
    try {
      await propertiesApi.deleteMedia(media.id);
      setSuccessMessage(media.kind === 'PHOTO' ? 'Photo supprimée.' : 'Document supprimé.');
      reload();
    } catch (err) {
      setPageError(getApiErrorMessage(err));
    }
  };

  const handleArchive = async () => {
    if (!property) return;
    setArchiveLoading(true);
    setPageError(null);
    try {
      await propertiesApi.setArchived(property.id, !property.isArchived);
      setArchiveOpen(false);
      setSuccessMessage(property.isArchived ? 'Bien désarchivé.' : 'Bien archivé.');
      reload();
    } catch (err) {
      setPageError(getApiErrorMessage(err));
      setArchiveOpen(false);
    } finally {
      setArchiveLoading(false);
    }
  };

  return (
    <div>
      <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/biens')}>
        Retour à la liste
      </Button>

      <div className="mt-3">
        <PageHeader
          title={property.title}
          description={`${property.reference} · Ajouté le ${new Date(property.createdAt).toLocaleDateString('fr-FR')}`}
          actions={
            <>
              <Button
                variant="secondary"
                icon={property.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                onClick={() => setArchiveOpen(true)}
              >
                {property.isArchived ? 'Désarchiver' : 'Archiver'}
              </Button>
              <Link to={`/biens/${property.id}/modifier`}>
                <Button icon={<Pencil className="h-4 w-4" />}>Modifier</Button>
              </Link>
            </>
          }
        />
      </div>

      {(pageError || successMessage) && (
        <div className="mb-4 space-y-2">
          {pageError && <Alert variant="error">{pageError}</Alert>}
          {successMessage && <Alert variant="success">{successMessage}</Alert>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          {/* Galerie */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h2 className="font-semibold text-slate-800">Galerie photos</h2>
              <Button
                size="sm"
                variant="secondary"
                loading={uploading}
                icon={<ImagePlus className="h-4 w-4" />}
                onClick={() => photoInputRef.current?.click()}
              >
                Ajouter des photos
              </Button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                hidden
                onChange={(e) => void handleUpload(e.target.files, 'PHOTO')}
              />
            </div>

            {photos.length === 0 ? (
              <EmptyState
                icon={<Building2 className="h-6 w-6" />}
                title="Aucune photo pour ce bien"
                description="Ajoutez des photos pour illustrer la fiche du bien."
              />
            ) : (
              <div className="p-5">
                <div className="relative mb-4 overflow-hidden rounded-lg bg-slate-100">
                  <img
                    src={primaryPhoto!.url}
                    alt={`Photo principale — ${property.title}`}
                    className="max-h-96 w-full object-cover"
                  />
                  <span className="absolute top-3 left-3">
                    <Badge className="bg-blue-600/90 text-white ring-blue-500/50">Photo principale</Badge>
                  </span>
                </div>
                {photos.length > 1 && (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {photos.map((photo) => (
                      <div key={photo.id} className="group relative overflow-hidden rounded-lg bg-slate-100">
                        <img src={photo.url} alt={photo.fileName} className="aspect-square w-full object-cover" />
                        {photo.isPrimary && (
                          <span className="absolute top-1.5 left-1.5 rounded bg-blue-600 p-1 text-white" title="Photo principale">
                            <Star className="h-3 w-3 fill-current" />
                          </span>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-slate-900/60 opacity-0 transition-opacity group-hover:opacity-100">
                          {!photo.isPrimary && (
                            <button
                              type="button"
                              onClick={() => void handleSetPrimary(photo)}
                              className="rounded-lg bg-white/90 p-1.5 text-slate-700 hover:bg-white"
                              title="Définir comme photo principale"
                              aria-label="Définir comme photo principale"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleDeleteMedia(photo)}
                            className="rounded-lg bg-white/90 p-1.5 text-red-600 hover:bg-white"
                            title="Supprimer la photo"
                            aria-label="Supprimer la photo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Description */}
          <Card>
            <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Description</h2>
            <p className="px-5 py-4 text-sm leading-relaxed whitespace-pre-line text-slate-600">
              {property.description || 'Aucune description renseignée pour ce bien.'}
            </p>
          </Card>

          {/* Documents */}
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h2 className="font-semibold text-slate-800">Documents</h2>
              <Button
                size="sm"
                variant="secondary"
                loading={uploading}
                icon={<FileText className="h-4 w-4" />}
                onClick={() => documentInputRef.current?.click()}
              >
                Ajouter des documents
              </Button>
              <input
                ref={documentInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpeg,.jpg,.png,.webp"
                multiple
                hidden
                onChange={(e) => void handleUpload(e.target.files, 'DOCUMENT')}
              />
            </div>
            {documents.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-6 w-6" />}
                title="Aucun document associé"
                description="Ajoutez les documents utiles : titre de propriété, plans, diagnostics..."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {documents.map((document) => (
                  <li key={document.id} className="flex items-center gap-3 px-5 py-3">
                    <FileText className="h-5 w-5 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-700">{document.fileName}</span>
                      <span className="text-xs text-slate-400">{formatFileSize(document.size)}</span>
                    </span>
                    <a
                      href={document.url}
                      download={document.fileName}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                      title="Télécharger"
                      aria-label={`Télécharger ${document.fileName}`}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleDeleteMedia(document)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Supprimer"
                      aria-label={`Supprimer ${document.fileName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Statut et prix */}
          <Card>
            <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Situation</h2>
            <div className="space-y-3 px-5 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Statut</span>
                <Badge className={propertyStatusBadgeClass[property.status]}>
                  {propertyStatusLabels[property.status]}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Type de bien</span>
                <span className="text-sm font-medium text-slate-700">{propertyTypeLabels[property.propertyType]}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Transaction</span>
                <span className="text-sm font-medium text-slate-700">{transactionTypeLabels[property.transactionType]}</span>
              </div>
              {(property.transactionType === 'SALE' || property.transactionType === 'SALE_AND_RENT') && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Prix de vente</span>
                  <span className="text-sm font-bold text-blue-700">{formatPrice(property.price)}</span>
                </div>
              )}
              {(property.transactionType === 'RENT' || property.transactionType === 'SALE_AND_RENT') && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Loyer mensuel</span>
                  <span className="text-sm font-bold text-blue-700">
                    {property.rentPrice !== null ? `${formatPrice(property.rentPrice)} / mois` : '—'}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Caractéristiques */}
          <Card>
            <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Caractéristiques</h2>
            <div className="grid grid-cols-3 gap-2 px-5 py-4 text-center">
              <div className="rounded-lg bg-slate-50 px-2 py-3">
                <p className="text-lg font-bold text-slate-800">{property.surfaceArea !== null ? formatSurface(property.surfaceArea) : '—'}</p>
                <p className="mt-0.5 text-xs text-slate-500">Surface</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-3">
                <p className="text-lg font-bold text-slate-800">{property.bedrooms ?? '—'}</p>
                <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-slate-500">
                  <BedDouble className="h-3 w-3" /> Ch.
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-3">
                <p className="text-lg font-bold text-slate-800">{property.bathrooms ?? '—'}</p>
                <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-slate-500">
                  <Bath className="h-3 w-3" /> SDB
                </p>
              </div>
            </div>
          </Card>

          {/* Localisation */}
          <Card>
            <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Localisation</h2>
            <div className="space-y-2 px-5 py-4 text-sm">
              <p className="flex items-start gap-2 text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>
                  {property.address || 'Adresse non renseignée'}
                  {(property.district || property.city) && (
                    <span className="block text-slate-500">
                      {[property.district, property.city].filter(Boolean).join(', ')}
                    </span>
                  )}
                </span>
              </p>
            </div>
          </Card>

          {/* Propriétaire */}
          <Card>
            <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Propriétaire</h2>
            <div className="px-5 py-4">
              {property.owner ? (
                <Link to={`/proprietaires/${property.owner.id}`} className="flex items-center gap-3 rounded-lg p-2 -m-2 transition-colors hover:bg-slate-50">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    <User className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-slate-800">{fullName(property.owner)}</span>
                    <span className="block text-xs text-blue-600">Voir la fiche du propriétaire</span>
                  </span>
                </Link>
              ) : (
                <p className="text-sm text-slate-400">Aucun propriétaire associé à ce bien.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={archiveOpen}
        title={property.isArchived ? 'Désarchiver ce bien' : 'Archiver ce bien'}
        message={
          property.isArchived
            ? 'Le bien redeviendra visible dans le catalogue actif.'
            : `Voulez-vous archiver « ${property.title} » ? Il ne apparaîtra plus dans le catalogue actif mais restera consultable.`
        }
        confirmLabel={property.isArchived ? 'Désarchiver' : 'Archiver'}
        danger={!property.isArchived}
        loading={archiveLoading}
        onConfirm={handleArchive}
        onCancel={() => setArchiveOpen(false)}
      />
    </div>
  );
}
