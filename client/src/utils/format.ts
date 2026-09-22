const priceFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Formate un prix en euros (« — » si absent). */
export function formatPrice(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : priceFormatter.format(value);
}

/** Formate une date ISO en date française lisible. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return dateTimeFormatter.format(new Date(value));
}

/** Formate une surface en m². */
export function formatSurface(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${new Intl.NumberFormat('fr-FR').format(value)} m²`;
}

/** Formate une taille de fichier (Ko / Mo). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function initials(person: { firstName: string; lastName: string }): string {
  return `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();
}
