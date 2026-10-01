import { useMemo, useState } from 'react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import {
  CalendarDays, CircleCheck, FileText, House, KeyRound, LogOut, Mail, MapPin, Phone, Search,
} from 'lucide-react';
import { portalApi, type PortalLease, type PortalVisit } from '../../api/portal.js';
import { useClientAuth } from '../../auth/ClientAuthContext.js';
import { getApiErrorMessage } from '../../api/client.js';
import { formatDate, formatPrice, formatSurface, fullName, initials } from '../../utils/format.js';
import {
  invoiceStatusBadgeClass, invoiceStatusLabels, leaseStatusBadgeClass,
  leaseStatusLabels, propertyTypeLabels, visitStatusBadgeClass, visitStatusLabels,
} from '../../utils/labels.js';
import { useAsync } from '../../hooks/useAsync.js';
import { cn } from '../../utils/cn.js';
import { Alert } from '../../components/ui/Alert.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Field, Input } from '../../components/ui/Field.js';
import { Spinner } from '../../components/ui/Spinner.js';

// ─── Panneau de connexion / inscription ──────────────────────────────────────

const loginSchema = z.object({
  email: z.email('Adresse email invalide.'),
  password: z.string().min(1, 'Le mot de passe est obligatoire.'),
});

const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'Le prénom est obligatoire.'),
  lastName: z.string().trim().min(1, 'Le nom est obligatoire.'),
  email: z.email('Adresse email invalide.'),
  phone: z.string().trim().min(6, 'Le numéro de téléphone est obligatoire.'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères.'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

function AuthPanel() {
  const { login, register: registerAccount } = useClientAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);

  const loginForm = useForm<LoginFormData>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '', password: '' },
  });

  const onLogin = async (values: LoginFormData) => {
    setError(null);
    try {
      await login(values.email, values.password);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const onRegister = async (values: RegisterFormData) => {
    setError(null);
    try {
      await registerAccount(values);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
          <KeyRound className="h-6 w-6" strokeWidth={1.8} />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold text-slate-900">Votre espace personnel</h1>
        <p className="mt-1 text-sm text-slate-600">
          Suivez vos visites et gérez votre logement loué.
        </p>
      </div>

      <Card className="p-6 sm:p-8">
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-[8px] bg-slate-100 p-1">
          {(['login', 'register'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setError(null);
              }}
              className={cn(
                'rounded-[6px] px-3 py-1.5 text-sm font-semibold transition-colors duration-150',
                mode === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
              )}
            >
              {value === 'login' ? 'Connexion' : 'Créer un compte'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4" noValidate>
            <Field label="Adresse email" required error={loginForm.formState.errors.email?.message}>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input type="email" autoComplete="email" className="pl-9" {...loginForm.register('email')} />
              </div>
            </Field>
            <Field label="Mot de passe" required error={loginForm.formState.errors.password?.message}>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input type="password" autoComplete="current-password" className="pl-9" {...loginForm.register('password')} />
              </div>
            </Field>
            <Button type="submit" loading={loginForm.formState.isSubmitting} className="w-full">
              Se connecter
            </Button>
            <p className="text-center text-xs text-slate-500">
              Pas encore de compte ? Créez-en un en un instant, ou demandez une visite depuis une annonce.
            </p>
          </form>
        ) : (
          <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom" required error={registerForm.formState.errors.firstName?.message}>
                <Input {...registerForm.register('firstName')} />
              </Field>
              <Field label="Nom" required error={registerForm.formState.errors.lastName?.message}>
                <Input {...registerForm.register('lastName')} />
              </Field>
            </div>
            <Field label="Adresse email" required error={registerForm.formState.errors.email?.message}>
              <Input type="email" autoComplete="email" {...registerForm.register('email')} />
            </Field>
            <Field label="Téléphone" required error={registerForm.formState.errors.phone?.message}>
              <Input type="tel" autoComplete="tel" placeholder="06 12 34 56 78" {...registerForm.register('phone')} />
            </Field>
            <Field
              label="Mot de passe"
              required
              hint="6 caractères minimum."
              error={registerForm.formState.errors.password?.message}
            >
              <Input type="password" autoComplete="new-password" {...registerForm.register('password')} />
            </Field>
            <Button type="submit" loading={registerForm.formState.isSubmitting} className="w-full">
              Créer mon compte
            </Button>
            <p className="text-center text-xs text-slate-500">
              Une fiche existe déjà à votre nom à l'agence ? Votre compte y sera rattaché automatiquement.
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}

// ─── Mes visites ─────────────────────────────────────────────────────────────

function VisitRow({
  visit,
  onCancel,
  cancelling,
}: {
  visit: PortalVisit;
  onCancel?: () => void;
  cancelling?: boolean;
}) {
  const upcoming = visit.status === 'SCHEDULED' || visit.status === 'RESCHEDULED';
  const date = new Date(visit.scheduledAt);
  const dayLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  const timeLabel = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);

  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50">
      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-[8px] bg-slate-100">
        {visit.property.photoUrl ? (
          <img src={visit.property.photoUrl} alt="" loading="lazy" className="h-full w-full object-cover outline-1 outline-black/10" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">
          <Link to={`/locations/${visit.property.id}`} className="hover:underline">
            {visit.property.title}
          </Link>
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.8} />
            {[visit.property.city, visit.property.district].filter(Boolean).join(' · ') || '—'}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span className="tabular-nums">
              {dayLabel} à {timeLabel}
            </span>
          </span>
        </p>
        <p className="mt-0.5 text-[13px] text-slate-500">
          {visit.agent ? `Agent en charge : ${fullName(visit.agent)}` : "En attente d'attribution d'agent par l'agence"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge className={visitStatusBadgeClass[visit.status]}>{visitStatusLabels[visit.status]}</Badge>
        {upcoming && onCancel && (
          <Button variant="danger" size="sm" onClick={onCancel} loading={cancelling}>
            Annuler
          </Button>
        )}
      </div>
    </li>
  );
}

function MyVisitsSection() {
  const { client } = useClientAuth();
  const { data: visits, loading, error, reload } = useAsync((signal) => portalApi.myVisits(signal), [client?.id]);
  const [visitToCancel, setVisitToCancel] = useState<PortalVisit | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const { upcoming, history } = useMemo(() => {
    const all = visits ?? [];
    const isUpcoming = (visit: PortalVisit) => visit.status === 'SCHEDULED' || visit.status === 'RESCHEDULED';
    return {
      upcoming: all.filter(isUpcoming).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
      history: all.filter((visit) => !isUpcoming(visit)),
    };
  }, [visits]);

  const confirmCancel = async () => {
    if (!visitToCancel) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await portalApi.cancelVisit(visitToCancel.id);
      setVisitToCancel(null);
      reload();
    } catch (err) {
      setCancelError(getApiErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Chargement de vos visites…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl">
        <Alert variant="error">{error}</Alert>
        <Button variant="secondary" className="mt-4" onClick={reload}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-slate-900">Visites à venir</h2>
        {upcoming.length === 0 ? (
          <Card>
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title="Aucune visite programmée"
              description="Parcourez les logements disponibles et demandez une visite depuis une annonce."
              action={
                <Link to="/">
                  <Button>
                    <Search className="h-4 w-4" strokeWidth={1.8} />
                    Voir les logements
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <Card className="divide-y divide-slate-100 overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {upcoming.map((visit) => (
                <VisitRow
                  key={visit.id}
                  visit={visit}
                  cancelling={cancelling && visitToCancel?.id === visit.id}
                  onCancel={() => {
                    setCancelError(null);
                    setVisitToCancel(visit);
                  }}
                />
              ))}
            </ul>
          </Card>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-slate-900">Historique</h2>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {history.map((visit) => (
                <VisitRow key={visit.id} visit={visit} />
              ))}
            </ul>
          </Card>
        </section>
      )}

      <ConfirmDialog
        open={visitToCancel !== null}
        title="Annuler cette visite ?"
        message={`Votre visite « ${visitToCancel?.property.title ?? ''} » sera annulée. L'agence en sera informée ; vous pourrez demander un nouveau créneau depuis une annonce.`}
        confirmLabel="Annuler la visite"
        danger
        loading={cancelling}
        onConfirm={confirmCancel}
        onCancel={() => setVisitToCancel(null)}
      />
      {cancelError && visitToCancel !== null && (
        <div className="mx-auto max-w-md">
          <Alert variant="error">{cancelError}</Alert>
        </div>
      )}
    </div>
  );
}

// ─── Mon logement loué ───────────────────────────────────────────────────────

function LeaseGallery({ photos, title }: { photos: { id: string; url: string }[]; title: string }) {
  const [selected, setSelected] = useState(0);
  const photo = photos[selected] ?? photos[0];
  if (!photo) {
    return <div className="aspect-[16/9] rounded-xl bg-slate-100" />;
  }
  return (
    <div>
      <div className="aspect-[16/9] overflow-hidden rounded-xl bg-slate-100">
        <img key={photo.id} src={photo.url} alt={title} className="h-full w-full object-cover outline-1 outline-black/10" />
      </div>
      {photos.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
          {photos.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={`Afficher la photo ${index + 1}`}
              className={
                'aspect-[4/3] overflow-hidden rounded-[8px] border-2 transition-colors duration-150 ' +
                (index === selected ? 'border-blue-600' : 'border-transparent hover:border-slate-300')
              }
            >
              <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover outline-1 outline-black/10" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LeaseInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800 tabular-nums">{value}</p>
    </div>
  );
}

function MyLeaseSection() {
  const { client } = useClientAuth();
  const { data: lease, loading, error, reload } = useAsync((signal) => portalApi.myLease(signal), [client?.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Chargement de votre logement…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl">
        <Alert variant="error">{error}</Alert>
        <Button variant="secondary" className="mt-4" onClick={reload}>Réessayer</Button>
      </div>
    );
  }

  if (!lease) {
    return (
      <Card>
        <EmptyState
          icon={<House className="h-6 w-6" />}
          title="Aucun logement loué pour le moment"
          description="Lorsque l'agence signe un bail avec vous, votre logement, votre échéancier de loyer et vos quittances apparaîtront ici."
          action={
            <Link to="/">
              <Button>Parcourir les logements</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const { property, invoices } = lease;
  const nextDue = [...invoices]
    .filter((invoice) => invoice.status !== 'PAID')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

  return (
    <div className="space-y-8">
      {/* Le logement */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-slate-900">Mon logement</h2>
          <Badge className={leaseStatusBadgeClass[lease.status]}>{leaseStatusLabels[lease.status]}</Badge>
        </div>
        <Card className="overflow-hidden">
          <div className="p-5">
            <LeaseGallery photos={property.photos} title={property.title} />
          </div>
          <div className="border-t border-slate-100 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-semibold text-slate-900">{property.title}</h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400" strokeWidth={1.8} />
                  {[property.address, property.city, property.district].filter(Boolean).join(' · ')}
                </p>
              </div>
              <p className="text-lg font-semibold text-slate-900 tabular-nums">
                {formatPrice(lease.monthlyRent)}
                <span className="text-xs font-normal text-slate-500"> / mois</span>
              </p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <LeaseInfo label="Type de bien" value={propertyTypeLabels[property.propertyType]} />
              <LeaseInfo label="Surface" value={formatSurface(property.surfaceArea)} />
              <LeaseInfo label="Chambres" value={property.bedrooms !== null ? String(property.bedrooms) : '—'} />
              <LeaseInfo label="Salles de bain" value={property.bathrooms !== null ? String(property.bathrooms) : '—'} />
            </div>
            {property.description && (
              <p className="mt-4 text-sm leading-relaxed text-pretty text-slate-600 whitespace-pre-line">{property.description}</p>
            )}
          </div>
        </Card>
      </section>

      {/* Le bail */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-slate-900">Mon bail</h2>
        <Card className="p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <LeaseInfo label="Référence du bail" value={lease.reference} />
            <LeaseInfo label="Période" value={`du ${formatDate(lease.startDate)} au ${formatDate(lease.endDate)}`} />
            <LeaseInfo label="Loyer mensuel" value={formatPrice(lease.monthlyRent)} />
            <LeaseInfo label="Dépôt de garantie" value={formatPrice(lease.depositAmount)} />
            <LeaseInfo label="Jour de paiement" value={`Le ${lease.paymentDay} de chaque mois`} />
            <LeaseInfo label="Signé le" value={formatDate(lease.signedAt)} />
            <div className="rounded-[8px] border border-slate-200 bg-white px-4 py-3 sm:col-span-2">
              <p className="text-xs text-slate-500">Bailleur</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">
                {fullName(lease.owner)}
                {lease.owner.phone && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[13px] font-normal text-slate-500">
                    <Phone className="h-3.5 w-3.5" strokeWidth={1.8} />
                    {lease.owner.phone}
                  </span>
                )}
                {lease.owner.email && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[13px] font-normal text-slate-500">
                    <Mail className="h-3.5 w-3.5" strokeWidth={1.8} />
                    {lease.owner.email}
                  </span>
                )}
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Échéances de loyer */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-slate-900">Mes échéances de loyer</h2>
          {nextDue && (
            <p className="flex items-center gap-1.5 text-sm text-slate-600">
              <CircleCheck className="h-4 w-4 text-slate-400" strokeWidth={1.8} />
              Prochain paiement :{' '}
              <strong className="tabular-nums">
                {formatDate(nextDue.dueDate)} — {formatPrice(nextDue.expectedAmount - nextDue.paidAmount)}
              </strong>{' '}
              restant
            </p>
          )}
        </div>
        <Card className="overflow-hidden">
          {invoices.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="Aucune échéance enregistrée"
              description="L'échéancier du loyer apparaîtra ici dès qu'il sera établi par l'agence."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    <th className="px-5 py-3">Échéance</th>
                    <th className="px-5 py-3">Montant dû</th>
                    <th className="px-5 py-3">Réglé</th>
                    <th className="px-5 py-3">Statut</th>
                    <th className="px-5 py-3">Quittance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-800 tabular-nums">{formatDate(invoice.dueDate)}</td>
                      <td className="px-5 py-3 text-slate-700 tabular-nums">{formatPrice(invoice.expectedAmount)}</td>
                      <td className="px-5 py-3 text-slate-700 tabular-nums">{formatPrice(invoice.paidAmount)}</td>
                      <td className="px-5 py-3">
                        <Badge className={invoiceStatusBadgeClass[invoice.status]}>{invoiceStatusLabels[invoice.status]}</Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-600 tabular-nums">
                        {invoice.receipt ? invoice.receipt.reference : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

// ─── Page espace personnel ───────────────────────────────────────────────────

type AccountTab = 'visits' | 'lease';

export function AccountPage() {
  const { client, loading, logout } = useClientAuth();
  const [tab, setTab] = useState<AccountTab>('visits');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" label="Chargement de votre espace…" />
      </div>
    );
  }

  if (!client) {
    return <AuthPanel />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* En-tête du compte */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-base font-semibold text-white">
            {initials(client)}
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-slate-900">Bonjour, {client.firstName}</h1>
            <p className="text-sm text-slate-600">{client.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="secondary" size="sm">
              <Search className="h-4 w-4" strokeWidth={1.8} />
              Voir les logements
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
            }}
          >
            <LogOut className="h-4 w-4" strokeWidth={1.8} />
            Déconnexion
          </Button>
        </div>
      </div>

      {/* Onglets */}
      <div className="mt-8 mb-6 flex gap-1 border-b border-slate-200">
        {([
          { value: 'visits', label: 'Mes visites', icon: CalendarDays },
          { value: 'lease', label: 'Mon logement', icon: House },
        ] as const).map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value)}
            aria-current={tab === item.value ? 'page' : undefined}
            className={cn(
              '-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-150',
              tab === item.value
                ? 'border-blue-600 text-slate-900'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800',
            )}
          >
            <item.icon className="h-4 w-4" strokeWidth={1.8} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'visits' ? <MyVisitsSection /> : <MyLeaseSection />}
    </div>
  );
}
