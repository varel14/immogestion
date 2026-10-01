import { useMemo, useState } from 'react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Bath, BedDouble, Building2, CalendarDays, CheckCircle2, Clock,
  MapPin, Phone, Ruler, Tag,
} from 'lucide-react';
import { portalApi, type PortalClient, type PortalListing } from '../../api/portal.js';
import { useClientAuth } from '../../auth/ClientAuthContext.js';
import { getApiErrorMessage } from '../../api/client.js';
import { useAsync } from '../../hooks/useAsync.js';
import { formatPrice, formatSurface } from '../../utils/format.js';
import { propertyTypeLabels } from '../../utils/labels.js';
import { Alert } from '../../components/ui/Alert.js';
import { Button } from '../../components/ui/Button.js';
import { Field, Input, Textarea } from '../../components/ui/Field.js';
import { Spinner } from '../../components/ui/Spinner.js';

// ─── Formulaire de demande de visite ─────────────────────────────────────────

const visitFormSchema = z
  .object({
    firstName: z.string().trim().min(1, 'Le prénom est obligatoire.'),
    lastName: z.string().trim().min(1, 'Le nom est obligatoire.'),
    email: z.email('Adresse email invalide.'),
    phone: z.string().trim().min(6, 'Le numéro de téléphone est obligatoire.'),
    preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choisissez une date de visite.'),
    preferredTime: z.string().regex(/^\d{2}:\d{2}$/, 'Choisissez une heure de visite.'),
    message: z.string().trim().max(1000).optional(),
  })
  .refine(
    (values) => {
      const date = new Date(`${values.preferredDate}T${values.preferredTime}:00`);
      return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
    },
    { message: 'La visite doit être planifiée à une date future.', path: ['preferredDate'] },
  );

type VisitForm = z.infer<typeof visitFormSchema>;

