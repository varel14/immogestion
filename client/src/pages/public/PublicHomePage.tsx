import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bath, BedDouble, MapPin, Ruler, Search } from 'lucide-react';
import { portalApi, type PortalListing } from '../../api/portal.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { formatPrice, formatSurface } from '../../utils/format.js';
import { propertyTypeLabels } from '../../utils/labels.js';
import { PROPERTY_TYPES, type PropertyType } from '../../types/index.js';
import { PublicPagination } from '../../components/public/PublicPagination.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Alert } from '../../components/ui/Alert.js';
import { Button } from '../../components/ui/Button.js';

const PAGE_SIZE = 9;

/** Villes mises en avant sous la barre de recherche. */
const FEATURED_CITIES = ['Paris', 'Lyon', 'Bordeaux', 'Nantes'];

const BEDROOM_OPTIONS = [
  { value: '', label: 'Chambres — toutes' },
  { value: '1', label: '1+ chambre' },
  { value: '2', label: '2+ chambres' },
  { value: '3', label: '3+ chambres' },
  { value: '4', label: '4+ chambres' },
];

function ListingCard({ listing }: { listing: PortalListing }) {
  const photo = listing.photos.find((p) => p.isPrimary) ?? listing.photos[0];

  return (
    <Link
      to={`/locations/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors duration-200 hover:border-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {photo ? (
          <img
            src={photo.url}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover outline-1 outline-black/10 transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">Sans photo</div>
        )}
        <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
          Disponible
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-semibold text-slate-900 tabular-nums">
            {formatPrice(listing.rentPrice)}
            <span className="text-xs font-normal text-slate-500"> / mois</span>
          </p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-slate-600">
            {propertyTypeLabels[listing.propertyType]}
          </span>
        </div>
        <h3 className="line-clamp-1 font-display text-[17px] font-semibold text-slate-900">{listing.title}</h3>
        <p className="flex items-center gap-1 text-sm text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          <span className="truncate">
            {listing.city}
            {listing.city && listing.district ? ' · ' : ''}
            {listing.district}
          </span>
        </p>
        <p className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-[13px] text-slate-600 tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <Ruler className="h-4 w-4 text-slate-400" strokeWidth={1.8} />
            {formatSurface(listing.surfaceArea)}
          </span>
          {listing.bedrooms !== null && (
            <span className="inline-flex items-center gap-1.5">
              <BedDouble className="h-4 w-4 text-slate-400" strokeWidth={1.8} />
              {listing.bedrooms} {listing.bedrooms > 1 ? 'chambres' : 'chambre'}
            </span>
          )}
          {listing.bathrooms !== null && (
            <span className="inline-flex items-center gap-1.5">
              <Bath className="h-4 w-4 text-slate-400" strokeWidth={1.8} />
              {listing.bathrooms} {listing.bathrooms > 1 ? 'salles de bain' : 'salle de bain'}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}

function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-hidden="true">
      <div className="aspect-[4/3] animate-pulse bg-slate-100" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

export function PublicHomePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const type = searchParams.get('type') ?? '';
  const bedrooms = searchParams.get('chambres') ?? '';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  // Saisie locale débouncée, synchronisée avec le paramètre d'URL « q ».
  const [qInput, setQInput] = useState(q);
  const debouncedQ = useDebounce(qInput);

  useEffect(() => {
    setQInput(q);
  }, [q]);

  useEffect(() => {
    if (debouncedQ.trim() === q) return;
    setParam('q', debouncedQ.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  }

  const { data, loading, error, reload } = useAsync(
    (signal) =>
      portalApi.listings(
        {
          q: q || undefined,
          type: (type || undefined) as PropertyType | undefined,
          minBedrooms: bedrooms ? Number(bedrooms) : undefined,
          page,
          pageSize: PAGE_SIZE,
        },
        signal,
      ),
    [q, type, bedrooms, page],
  );

  const hasActiveFilters = Boolean(q || type || bedrooms);

  return (
    <>
      {/* Héro + recherche */}
      <section className="border-b border-slate-200 bg-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8 lg:py-16">
          <p className="text-xs font-semibold tracking-[0.18em] text-blue-700 uppercase">Locations disponibles</p>
          <h1 className="mx-auto mt-3 max-w-3xl font-display text-4xl font-semibold text-balance text-slate-900 sm:text-5xl">
            Trouvez votre prochain logement à louer
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-[15px] text-slate-600">
            Appartements, maisons et locaux proposés à la location par l'agence. Visitez en quelques clics, puis suivez
            vos demandes depuis votre compte.
          </p>

          <form
            className="mx-auto mt-8 grid max-w-3xl gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-[1fr_auto_auto_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              setParam('q', qInput.trim());
            }}
          >
            <label className="relative">
              <span className="sr-only">Rechercher un logement</span>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={qInput}
                onChange={(event) => setQInput(event.target.value)}
                placeholder="Ville, quartier, titre de l'annonce…"
                className="block w-full rounded-[8px] border-0 bg-white py-2.5 pr-3 pl-9.5 text-sm text-slate-800 ring-1 ring-slate-200 ring-inset placeholder:text-slate-400 transition-shadow duration-150 focus:ring-[3px] focus:ring-blue-100 focus:outline-none"
              />
            </label>
            <select
              value={type}
              onChange={(event) => setParam('type', event.target.value)}
              aria-label="Type de bien"
              className="rounded-[8px] border-0 bg-white py-2.5 pr-8 pl-3 text-sm text-slate-700 ring-1 ring-slate-200 ring-inset focus:ring-[3px] focus:ring-blue-100 focus:outline-none"
            >
              <option value="">Tous les types</option>
              {PROPERTY_TYPES.map((value) => (
                <option key={value} value={value}>
                  {propertyTypeLabels[value]}
                </option>
              ))}
            </select>
            <select
              value={bedrooms}
              onChange={(event) => setParam('chambres', event.target.value)}
              aria-label="Nombre de chambres minimum"
              className="rounded-[8px] border-0 bg-white py-2.5 pr-8 pl-3 text-sm text-slate-700 ring-1 ring-slate-200 ring-inset focus:ring-[3px] focus:ring-blue-100 focus:outline-none"
            >
              {BEDROOM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button type="submit" className="sm:px-5">
              Rechercher
            </Button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-slate-500">Recherches fréquentes :</span>
            {FEATURED_CITIES.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setParam('q', city)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 transition-colors duration-150 hover:border-slate-300 hover:bg-slate-100"
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Résultats */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-semibold text-slate-900">
            {loading && !data ? 'Chargement des logements…' : 'Logements à louer'}
          </h2>
          {data && (
            <p className="text-sm text-slate-500 tabular-nums">
              {data.pagination.total} logement{data.pagination.total > 1 ? 's' : ''} disponible
              {data.pagination.total > 1 ? 's' : ''}
              {hasActiveFilters ? ' pour votre recherche' : ''}
            </p>
          )}
        </div>

        {error && (
          <div className="max-w-xl">
            <Alert variant="error">{error}</Alert>
            <Button variant="secondary" className="mt-4" onClick={reload}>
              Réessayer
            </Button>
          </div>
        )}

        {!error && (loading && !data ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <ListingCardSkeleton key={index} />
            ))}
          </div>
        ) : data && data.data.length === 0 ? (
          <EmptyState
            title="Aucun logement ne correspond à votre recherche"
            description="Essayez d'élargir vos critères : autre ville, autre type de bien ou moins de chambres."
            action={
              hasActiveFilters && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQInput('');
                    setSearchParams(new URLSearchParams());
                  }}
                >
                  Réinitialiser la recherche
                </Button>
              )
            }
          />
        ) : data ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.data.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
            <PublicPagination meta={data.pagination} onPageChange={(next) => setParam('page', String(next))} />
          </>
        ) : null)}
      </section>
    </>
  );
}