/** Créneaux proposés, par tranches de 30 minutes de 8 h à 18 h. */
const TIME_SLOTS = (() => {
  const slots: string[] = [];
  for (let minutes = 8 * 60; minutes <= 18 * 60; minutes += 30) {
    slots.push(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
  }
  return slots;
})();

function tomorrowIsoDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function formatDateLong(isoDate: string, time: string): string {
  const date = new Date(`${isoDate}T${time}:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

interface BookingCardProps {
  listing: PortalListing;
}

function BookingCard({ listing }: BookingCardProps) {
  const { client } = useClientAuth();
  const [booked, setBooked] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VisitForm>({
    resolver: zodResolver(visitFormSchema),
    defaultValues: {
      firstName: client?.firstName ?? '',
      lastName: client?.lastName ?? '',
      email: client?.email ?? '',
      phone: client?.phone ?? '',
      preferredDate: '',
      preferredTime: '10:00',
      message: '',
    },
  });

  const watchedDate = watch('preferredDate');
  const watchedTime = watch('preferredTime');

  const onSubmit = async (values: VisitForm) => {
    setSubmitError(null);
    try {
      await portalApi.requestVisit({
        propertyId: listing.id,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        preferredDate: values.preferredDate,
        preferredTime: values.preferredTime,
        message: values.message || null,
      });
      setBooked(true);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    }
  };

  if (booked) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" strokeWidth={1.6} />
        <h3 className="mt-3 font-display text-lg font-semibold text-emerald-800">Demande de visite envoyée</h3>
        <p className="mt-2 text-sm text-pretty text-emerald-700">
          Votre visite est demandée pour le <strong>{formatDateLong(watchedDate, watchedTime)}</strong>. L'agence vous
          confirmera le rendez-vous par téléphone ou par email.
        </p>
        {!client && (
          <p className="mt-4 border-t border-emerald-200 pt-4 text-sm text-emerald-800">
            Créez un compte avec l'email fourni pour suivre et gérer vos visites depuis « Mon compte ».
          </p>
        )}
        <Link to="/mon-compte" className="mt-4 inline-block">
          <Button variant="secondary" size="sm">Aller à mon compte</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-2xl font-semibold text-slate-900 tabular-nums">
          {formatPrice(listing.rentPrice)}
          <span className="text-sm font-normal text-slate-500"> / mois</span>
        </p>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20 ring-inset">
          Disponible
        </span>
      </div>

      {submitError && <Alert variant="error">{submitError}</Alert>}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date souhaitée" required error={errors.preferredDate?.message}>
          <Input type="date" min={tomorrowIsoDate()} error={errors.preferredDate?.message} {...register('preferredDate')} />
        </Field>
        <Field label="Heure souhaitée" required error={errors.preferredTime?.message}>
          <select
            {...register('preferredTime')}
            className="block w-full rounded-[7px] border-0 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm ring-1 ring-slate-200 ring-inset transition-shadow duration-150 focus:ring-[3px] focus:ring-blue-100 focus:outline-none"
          >
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom" required error={errors.firstName?.message}>
          <Input error={errors.firstName?.message} {...register('firstName')} />
        </Field>
        <Field label="Nom" required error={errors.lastName?.message}>
          <Input error={errors.lastName?.message} {...register('lastName')} />
        </Field>
      </div>

      <Field label="Email" required error={errors.email?.message}>
        <Input type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      </Field>

      <Field label="Téléphone" required error={errors.phone?.message}>
        <Input type="tel" autoComplete="tel" placeholder="06 12 34 56 78" error={errors.phone?.message} {...register('phone')} />
      </Field>

      <Field label="Message (facultatif)" error={errors.message?.message}>
        <Textarea
          rows={3}
          placeholder="Précisez vos disponibilités, vos questions…"
          error={errors.message?.message}
          {...register('message')}
        />
      </Field>

      <Button type="submit" loading={isSubmitting} className="w-full">
        <CalendarDays className="h-4 w-4" strokeWidth={1.8} />
        Demander une visite
      </Button>

      <p className="text-center text-xs text-slate-500">
        {client ? (
          'La demande apparaîtra directement dans votre espace « Mes visites ».'
        ) : (
          <>
            Vous avez déjà un compte ?{' '}
            <Link to="/mon-compte" className="font-semibold text-blue-700 hover:underline">
              Connectez-vous
            </Link>{' '}
            pour la retrouver.
          </>
        )}
      </p>
    </form>
  );
}

// ─── Page de détail ──────────────────────────────────────────────────────────

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[8px] border border-slate-200 bg-white px-4 py-3">
      <span className="text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export function PublicPropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [selectedPhoto, setSelectedPhoto] = useState(0);

  const { data: listing, loading, error, reload } = useAsync((signal) => portalApi.listing(id!, signal), [id]);

  const mainPhoto = listing?.photos[selectedPhoto] ?? listing?.photos[0];

  const characteristics = useMemo(
    () =>
      listing
        ? [
            { icon: <Tag className="h-4.5 w-4.5" strokeWidth={1.8} />, label: 'Type de bien', value: propertyTypeLabels[listing.propertyType] },
            { icon: <Ruler className="h-4.5 w-4.5" strokeWidth={1.8} />, label: 'Surface', value: formatSurface(listing.surfaceArea) },
            ...(listing.bedrooms !== null
              ? [{ icon: <BedDouble className="h-4.5 w-4.5" strokeWidth={1.8} />, label: 'Chambres', value: String(listing.bedrooms) }]
              : []),
            ...(listing.bathrooms !== null
              ? [{ icon: <Bath className="h-4.5 w-4.5" strokeWidth={1.8} />, label: 'Salles de bain', value: String(listing.bathrooms) }]
              : []),
            { icon: <Building2 className="h-4.5 w-4.5" strokeWidth={1.8} />, label: 'Référence', value: listing.reference },
            { icon: <Clock className="h-4.5 w-4.5" strokeWidth={1.8} />, label: 'Statut', value: 'Disponible à la location' },
          ]
        : [],
    [listing],
  );

  if (loading && !listing) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" label="Chargement de l'annonce…" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold text-slate-900">Annonce indisponible</h1>
        <p className="mt-2 text-sm text-slate-600">
          {error ?? "Ce bien n'est pas ou plus disponible à la location."}
        </p>
        <Link to="/" className="mt-6 inline-block">
          <Button>
            <ArrowLeft className="h-4 w-4" />
            Retour aux logements
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
        Retour aux logements
      </Link>

      {/* En-tête */}
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-balance text-slate-900">{listing.title}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
            <MapPin className="h-4 w-4 text-slate-400" strokeWidth={1.8} />
            {[listing.address, listing.city, listing.district].filter(Boolean).join(' · ')}
          </p>
        </div>
        <p className="text-sm text-slate-500">
          Réf. <span className="font-semibold text-slate-700">{listing.reference}</span>
        </p>
      </div>

      {/* Galerie */}
      <div className="mt-6">
        <div className="aspect-[16/9] overflow-hidden rounded-xl bg-slate-100 sm:aspect-[16/8]">
          {mainPhoto ? (
            <img
              key={mainPhoto.id}
              src={mainPhoto.url}
              alt={`${listing.title} — photo ${selectedPhoto + 1}`}
              className="h-full w-full object-cover outline-1 outline-black/10"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">Sans photo</div>
          )}
        </div>
        {listing.photos.length > 1 && (
          <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
            {listing.photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setSelectedPhoto(index)}
                aria-label={`Afficher la photo ${index + 1}`}
                className={
                  'aspect-[4/3] overflow-hidden rounded-[8px] border-2 transition-colors duration-150 ' +
                  (index === selectedPhoto ? 'border-blue-600' : 'border-transparent hover:border-slate-300')
                }
              >
                <img src={photo.url} alt="" loading="lazy" className="h-full w-full object-cover outline-1 outline-black/10" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contenu : description + carte de visite */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900">Caractéristiques</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {characteristics.map((item) => (
              <DetailRow key={item.label} icon={item.icon} label={item.label} value={item.value} />
            ))}
          </div>

          {listing.description && (
            <>
              <h2 className="mt-8 font-display text-xl font-semibold text-slate-900">Description</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-pretty whitespace-pre-line text-slate-700">
                {listing.description}
              </p>
            </>
          )}

          <div className="mt-8 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5">
            <Phone className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" strokeWidth={1.8} />
            <p className="text-sm text-pretty text-slate-600">
              Une question sur ce logement ? Demandez une visite ci-contre : l'agence vous rappelle pour confirmer le
              rendez-vous et répondre à vos questions.
            </p>
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <BookingCard listing={listing} />
          </div>
        </div>
      </div>
    </div>
  );
}
